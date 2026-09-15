import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  classifyJobClaimResult,
  duplicateStartResponse,
  jobsNeedingStart,
} from "../../src/lib/generation/series-resume.ts";
import { applyStaleFailure } from "../../src/lib/generation/stale-job.ts";

test("queued children are started; running and succeeded are not", () => {
  const ids = jobsNeedingStart([
    { id: "a", status: "succeeded" },
    { id: "b", status: "queued" },
    { id: "c", status: "running" },
    { id: "d", status: "queued" },
  ]);

  assert.deepEqual(ids, ["b", "d"]);
});

// Regression: submit() only ever called startGenerationJob(firstJob) after
// createGenerationJobs, so a series reserved a credit and created a queued
// job for every child (see jobs.ts's create_generation_jobs RPC) but only
// the first one was ever actually run -- the rest sat "queued" forever
// with their credits already spent. jobsNeedingStart (above) exists
// specifically so every queued sibling gets its own /run request.
//
// VNext 1 Task 9 moved job creation out of submit() itself and into
// executePlan() (called either directly, for an auto-count plan, or from
// confirmSeriesCount() once the user picks a count for a plan that needed
// confirmation) -- but the "start every queued child, then poll the whole
// session" invariant this test protects is unchanged.
test("executePlan starts every queued job from createGenerationJobs, not just the first, then polls the session", () => {
  const g = readFileSync(
    resolve(import.meta.dirname, "../../src/lib/generation/use-generation.ts"),
    "utf8",
  );
  assert.match(g, /from "\.\/run-kick"/);

  const executePlanFn = g.slice(
    g.indexOf("async function executePlan"),
    g.indexOf("/**\n   * The user picked a count"),
  );
  assert.match(executePlanFn, /jobsReadyToStart\(/);
  assert.match(executePlanFn, /kickGenerationJob\(jobId, referenceAssetIds\)/);
  // Polling covers every child on the session, not just the first -- see
  // generate-job-resume.test.ts for pollSession's own coverage.
  assert.match(executePlanFn, /pollSession\(res\.sessionId, res\.jobs\)/);

  // submit() only ever creates jobs through executePlan (auto count) or
  // leaves that to confirmSeriesCount (confirmed count) -- it never starts
  // a job itself.
  const submitFn = g.slice(
    g.indexOf("async function submit"),
    g.indexOf("// Re-upload any references"),
  );
  assert.equal(/startGenerationJob/.test(submitFn), false);
  assert.match(submitFn, /await executePlan\(/);
});

test("queued and running jobs older than the stale limit fail", () => {
  const now = new Date("2026-09-14T12:10:00.000Z");
  const staleMs = 6 * 60 * 1000;

  assert.equal(
    applyStaleFailure({ status: "queued", created_at: "2026-09-14T12:03:59.999Z" }, now, staleMs),
    true,
  );
  assert.equal(
    applyStaleFailure({ status: "running", created_at: "2026-09-14T12:03:59.999Z" }, now, staleMs),
    true,
  );
  assert.equal(
    applyStaleFailure({ status: "queued", created_at: "2026-09-14T12:04:00.000Z" }, now, staleMs),
    false,
  );
  assert.equal(
    applyStaleFailure(
      { status: "succeeded", created_at: "2026-09-14T11:00:00.000Z" },
      now,
      staleMs,
    ),
    false,
  );
});

test("claimed false is a successful duplicate start response", async () => {
  const response = duplicateStartResponse("running");

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { claimed: false, status: "running" });
});

test("classifyJobClaimResult distinguishes error, duplicate, and claimed", () => {
  assert.equal(classifyJobClaimResult({ data: null, error: { message: "fail" } }), "error");
  assert.equal(classifyJobClaimResult({ data: null, error: null }), "duplicate");
  assert.equal(classifyJobClaimResult({ data: { id: "job-1" }, error: null }), "claimed");
});
