import test from "node:test";
import assert from "node:assert/strict";
import {
  createPrivateCache,
  privateScope,
  setPrivateCacheOwner,
  isCurrentPrivateScope,
} from "../../src/lib/private-cache.ts";
import { readCreationsCache, writeCreationsCache } from "../../src/lib/profile/creations-cache.ts";

test("a failed B refresh cannot reuse A's cached creations", () => {
  setPrivateCacheOwner("A");
  const a = privateScope("A");
  writeCreationsCache(a, "all", { items: [], nextCursor: "A-private-cursor" });
  assert.equal(readCreationsCache(a, "all")?.nextCursor, "A-private-cursor");
  setPrivateCacheOwner(null);
  setPrivateCacheOwner("B");
  assert.equal(readCreationsCache(privateScope("B"), "all"), null);
  assert.equal(readCreationsCache(a, "all"), null);
});

test("delayed A response cannot populate B or a later A session", async () => {
  const cache = createPrivateCache<string>();
  setPrivateCacheOwner("A");
  const oldA = privateScope("A");
  let resolve!: (value: string) => void;
  const request = new Promise<string>((r) => {
    resolve = r;
  }).then((value) => cache.write(oldA, "private", value));
  setPrivateCacheOwner("B");
  const b = privateScope("B");
  cache.write(b, "private", "B");
  setPrivateCacheOwner("A");
  resolve("old A");
  await request;
  assert.equal(isCurrentPrivateScope(oldA), false);
  assert.equal(cache.read(privateScope("A"), "private"), null);
  assert.equal(cache.read(b, "private"), null);
});

test("same owner token refresh retains current data, logout clears every private cache", () => {
  const prompts = createPrivateCache<string>();
  setPrivateCacheOwner("A");
  const scope = privateScope("A");
  prompts.write(scope, "prompts", "private prompt");
  setPrivateCacheOwner("A");
  assert.equal(prompts.read(scope, "prompts"), "private prompt");
  setPrivateCacheOwner(null);
  setPrivateCacheOwner("A");
  assert.equal(prompts.read(privateScope("A"), "prompts"), null);
});
