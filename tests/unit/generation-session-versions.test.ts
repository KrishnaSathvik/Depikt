import assert from "node:assert/strict";
import test from "node:test";
import { versionsForSucceededJobs } from "../../src/lib/generation/session-versions.ts";

test("includes only versions belonging to succeeded jobs", () => {
  const versions = [
    { id: "version-succeeded", job_id: "job-succeeded" },
    { id: "version-failed", job_id: "job-failed" },
    { id: "version-running", job_id: "job-running" },
  ];

  const result = versionsForSucceededJobs(versions, [
    { id: "job-succeeded", status: "succeeded" },
    { id: "job-failed", status: "failed" },
    { id: "job-running", status: "running" },
  ]);

  assert.deepEqual(result, [{ id: "version-succeeded", job_id: "job-succeeded" }]);
});
