import test from "node:test";
import assert from "node:assert/strict";
import {
  isRepairInProgress,
  regenerateVersionInput,
  selectedGenerationResult,
} from "../../src/lib/generation/result-state.ts";
import type { JobStatusResponse, SessionVersion } from "../../src/lib/generation/client.ts";

const versions: SessionVersion[] = [1, 2, 3, 4].map((n) => ({
  id: `v${n}`,
  job_id: `j${n}`,
  parent_version_id: null,
  storage_path: `image${n}.png`,
  width: 1200,
  height: 630,
  prompt: `Child ${n} brief`,
  model: "flare",
  created_at: "2026-09-18T00:00:00Z",
  url: `https://example.com/${n}.png`,
}));
const jobs: JobStatusResponse[] = versions.map((v) => ({
  jobId: v.job_id!,
  sessionId: "s",
  status: "succeeded",
  operation: "generate",
  model: v.model,
  width: v.width,
  height: v.height,
  errorMessage: null,
  result: { versionId: v.id, url: v.url, width: v.width, height: v.height },
}));

test("each selected series child supplies its own image, job and dimensions", () => {
  for (const version of versions) {
    const selected = selectedGenerationResult(jobs, versions, version.id);
    assert.equal(selected.url, version.url);
    assert.equal(selected.job?.jobId, version.job_id);
    assert.equal(selected.version?.width, 1200);
  }
  const historical = { ...versions[2], id: "older-v3", url: "https://example.com/older.png" };
  assert.equal(
    selectedGenerationResult(jobs, [...versions, historical], historical.id).url,
    historical.url,
  );
  assert.equal(
    selectedGenerationResult(jobs, [...versions, { ...historical, url: null }], historical.id).url,
    null,
  );
});

test("regenerating one child never carries the series count or other children", () => {
  const input = regenerateVersionInput(versions[2]);
  assert.equal(input.sourceVersionId, "v3");
  assert.equal(input.prompt, "Child 3 brief");
  assert.equal(input.structuredAspectRatio, "1200:630");
  assert.match(input.userInput, /one image/);
  assert.equal("intent" in input, false);
  assert.equal("idempotencyKey" in input, false);
});

test("Refining details requires a current running claim for this specific image", () => {
  const now = Date.parse("2026-09-18T12:00:00Z");
  const claim = { job_id: "j3", state: "running", started_at: new Date(now - 1000).toISOString() };
  assert.equal(isRepairInProgress("j1", claim, now), false);
  assert.equal(isRepairInProgress("j3", claim, now), true);
  assert.equal(isRepairInProgress("j3", null, now), false);
  assert.equal(isRepairInProgress("j3", { ...claim, state: "complete" }, now), false);
  assert.equal(
    isRepairInProgress(
      "j3",
      { ...claim, started_at: new Date(now - 7 * 60 * 1000).toISOString() },
      now,
    ),
    false,
  );
});
