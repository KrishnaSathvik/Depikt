// Per-user, per-device hydration cache for account presentation data --
// display name, username, avatar seed/style. Purely a paint-time
// optimization: it lets the header/menu render the user's own last-known
// avatar on the very first render after a refresh instead of a transient
// fallback, while the authoritative GET /api/account/profile round-trip is
// still in flight. Supabase's `profiles` row remains the source of truth;
// this cache is reconciled against (and overwritten by) every successful
// fetch, never the other way around.
//
// Keyed by the immutable auth user id so a cached value can never render
// under the wrong account -- see the userId re-check in read().

import type { ProfileResponse } from "./client";

const KEY_PREFIX = "depikt.profile.";

interface CachedProfile extends ProfileResponse {
  userId: string;
}

function key(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

/** Returns the cached profile for this exact user id, or null if absent/corrupt/mismatched. */
export function readCachedProfile(userId: string): ProfileResponse | null {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedProfile>;
    // Defense in depth: the storage key already scopes this to `userId`,
    // but never trust a cached row for a different account even if the key
    // lookup were ever wrong.
    if (parsed.userId !== userId) return null;
    if (
      typeof parsed.username !== "string" ||
      typeof parsed.avatarSeed !== "string" ||
      typeof parsed.avatarVariant !== "string"
    ) {
      return null;
    }
    return {
      username: parsed.username,
      displayName: parsed.displayName ?? null,
      avatarSeed: parsed.avatarSeed,
      avatarVariant: parsed.avatarVariant,
    };
  } catch {
    // Private browsing / disabled storage / corrupt JSON -- callers fall
    // back to the normal loading state.
    return null;
  }
}

/** Persists the authoritative profile for instant hydration on the next load. */
export function writeCachedProfile(userId: string, profile: ProfileResponse): void {
  try {
    const value: CachedProfile = { ...profile, userId };
    localStorage.setItem(key(userId), JSON.stringify(value));
  } catch {
    // Storage full/unavailable -- hydration cache is best-effort only.
  }
}
