// A replayed POST /api/generation/jobs (retry, double-submit, a second tab)
// must return the jobs that already exist for this idempotency key/prefix
// instead of jobs.ts inserting a second, orphaned generation_sessions row.
// See idempotent-jobs.ts and jobs.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decideExistingSession,
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
  assert.equal(toExistingJobsResult([], ["submit-1"]), null);
});

test("a unique-key session with zero jobs is reused", () => {
  assert.deepEqual(decideExistingSession([], ["submit-1"]), { kind: "reuse" });
});

test("a single matched row replays as one job under its real session", () => {
  const rows: ExistingJobRow[] = [
    {
      id: "job-1",
      session_id: "session-1",
      idempotency_key: "submit-1",
      status: "running",
      series_index: null,
      series_label: null,
    },
  ];
  assert.deepEqual(toExistingJobsResult(rows, ["submit-1"]), {
    sessionId: "session-1",
    jobs: [{ id: "job-1", label: null, index: null, status: "running" }],
  });
});

test("a series' matched rows replay sorted by series_index, all under the shared session", () => {
  const rows: ExistingJobRow[] = [
    {
      id: "job-c",
      session_id: "session-9",
      idempotency_key: "series-1:3",
      status: "queued",
      series_index: 2,
      series_label: "C",
    },
    {
      id: "job-a",
      session_id: "session-9",
      idempotency_key: "series-1:1",
      status: "succeeded",
      series_index: 0,
      series_label: "A",
    },
    {
      id: "job-b",
      session_id: "session-9",
      idempotency_key: "series-1:2",
      status: "queued",
      series_index: 1,
      series_label: "B",
    },
  ];
  assert.deepEqual(toExistingJobsResult(rows, ["series-1:1", "series-1:2", "series-1:3"]), {
    sessionId: "session-9",
    jobs: [
      { id: "job-a", label: "A", index: 0, status: "succeeded" },
      { id: "job-b", label: "B", index: 1, status: "queued" },
      { id: "job-c", label: "C", index: 2, status: "queued" },
    ],
  });
});

test("a partial series is not a replay", () => {
  const rows: ExistingJobRow[] = [
    {
      id: "job-a",
      session_id: "session-9",
      idempotency_key: "series-1:1",
      status: "queued",
      series_index: 0,
      series_label: "A",
    },
  ];
  assert.equal(toExistingJobsResult(rows, ["series-1:1", "series-1:2"]), null);
  assert.deepEqual(decideExistingSession(rows, ["series-1:1", "series-1:2"]), {
    kind: "invalid",
  });
});

test("the wrong key set is not a replay even when the row count matches", () => {
  const rows: ExistingJobRow[] = [
    {
      id: "job-a",
      session_id: "session-9",
      idempotency_key: "series-1:1",
      status: "queued",
      series_index: 0,
      series_label: "A",
    },
    {
      id: "job-c",
      session_id: "session-9",
      idempotency_key: "series-1:3",
      status: "queued",
      series_index: 2,
      series_label: "C",
    },
  ];
  assert.equal(toExistingJobsResult(rows, ["series-1:1", "series-1:2"]), null);
});

test("jobs split across sessions are not a replay", () => {
  const rows: ExistingJobRow[] = [
    {
      id: "job-a",
      session_id: "session-9",
      idempotency_key: "series-1:1",
      status: "queued",
      series_index: 0,
      series_label: "A",
    },
    {
      id: "job-b",
      session_id: "session-10",
      idempotency_key: "series-1:2",
      status: "queued",
      series_index: 1,
      series_label: "B",
    },
  ];
  assert.equal(toExistingJobsResult(rows, ["series-1:1", "series-1:2"]), null);
});
