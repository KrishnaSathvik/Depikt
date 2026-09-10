// Regression coverage for a live-QA bug: refreshing the page during a
// still-running generation job lost all track of it (no polling resume, no
// way to ever see the result). Confirmed live (a real Sunburst job kept
// running server-side and completed successfully while the page had no
// way to know). Fixed by persisting the active job id across reloads.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("the active generation job id survives a refresh and is resumed on mount", () => {
  const g = read("src/components/generate/GenerateWorkspace.tsx");

  assert.match(g, /const ACTIVE_JOB_KEY = "depikt\.generate\.activeJobId"/);
  assert.match(g, /function saveActiveJob\(jobId: string\)/);
  assert.match(g, /function clearActiveJob\(\)/);
  assert.match(g, /function readActiveJob\(\): string \| null/);

  // pollJob must persist the id as soon as it starts, and clear it once
  // terminal — not just on success (a refreshed-then-failed job must not
  // resume forever either).
  const pollJobFn = g.slice(g.indexOf("function pollJob"), g.indexOf("async function submit"));
  assert.match(pollJobFn, /saveActiveJob\(jobId\)/);
  assert.match(pollJobFn, /clearActiveJob\(\)/);

  // A dedicated mount effect resumes any job left active from a previous
  // load, separate from the one-shot Library/Gallery/Prompt handoff effect.
  assert.match(
    g,
    /const activeJobId = readActiveJob\(\);\s*\n\s*if \(activeJobId\) pollJob\(activeJobId\);/,
  );

  // A resumed job has no local `prompt` to resolve a ratio from; once the
  // job itself loads, its own width/height must be used instead of
  // falling back to a guessed (and likely wrong) "1:1 square".
  assert.match(g, /function simplifyRatioLabel\(width: number, height: number\)/);
  assert.match(g, /job\?\.width && job\?\.height/);
});
