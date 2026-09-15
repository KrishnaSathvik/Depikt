import { test } from "node:test";
import assert from "node:assert/strict";
import { raceWithTimeout } from "../../src/lib/generation/timeout.ts";

test("raceWithTimeout returns the value when work finishes inside the budget", async () => {
  const value = await raceWithTimeout(Promise.resolve("ok"), 50, "fallback");
  assert.equal(value, "ok");
});

test("raceWithTimeout returns the fallback instead of waiting on a hung promise", async () => {
  const hung = new Promise<string>(() => {});
  const started = Date.now();
  const value = await raceWithTimeout(hung, 40, "fallback");
  assert.equal(value, "fallback");
  assert.ok(Date.now() - started < 500, "must not wait on the hung work");
});
