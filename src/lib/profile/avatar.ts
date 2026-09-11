// Depikt's avatar system -- DiceBear, generated locally.
//
// Rendering (createAvatar + the style modules) lives in
// src/components/profile/DepiktAvatar.tsx; this module is the pure,
// testable logic around it -- the curated style set, the default, and the
// deterministic seed derivation. Local generation only: @dicebear/core's
// createAvatar() runs entirely client/server-side from the style packages
// already in node_modules, so there is no request to DiceBear's HTTP API,
// no third-party network call on every profile render, and no dependency
// on DiceBear's uptime.

export const AVATAR_STYLES = ["lorelei", "notionists", "thumbs"] as const;
export type AvatarStyle = (typeof AVATAR_STYLES)[number];

/** Lorelei is the default Depikt style; Notionists and Thumbs are the other curated choices. */
export const DEFAULT_AVATAR_STYLE: AvatarStyle = "lorelei";

export function isAvatarStyle(value: string): value is AvatarStyle {
  return (AVATAR_STYLES as readonly string[]).includes(value);
}

/** Malformed/missing stored style falls back to the default rather than throwing. */
export function normalizeAvatarStyle(value: string | null | undefined): AvatarStyle {
  return value && isAvatarStyle(value) ? value : DEFAULT_AVATAR_STYLE;
}

/**
 * Same user id -> same default avatar, every browser/device, forever
 * (until the user picks a different one). Never derived from username --
 * changing the username must not change the avatar.
 */
export function deriveDefaultAvatarSeed(userId: string): string {
  return userId;
}

/**
 * A deterministic candidate set of alternate seeds for the picker's
 * Shuffle action, within whichever style is currently selected. `round`
 * makes repeated shuffles produce different sets from the same seed while
 * staying reproducible (same seed + round always yields the same set).
 */
export function avatarShuffleSeeds(seed: string, round: number, count = 8): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(`${seed}:shuffle:${round}:${i}`);
  return out;
}
