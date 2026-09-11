import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AVATAR_STYLES,
  DEFAULT_AVATAR_STYLE,
  isAvatarStyle,
  normalizeAvatarStyle,
  deriveDefaultAvatarSeed,
  avatarShuffleSeeds,
} from "../../src/lib/profile/avatar.ts";

test("curated style set is exactly Lorelei, Notionists, Thumbs, Open Peeps, Bottts; Lorelei is the default", () => {
  assert.deepEqual(AVATAR_STYLES, ["lorelei", "notionists", "thumbs", "open-peeps", "bottts"]);
  assert.equal(DEFAULT_AVATAR_STYLE, "lorelei");
  assert.equal(new Set(AVATAR_STYLES).size, AVATAR_STYLES.length, "styles must be distinct");
});

test("isAvatarStyle / normalizeAvatarStyle", () => {
  for (const s of AVATAR_STYLES) {
    assert.ok(isAvatarStyle(s));
    assert.equal(normalizeAvatarStyle(s), s);
  }
  assert.ok(!isAvatarStyle("micah"), "not one of the curated styles");
  assert.equal(
    normalizeAvatarStyle("micah"),
    DEFAULT_AVATAR_STYLE,
    "malformed falls back to default",
  );
  assert.equal(normalizeAvatarStyle(null), DEFAULT_AVATAR_STYLE);
  assert.equal(normalizeAvatarStyle(undefined), DEFAULT_AVATAR_STYLE);
});

test("deriveDefaultAvatarSeed is deterministic: same user id -> same seed, always", () => {
  const uid = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
  assert.equal(deriveDefaultAvatarSeed(uid), uid);
  assert.equal(deriveDefaultAvatarSeed(uid), deriveDefaultAvatarSeed(uid));
});

test("avatarShuffleSeeds is deterministic per seed+round and changes across rounds", () => {
  const seed = "user-123";
  const round0a = avatarShuffleSeeds(seed, 0, 8);
  const round0b = avatarShuffleSeeds(seed, 0, 8);
  assert.deepEqual(round0a, round0b, "same seed + round must reproduce the same set");
  assert.equal(round0a.length, 8);
  assert.equal(new Set(round0a).size, 8, "candidates within one round must be distinct");

  const round1 = avatarShuffleSeeds(seed, 1, 8);
  assert.notDeepEqual(round0a, round1, "a new round must change the candidate set");
});
