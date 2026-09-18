import { test } from "node:test";
import assert from "node:assert/strict";
import { createEntityRateLimiter } from "../../src/lib/generation/entity-rate-limit.ts";
test("pack workflow budget is per authenticated owner and expires after one minute", () => {
  const limited = createEntityRateLimiter();
  for (let i = 0; i < 60; i++) assert.equal(limited("owner-a", 1000), false);
  assert.equal(limited("owner-a", 1001), true);
  assert.equal(limited("owner-b", 1001), false);
  assert.equal(limited("owner-a", 61000), false);
});
