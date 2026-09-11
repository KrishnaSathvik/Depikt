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

import { hashToIndex } from "./hash.ts";

// Five deliberately distinct looks -- a line-art portrait, an illustrated
// workspace character, a playful simple face, a hand-drawn person, and a
// quirky robot -- so "shuffle" actually produces different-looking
// avatars, not eight variations on one theme. Still curated, not all 61
// styles: each was picked for being tasteful (no neon) and MIT/CC0/
// free-for-commercial-use licensed.
export const AVATAR_STYLES = ["lorelei", "notionists", "thumbs", "open-peeps", "bottts"] as const;
export type AvatarStyle = (typeof AVATAR_STYLES)[number];

/** Lorelei is the default Depikt style; the rest are the other curated choices. */
export const DEFAULT_AVATAR_STYLE: AvatarStyle = "lorelei";

/**
 * Depikt-palette background colors (white / near-black / muted blue /
 * subtle tones -- no neon), passed to every createAvatar() call so each
 * seed also gets a distinct background baked into the SVG itself. DiceBear
 * expects bare 6-digit hex, no "#". See DepiktAvatar.tsx.
 */
export const AVATAR_BACKGROUND_COLORS = ["FFFFFF", "111111", "EEF1FB", "2B3A67", "F2F2F2"] as const;

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

export interface AvatarCandidate {
  seed: string;
  style: AvatarStyle;
}

/**
 * Like avatarShuffleSeeds, but each candidate also gets a style -- hashed
 * off its own seed so it's deterministic and looks arbitrary, not cycled
 * in a visible 1-2-3-4-5 order. This backs the picker's "just show 8 random
 * avatars, no style buttons" grid: every shuffle mixes styles freely
 * instead of showing 8 variations within one selected style.
 */
export function avatarShuffleCandidates(seed: string, round: number, count = 8): AvatarCandidate[] {
  return avatarShuffleSeeds(seed, round, count).map((candidateSeed) => ({
    seed: candidateSeed,
    style: AVATAR_STYLES[hashToIndex(`${candidateSeed}:style`, AVATAR_STYLES.length)],
  }));
}
