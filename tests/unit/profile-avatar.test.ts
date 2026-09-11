import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AVATAR_SYMBOLS,
  AVATAR_BACKGROUNDS,
  AVATAR_SYMBOL_COUNT,
  AVATAR_BACKGROUND_COUNT,
  AVATAR_COMPOSITION_COUNT,
  buildAvatarVariant,
  parseAvatarVariant,
  deriveDefaultAvatarVariant,
  avatarShuffleCandidates,
} from "../../src/lib/profile/avatar.ts";

test("symbol and background counts are internally consistent", () => {
  assert.equal(AVATAR_SYMBOLS.length, AVATAR_SYMBOL_COUNT);
  assert.equal(AVATAR_BACKGROUNDS.length, AVATAR_BACKGROUND_COUNT);
  assert.ok(AVATAR_SYMBOL_COUNT >= 16 && AVATAR_SYMBOL_COUNT <= 24, "16-24 symbols per CLAUDE.md");
  assert.equal(new Set(AVATAR_SYMBOLS).size, AVATAR_SYMBOLS.length, "symbols must be distinct");
});

test("buildAvatarVariant / parseAvatarVariant round-trip", () => {
  const v = { symbolIndex: 7, bgIndex: 3, compositionIndex: 1 };
  const str = buildAvatarVariant(v);
  assert.equal(str, "s7-b3-c1");
  assert.deepEqual(parseAvatarVariant(str), v);
});

test("parseAvatarVariant falls back safely on malformed/missing input", () => {
  assert.deepEqual(parseAvatarVariant(null), { symbolIndex: 0, bgIndex: 0, compositionIndex: 0 });
  assert.deepEqual(parseAvatarVariant(undefined), {
    symbolIndex: 0,
    bgIndex: 0,
    compositionIndex: 0,
  });
  assert.deepEqual(parseAvatarVariant("not-a-variant"), {
    symbolIndex: 0,
    bgIndex: 0,
    compositionIndex: 0,
  });
});

test("parseAvatarVariant clamps out-of-range indices into bounds", () => {
  const parsed = parseAvatarVariant("s999-b999-c999");
  assert.ok(parsed.symbolIndex < AVATAR_SYMBOL_COUNT);
  assert.ok(parsed.bgIndex < AVATAR_BACKGROUND_COUNT);
  assert.ok(parsed.compositionIndex < AVATAR_COMPOSITION_COUNT);
});

test("deriveDefaultAvatarVariant is deterministic: same user id -> same avatar, always", () => {
  const uid = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
  const a = deriveDefaultAvatarVariant(uid);
  const b = deriveDefaultAvatarVariant(uid);
  assert.equal(a, b);
  assert.match(a, /^s\d+-b\d+-c\d+$/);
});

test("different user ids usually derive different default avatars (spot check)", () => {
  const variants = new Set<string>();
  for (let i = 0; i < 40; i++) {
    variants.add(deriveDefaultAvatarVariant(`user-${i}`));
  }
  assert.ok(variants.size > 20, `expected varied defaults, got ${variants.size}/40 distinct`);
});

test("avatarShuffleCandidates is deterministic per seed+round and changes across rounds", () => {
  const seed = "user-123";
  const round0a = avatarShuffleCandidates(seed, 0, 8);
  const round0b = avatarShuffleCandidates(seed, 0, 8);
  assert.deepEqual(round0a, round0b, "same seed + round must reproduce the same set");
  assert.equal(round0a.length, 8);

  const round1 = avatarShuffleCandidates(seed, 1, 8);
  assert.notDeepEqual(round0a, round1, "a new round must change the candidate set");
});
