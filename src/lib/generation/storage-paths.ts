// Native image generation — private storage path helpers.
//
// Every path is scoped under users/<user-id>/... so the storage.objects RLS
// policies in supabase/migrations/20260910140000_add_generation_storage.sql
// can enforce ownership purely from the path prefix (Supabase's
// storage.foldername() pattern). Never build a storage path from anything
// the browser supplies directly — always derive it server-side from the
// authenticated user id plus ids the server itself generated.

export const GENERATION_BUCKET = "generation-assets";

function assertSafeSegment(value: string, label: string): void {
  if (!value || /[\s/\\]/.test(value) || value.includes("..")) {
    throw new Error(`storage-paths: unsafe ${label}: ${JSON.stringify(value)}`);
  }
}

export function imageVersionStoragePath(
  userId: string,
  sessionId: string,
  versionId: string,
  extension: "png" | "jpg" | "webp" = "png",
): string {
  assertSafeSegment(userId, "userId");
  assertSafeSegment(sessionId, "sessionId");
  assertSafeSegment(versionId, "versionId");
  return `users/${userId}/sessions/${sessionId}/versions/${versionId}.${extension}`;
}

export function referenceAssetStoragePath(
  userId: string,
  assetId: string,
  extension: "png" | "jpg" | "webp" = "png",
): string {
  assertSafeSegment(userId, "userId");
  assertSafeSegment(assetId, "assetId");
  return `users/${userId}/references/${assetId}.${extension}`;
}

/** The user id a path was scoped to, for a defense-in-depth check before returning a signed URL. */
export function ownerOfStoragePath(path: string): string | null {
  const match = path.match(/^users\/([^/]+)\//);
  return match ? match[1] : null;
}
