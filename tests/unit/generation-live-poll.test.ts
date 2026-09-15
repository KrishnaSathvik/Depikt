import { test } from "node:test";
import assert from "node:assert/strict";
import { assembleLivePoll } from "../../src/lib/generation/live-poll.ts";

test("a succeeded job with a signed URL is a result, not a running spinner", () => {
  const snapshot = assembleLivePoll(
    [
      {
        id: "job-1",
        status: "succeeded",
        operation: "generate",
        model: "flare",
        width: 1024,
        height: 1024,
        safe_error_message: null,
        session_id: "session-1",
        series_index: null,
        series_label: null,
      },
    ],
    [
      {
        id: "ver-1",
        job_id: "job-1",
        parent_version_id: null,
        storage_path: "users/u/sessions/s/versions/ver-1.png",
        width: 1024,
        height: 1024,
        prompt: "a pear",
        model: "flare",
        created_at: "2026-09-15T01:00:00.000Z",
      },
    ],
    new Map([["ver-1", "https://example.test/pear.png"]]),
  );

  assert.equal(snapshot.jobs[0]?.status, "succeeded");
  assert.equal(snapshot.jobs[0]?.result?.url, "https://example.test/pear.png");
  assert.equal(snapshot.versions[0]?.url, "https://example.test/pear.png");
});

test("a succeeded job without a signed URL still reports succeeded so the UI can load the image", () => {
  const snapshot = assembleLivePoll(
    [
      {
        id: "job-1",
        status: "succeeded",
        operation: "generate",
        model: "flare",
        width: 1024,
        height: 1024,
        safe_error_message: null,
        session_id: "session-1",
        series_index: 0,
        series_label: "Pear",
      },
    ],
    [
      {
        id: "ver-1",
        job_id: "job-1",
        parent_version_id: null,
        storage_path: "users/u/sessions/s/versions/ver-1.png",
        width: 1024,
        height: 1024,
        prompt: "a pear",
        model: "flare",
        created_at: "2026-09-15T01:00:00.000Z",
      },
    ],
    new Map([["ver-1", null]]),
  );

  assert.equal(snapshot.jobs[0]?.status, "succeeded");
  assert.equal(snapshot.jobs[0]?.result?.url, null);
  assert.equal(snapshot.jobs[0]?.label, "Pear");
  assert.equal(snapshot.jobs[0]?.index, 0);
});
