// Account deletion helpers (server, service role). Storage objects do not
// cascade with auth.users, so the user's private prefix is walked and removed
// explicitly before the auth row goes.

import type { UntypedSupabaseClient } from "./db-types.ts";

/** Recursively removes every object under `prefix` in `bucket`. Returns the count removed. */
export async function removeUserStorage(
  db: UntypedSupabaseClient,
  bucket: string,
  prefix: string,
): Promise<number> {
  const files: string[] = [];
  const walk = async (dir: string) => {
    let offset = 0;
    for (;;) {
      const { data, error } = await db.storage
        .from(bucket)
        .list(dir, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw error;
      const entries = (data ?? []) as Array<{ name: string; id: string | null }>;
      for (const entry of entries) {
        const path = `${dir}/${entry.name}`;
        // Folders come back without an object id.
        if (entry.id) files.push(path);
        else await walk(path);
      }
      if (entries.length < 1000) break;
      offset += entries.length;
    }
  };
  await walk(prefix.replace(/\/$/, ""));
  for (let i = 0; i < files.length; i += 100) {
    const batch = files.slice(i, i + 100);
    const { error } = await db.storage.from(bucket).remove(batch);
    if (error) throw error;
  }
  return files.length;
}

/** One-way, unsalted-per-user hash so a deleted account can be recognised for refund questions. */
export async function hashEmail(email: string | null | undefined): Promise<string | null> {
  if (!email) return null;
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
