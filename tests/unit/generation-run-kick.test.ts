import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jobsReadyToStart,
  nextKickEntryAfterFailure,
  runKickDelayMs,
  RUN_KICK_BACKOFF_MS,
  RUN_KICK_MAX_MS,
  shouldStartQueuedJob,
  type RunKickEntry,
} from "../../src/lib/generation/run-kick.ts";

test("run kick delay doubles then caps", () => {
  assert.equal(runKickDelayMs(0), RUN_KICK_BACKOFF_MS);
  assert.equal(runKickDelayMs(1), RUN_KICK_BACKOFF_MS * 2);
  assert.equal(runKickDelayMs(2), RUN_KICK_BACKOFF_MS * 4);
  assert.ok(runKickDelayMs(20) <= RUN_KICK_MAX_MS);
  assert.equal(runKickDelayMs(20), RUN_KICK_MAX_MS);
});

test("first queued start is immediate; a failure backs off", () => {
  const now = 1_000;
  assert.equal(shouldStartQueuedJob("queued", undefined, false, now), true);
  assert.equal(shouldStartQueuedJob("running", undefined, false, now), false);
  assert.equal(shouldStartQueuedJob("queued", undefined, true, now), false);

  const afterFail = nextKickEntryAfterFailure(undefined, now);
  assert.equal(afterFail.attempts, 1);
  assert.equal(afterFail.nextStartAt, now + RUN_KICK_BACKOFF_MS);
  assert.equal(shouldStartQueuedJob("queued", afterFail, false, now), false);
  assert.equal(shouldStartQueuedJob("queued", afterFail, false, afterFail.nextStartAt), true);
});

test("jobsReadyToStart skips in-flight and backoff windows", () => {
  const now = 5_000;
  const kicks = new Map<string, RunKickEntry>([
    ["b", { attempts: 1, nextStartAt: now + 2_500 }],
  ]);
  const inFlight = new Set(["c"]);
  const ids = jobsReadyToStart(
    [
      { id: "a", status: "queued" },
      { id: "b", status: "queued" },
      { id: "c", status: "queued" },
      { id: "d", status: "running" },
    ],
    kicks,
    inFlight,
    now,
  );
  assert.deepEqual(ids, ["a"]);
});
