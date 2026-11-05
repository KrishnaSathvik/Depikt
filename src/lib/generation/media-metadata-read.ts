import type { UntypedSupabaseClient } from "./db-types.ts";
/** Only query the new column for native media, preserving pre-migration raster reads. */
export async function readNativeMediaMetadata(
  db: UntypedSupabaseClient,
  versions: Array<{ id: string; mime_type?: string; [key: string]: unknown }>,
) {
  const native = versions.filter(
    (v) => v.mime_type === "image/gif" || v.mime_type === "image/svg+xml",
  );
  if (!native.length) return versions;
  const { data, error } = await db
    .from("image_versions")
    .select("id, media_metadata")
    .in(
      "id",
      native.map((v) => v.id),
    );
  if (error) return versions;
  const metadata = new Map(
    (data ?? []).map((v: { id: string; media_metadata: unknown }) => [v.id, v.media_metadata]),
  );
  return versions.map((v) =>
    metadata.has(v.id) ? { ...v, media_metadata: metadata.get(v.id) } : v,
  );
}
