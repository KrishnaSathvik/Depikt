import type { UntypedSupabaseClient } from "./db-types.ts";
/** Only query the new column for native media, preserving pre-migration raster reads. */
export async function readNativeMediaMetadata<T extends { id: string; mime_type?: string }>(
  db: UntypedSupabaseClient,
  versions: T[],
): Promise<Array<T & { media_metadata?: unknown }>> {
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
