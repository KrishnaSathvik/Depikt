import { corsHeaders, jsonError } from "../api/public-route";
import { entityRateLimitExceeded } from "./entity-rate-limit";
import { isNativeGenerationEnabled } from "./feature-flag";
import { authenticateGenerationRequest } from "./auth";
import { asGenerationClient } from "./db-types";
import { validateEntityBody, validateEntityAssetBody } from "./entity-request";
import { UUID_RE, MAX_ASSETS_PER_ENTITY, type ReferenceEntity } from "./entities";
import { GENERATION_BUCKET, entityAssetStoragePath } from "./storage-paths";
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
export async function handleEntityRequest(
  request: Request,
  id?: string,
  assetId?: string,
  assetRoute = false,
): Promise<Response> {
  if (!isNativeGenerationEnabled()) return jsonError("Not found", 404);
  const auth = await authenticateGenerationRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  if (entityRateLimitExceeded(auth.auth.userId))
    return jsonError("Too many requests. Please try again.", 429);
  const { userId } = auth.auth,
    db = asGenerationClient(auth.auth.supabase),
    storage = db.storage.from(GENERATION_BUCKET);
  if ((id && !UUID_RE.test(id)) || (assetId && !UUID_RE.test(assetId)))
    return jsonError("Invalid reference pack", 400);
  let entity: ReferenceEntity | undefined;
  if (id) {
    const { data, error } = await db
      .from("reference_entities")
      .select("*, assets:reference_entity_assets(*)")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return jsonError("Could not load reference pack", 500);
    if (!data) return jsonError("Invalid reference pack", 400);
    entity = data as ReferenceEntity;
  }
  if (request.method === "GET") {
    const { data, error } = await db
      .from("reference_entities")
      .select("*, assets:reference_entity_assets(*)")
      .eq("user_id", userId)
      .order("created_at");
    if (error) return jsonError("Could not load reference packs", 500);
    const entities = await Promise.all(
      ((data ?? []) as ReferenceEntity[]).map(async (e) => ({
        ...e,
        assets: await Promise.all(
          e.assets
            .filter(
              (a) =>
                a.user_id === userId &&
                a.storage_path.startsWith(`users/${userId}/entities/${e.id}/`),
            )
            .map(async (a) => {
              const { data: signed } = await storage.createSignedUrl(a.storage_path, 600);
              return { ...a, previewUrl: signed?.signedUrl ?? null };
            }),
        ),
      })),
    );
    return response({ entities });
  }
  if (request.method === "DELETE" && entity) {
    const assets = assetId ? entity.assets.filter((a) => a.id === assetId) : entity.assets;
    if (assetId && !assets.length) return jsonError("Invalid reference asset", 400);
    if (assetId && ["primary", "logo"].includes(assets[0].role) && entity.assets.length > 1)
      return jsonError("Remove the other views before removing the primary reference", 400);
    const paths = assets.map((a) => a.storage_path);
    if (paths.some((p) => !p.startsWith(`users/${userId}/entities/${id}/`) || p.includes("..")))
      return jsonError("Invalid reference asset", 400);
    if (paths.length) {
      const { error } = await storage.remove(paths);
      if (error) return jsonError("Could not remove reference files", 500);
    }
    const { error } = assetId
      ? await db
          .from("reference_entity_assets")
          .delete()
          .eq("id", assetId)
          .eq("entity_id", id!)
          .eq("user_id", userId)
      : await db.from("reference_entities").delete().eq("id", id!).eq("user_id", userId);
    if (error) return jsonError("Could not remove reference pack", 500);
    return response({ ok: true });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  if (assetRoute && entity && request.method === "POST") {
    let checked: ReturnType<typeof validateEntityAssetBody>;
    try {
      checked = validateEntityAssetBody(body, entity.type);
    } catch {
      return jsonError("Invalid image data", 400);
    }
    if (!checked.ok) return jsonError(checked.error, 400);
    if (entity.assets.length >= MAX_ASSETS_PER_ENTITY)
      return jsonError("At most 8 images per reference pack", 400);
    const role = checked.role;
    const primary = entity.type === "brand" ? "logo" : "primary";
    if (!entity.assets.length && role !== primary)
      return jsonError(`Upload a ${primary} reference first`, 400);
    if (role === primary && entity.assets.some((a) => a.role === primary))
      return jsonError("A primary reference already exists", 400);
    const asset = crypto.randomUUID();
    const { bytes, mimeType, extension } = checked.upload;
    const path = entityAssetStoragePath(userId, id!, asset, extension);
    const { error: uploadError } = await storage.upload(path, bytes, {
      contentType: mimeType,
      upsert: false,
    });
    if (uploadError) return jsonError("Could not store reference image", 500);
    const { error } = await db.from("reference_entity_assets").insert({
      id: asset,
      entity_id: id,
      user_id: userId,
      storage_path: path,
      role,
      mime_type: mimeType,
      sort_order: Math.max(-1, ...entity.assets.map((a) => a.sort_order)) + 1,
    });
    if (error) {
      await storage.remove([path]);
      return jsonError("Could not add reference image", 400);
    }
    return response({ id: asset }, 201);
  }
  const checked = validateEntityBody(body, request.method === "PATCH");
  if (!checked.ok) return jsonError(checked.error, 400);
  const result =
    request.method === "PATCH" && id
      ? await db
          .from("reference_entities")
          .update({ ...checked.value, updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("user_id", userId)
          .select("id")
          .single()
      : await db
          .from("reference_entities")
          .insert({ ...checked.value, user_id: userId })
          .select("id")
          .single();
  if (result.error)
    return jsonError("Could not save reference pack. Check its name and your pack limit.", 400);
  return response(result.data, request.method === "POST" ? 201 : 200);
}
