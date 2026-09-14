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
test("submit() starts every queued job from createGenerationJobs, not just the first", () => {
  const g = readFileSync(
    resolve(import.meta.dirname, "../../src/lib/generation/use-generation.ts"),
    "utf8",
  );
  assert.match(g, /import \{ jobsNeedingStart \} from "\.\/series-resume"/);

  const submitFn = g.slice(
    g.indexOf("async function submit"),
    g.indexOf("// Re-upload any references"),
  );
  assert.match(submitFn, /for \(const jobId of jobsNeedingStart\(res\.jobs\)\) \{/);
  assert.match(submitFn, /void startGenerationJob\(jobId, referenceAssetIds\)\.catch/);
  // Polling still only follows the first job -- the full multi-job
  // progress UI is a follow-up (Task 9), not this fix.
  assert.match(submitFn, /pollJob\(firstJob\.id\);/);
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
