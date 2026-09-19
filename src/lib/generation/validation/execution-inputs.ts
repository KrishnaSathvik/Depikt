import type { UntypedSupabaseClient } from "../db-types.ts";
import type { GenerationJobRecord } from "../job-pipeline.ts";
import { verifyExecutionAuthorization } from "../execution-auth.ts";
import { extractStoredEntities, extractStoredEntityReferencePaths } from "../stored-entities.ts";
import { extractStoredReferenceAssetIds, extractStoredMaskPath } from "../execution-plan.ts";
import { assembleJobImages, type StoredImage } from "../job-images.ts";
import { GENERATION_BUCKET } from "../storage-paths.ts";
import { verifyGroundingSnapshot } from "../grounding/service.ts";
import { createGroundingProvider } from "../grounding/provider.ts";
import type { ReferenceBinding } from "./engine.ts";

export async function loadRepairInputs(
  db: UntypedSupabaseClient,
  job: GenerationJobRecord,
  sourceVersionId: string | null,
  planJson: unknown,
  secret: string,
  env?: Record<string, string | undefined>,
  fetchImpl?: typeof fetch,
) {
  verifyExecutionAuthorization(planJson, { ...job, sourceVersionId }, secret, true);
  const download = async (path: string): Promise<StoredImage | null> => {
    const { data } = await db.storage.from(GENERATION_BUCKET).download(path);
    return data
      ? {
          bytes: new Uint8Array(await data.arrayBuffer()),
          mimeType: data.type || "image/png",
          filename: path.split("/").pop()!,
        }
      : null;
  };
  let sourcePath: string | null = null;
  if (sourceVersionId) {
    const { data, error } = await db
      .from("image_versions")
      .select("storage_path")
      .eq("id", sourceVersionId)
      .eq("user_id", job.userId)
      .maybeSingle();
    if (error || !data) throw new Error("Source unavailable");
    sourcePath = data.storage_path;
  }
  const referencePaths = extractStoredReferenceAssetIds(planJson);
  const entities = extractStoredEntities(planJson, job.userId);
  const input = await assembleJobImages({
    download,
    sourcePath,
    referencePaths,
    maskPath: extractStoredMaskPath(planJson),
    entityReferencePaths: extractStoredEntityReferencePaths(planJson, job.userId),
  });
  let index = (sourcePath ? 1 : 0) + referencePaths.length;
  const referenceBindings: ReferenceBinding[] = entities.map((e) => ({
    entityId: e.id,
    name: e.name,
    type: e.type,
    imageIndices: e.resolvedReferences.map(() => index++),
  }));
  const stored = planJson as { grounding?: unknown };
  if (stored.grounding)
    input.referenceImages.push(
      ...(await createGroundingProvider(env, fetchImpl).loadImages(
        verifyGroundingSnapshot(stored.grounding, job.userId, secret).bundle,
      )),
    );
  return {
    ...input,
    source: sourcePath ? input.referenceImages[0] : undefined,
    entityIds: entities.map((e) => e.id),
    referenceBindings,
    download,
  };
}
