// Depikt-owned deterministic SVG avatar system.
//
// No image-generation credit, no remote avatar API (DiceBear etc.), no OS
// emoji, no Storage upload -- a small local visual system: a symbol drawn
// from AVATAR_SYMBOLS, a two-tone background from AVATAR_BACKGROUNDS, and a
// composition (rotation/scale/accent) variant. Rendering lives in
// src/components/profile/DepiktAvatar.tsx; this module is the pure,
// testable logic -- deriving the default variant from a user id, parsing/
// building the compact `avatar_variant` string that's the only thing
// persisted (see supabase/migrations/20260912100000_add_profiles.sql:
// "store the seed/variant, never rendered SVG").

import { hashToIndex } from "./hash.ts";

export const AVATAR_SYMBOLS = [
  "circle",
  "ring",
  "diamond",
  "diamond-outline",
  "square",
  "square-outline",
  "triangle",
  "triangle-outline",
  "hexagon",
  "hexagon-outline",
  "plus",
  "asterisk",
  "chevron-up",
  "chevron-down",
  "arc",
  "half-circle",
  "dot-grid",
  "bars",
  "cross",
  "teardrop",
  "lens",
  "star4",
  "star6",
  "staircase",
] as const;

export type AvatarSymbol = (typeof AVATAR_SYMBOLS)[number];

/** White / near-black / muted blue / subtle supporting tones -- no neon. */
export const AVATAR_BACKGROUNDS: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: "#FFFFFF", fg: "#111111" },
  { bg: "#111111", fg: "#FFFFFF" },
  { bg: "#EEF1FB", fg: "#2B3A67" },
  { bg: "#2B3A67", fg: "#FFFFFF" },
  { bg: "#EDEDED", fg: "#111111" },
  { bg: "#111111", fg: "#7C93FF" },
  { bg: "#FFFFFF", fg: "#2B3A67" },
  { bg: "#F7F7F7", fg: "#111111" },
  { bg: "#DCE3F5", fg: "#111111" },
  { bg: "#111111", fg: "#EEF1FB" },
];

export const AVATAR_SYMBOL_COUNT = AVATAR_SYMBOLS.length;
export const AVATAR_BACKGROUND_COUNT = AVATAR_BACKGROUNDS.length;
export const AVATAR_COMPOSITION_COUNT = 3;

export interface AvatarVariant {
  symbolIndex: number;
  bgIndex: number;
  compositionIndex: number;
}

export function buildAvatarVariant(v: AvatarVariant): string {
  return `s${v.symbolIndex}-b${v.bgIndex}-c${v.compositionIndex}`;
}

const VARIANT_RE = /^s(\d+)-b(\d+)-c(\d+)$/;

/** Malformed/missing input falls back to the first symbol/background/composition rather than throwing. */
export function parseAvatarVariant(variant: string | null | undefined): AvatarVariant {
  const match = variant ? VARIANT_RE.exec(variant) : null;
  if (!match) return { symbolIndex: 0, bgIndex: 0, compositionIndex: 0 };
  return {
    symbolIndex: Number(match[1]) % AVATAR_SYMBOL_COUNT,
    bgIndex: Number(match[2]) % AVATAR_BACKGROUND_COUNT,
    compositionIndex: Number(match[3]) % AVATAR_COMPOSITION_COUNT,
  };
}

/**
 * Same user id -> same default avatar, every browser/device, forever
 * (until the user picks a different one). Never derived from username --
 * changing the username must not change the avatar.
 */
export function deriveDefaultAvatarVariant(userId: string): string {
  return buildAvatarVariant({
    symbolIndex: hashToIndex(`${userId}:avatar:symbol`, AVATAR_SYMBOL_COUNT),
    bgIndex: hashToIndex(`${userId}:avatar:bg`, AVATAR_BACKGROUND_COUNT),
    compositionIndex: hashToIndex(`${userId}:avatar:composition`, AVATAR_COMPOSITION_COUNT),
  });
}

/**
 * A deterministic candidate set for the picker's Shuffle action. `round`
 * makes repeated shuffles produce different sets from the same seed while
 * staying reproducible (same seed + round always yields the same set).
 */
export function avatarShuffleCandidates(seed: string, round: number, count = 8): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const salt = `${seed}:shuffle:${round}:${i}`;
    out.push(
      buildAvatarVariant({
        symbolIndex: hashToIndex(`${salt}:symbol`, AVATAR_SYMBOL_COUNT),
        bgIndex: hashToIndex(`${salt}:bg`, AVATAR_BACKGROUND_COUNT),
        compositionIndex: hashToIndex(`${salt}:composition`, AVATAR_COMPOSITION_COUNT),
      }),
    );
  }
  return out;
}
