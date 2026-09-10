import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GENERATION_BUCKET,
  imageVersionStoragePath,
  referenceAssetStoragePath,
  ownerOfStoragePath,
} from "../../src/lib/generation/storage-paths.ts";

test("bucket name is private-sounding and stable", () => {
  assert.equal(GENERATION_BUCKET, "generation-assets");
});

test("image version path is scoped under the owning user", () => {
  const p = imageVersionStoragePath("user-1", "session-1", "version-1", "png");
  assert.equal(p, "users/user-1/sessions/session-1/versions/version-1.png");
});

test("reference asset path is scoped under the owning user", () => {
  const p = referenceAssetStoragePath("user-1", "asset-1", "webp");
  assert.equal(p, "users/user-1/references/asset-1.webp");
});

test("ownerOfStoragePath extracts the user id prefix", () => {
  assert.equal(ownerOfStoragePath("users/user-1/sessions/s/versions/v.png"), "user-1");
  assert.equal(ownerOfStoragePath("users/attacker/references/x.png"), "attacker");
});

test("ownerOfStoragePath returns null for a path with no user prefix", () => {
  assert.equal(ownerOfStoragePath("not-a-scoped-path.png"), null);
});

test("rejects a path-traversal attempt in any segment", () => {
  assert.throws(() => imageVersionStoragePath("../etc", "s", "v"));
  assert.throws(() => imageVersionStoragePath("u", "../../s", "v"));
  assert.throws(() => imageVersionStoragePath("u", "s", "../v"));
  assert.throws(() => referenceAssetStoragePath("u", "../a"));
});

test("rejects a segment containing a path separator", () => {
  assert.throws(() => imageVersionStoragePath("u/x", "s", "v"));
  assert.throws(() => imageVersionStoragePath("u", "s", "v\\x"));
});

test("rejects an empty segment", () => {
  assert.throws(() => imageVersionStoragePath("", "s", "v"));
  assert.throws(() => referenceAssetStoragePath("u", ""));
});
