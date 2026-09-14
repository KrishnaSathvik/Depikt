import assert from "node:assert/strict";
import test from "node:test";
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
