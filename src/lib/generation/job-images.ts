import { EntityReferenceUnavailableError } from "./stored-entities.ts";
import { MAX_JOB_INPUT_IMAGES_WITH_ENTITIES } from "./entities.ts";
import type { StoredImage } from "./openai-images.ts";

export type { StoredImage };

export async function assembleJobImages(args: {
  download: (path: string) => Promise<StoredImage | null>;
  sourcePath: string | null;
  referencePaths: string[];
  maskPath: string | null;
  entityReferencePaths?: string[];
}): Promise<{ referenceImages: StoredImage[]; editMask: StoredImage | null }> {
  const locked = Boolean(args.entityReferencePaths?.length);
  if (
    locked &&
    args.referencePaths.length + args.entityReferencePaths!.length + (args.sourcePath ? 1 : 0) >
      MAX_JOB_INPUT_IMAGES_WITH_ENTITIES
  )
    throw new EntityReferenceUnavailableError();
  const download = async (path: string) => {
    try {
      const image = await args.download(path);
      if (!image && locked) throw new EntityReferenceUnavailableError();
      return image;
    } catch (error) {
      if (locked) throw new EntityReferenceUnavailableError();
      throw error;
    }
  };
  const referenceImages: StoredImage[] = [];
  if (args.sourcePath) {
    const source = await download(args.sourcePath);
    if (source) referenceImages.push(source);
  }
  for (const path of [...args.referencePaths, ...(args.entityReferencePaths ?? [])]) {
    const ref = await download(path);
    if (ref) referenceImages.push(ref);
  }
  let editMask: StoredImage | null = null;
  if (args.maskPath) {
    editMask = await args.download(args.maskPath);
    if (!editMask) {
      throw new Error("Could not load the edit mask.");
    }
  }
  return { referenceImages, editMask };
}

/** Failure recording and refund are independent, so either can be retried safely. */
export async function failImageInputJob(args: {
  error: unknown;
  jobId: string;
  userId: string;
  idempotencyKey: string;
  data: Pick<import("./job-pipeline.ts").GenerationDataAccess, "markJobFailed" | "finalizeCredits">;
}) {
  const entityFailure = args.error instanceof EntityReferenceUnavailableError;
  const errorCode = entityFailure ? "entity_reference_unavailable" : "mask_unavailable";
  const safeErrorMessage = entityFailure
    ? "Could not load the locked reference pack."
    : "Could not load the selected region.";
  await args.data.markJobFailed(args.jobId, { errorCode, safeErrorMessage }).catch(() => {});
  await args.data
    .finalizeCredits(args.userId, 1, args.idempotencyKey, "refunded", args.jobId)
    .catch(() => {});
  return { errorCode, safeErrorMessage };
}
