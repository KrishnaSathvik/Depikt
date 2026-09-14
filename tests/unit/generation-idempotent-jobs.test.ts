// A replayed POST /api/generation/jobs (retry, double-submit, a second tab)
// must return the jobs that already exist for this idempotency key/prefix
// instead of jobs.ts inserting a second, orphaned generation_sessions row.
// See idempotent-jobs.ts and jobs.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generationJobIdempotencyKeys,
  toExistingJobsResult,
  type ExistingJobRow,
} from "../../src/lib/generation/idempotent-jobs.ts";

test("single replay uses the exact idempotency key", () => {
  assert.deepEqual(generationJobIdempotencyKeys("submit_%_literal", false, 1), [
    "submit_%_literal",
  ]);
});

test("series replay builds exact child keys without LIKE wildcard semantics", () => {
  assert.deepEqual(generationJobIdempotencyKeys("series_%_literal", true, 3), [
    "series_%_literal:1",
    "series_%_literal:2",
    "series_%_literal:3",
  ]);
});

test("no matching rows means no replay -- the caller proceeds to create a new session", () => {
  assert.equal(toExistingJobsResult([]), null);
});

test("a single matched row replays as one job under its real session", () => {
  const rows: ExistingJobRow[] = [
    {
      id: "job-1",
      session_id: "session-1",
      status: "running",
      series_index: null,
      series_label: null,
    },
  ];
  assert.deepEqual(toExistingJobsResult(rows), {
    sessionId: "session-1",
    jobs: [{ id: "job-1", label: null, index: null, status: "running" }],
  });
});

test("a series' matched rows replay sorted by series_index, all under the shared session", () => {
  const rows: ExistingJobRow[] = [
    { id: "job-c", session_id: "session-9", status: "queued", series_index: 2, series_label: "C" },
    {
      id: "job-a",
      session_id: "session-9",
      status: "succeeded",
      series_index: 0,
      series_label: "A",
    },
    { id: "job-b", session_id: "session-9", status: "queued", series_index: 1, series_label: "B" },
  ];
  assert.deepEqual(toExistingJobsResult(rows), {
    sessionId: "session-9",
    jobs: [
      { id: "job-a", label: "A", index: 0, status: "succeeded" },
      { id: "job-b", label: "B", index: 1, status: "queued" },
      { id: "job-c", label: "C", index: 2, status: "queued" },
    ],
  });
});
