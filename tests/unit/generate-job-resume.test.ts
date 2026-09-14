// Regression coverage for a live-QA bug: refreshing the page during a
// still-running generation job lost all track of it (no polling resume, no
// way to ever see the result). Confirmed live (a real Sunburst job kept
// running server-side and completed successfully while the page had no
// way to know). Fixed by persisting the active job id across reloads.
//
// VNext 1 (Task 9) generalized this from one job to a whole session: a
// confirmed series creates several queued children on one session, and
// every one of them needs to be tracked and resumed, not just the first.
// The persisted key is now the session id; pollSession's first tick
// re-fetches every child job's current status (they may already be done)
// from the session itself.
//
// This logic lives in the shared useGeneration hook (src/lib/generation/
// use-generation.ts) — extracted out of GenerateWorkspace so /generate,
// Prompt Build inline, and Prompt Critique inline all get job-recovery for
// free. See docs/plans/2026-09-10-inline-generation-workspace.md and
// docs/plans/2026-09-14-vnext-1-intent-to-generate.md.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("the active generation session id survives a refresh and is resumed on mount", () => {
  const g = read("src/lib/generation/use-generation.ts");

  assert.match(g, /const ACTIVE_SESSION_KEY = "depikt\.generate\.activeSessionId"/);
  assert.match(g, /function saveActiveSession\(sessionId: string\)/);
  assert.match(g, /function clearActiveSession\(\)/);
  assert.match(g, /function readActiveSession\(\): string \| null/);
  // The old, one-job-only key must be gone entirely.
  assert.equal(/ACTIVE_JOB_KEY/.test(g), false);

  // pollSession must persist the id as soon as it starts, and clear it once
  // every child job is terminal — not just on success (a refreshed-then-
  // failed session must not resume forever either).
  const pollSessionFn = g.slice(
    g.indexOf("function pollSession"),
    g.indexOf("async function submit"),
  );
  assert.match(pollSessionFn, /saveActiveSession\(sessionId\)/);
  assert.match(pollSessionFn, /clearActiveSession\(\)/);
  assert.match(pollSessionFn, /detailed\.every\(\(j\) => isTerminalStatus\(j\.status\)\)/);

  // A dedicated mount effect resumes any session left active from a
  // previous load, separate from the one-shot Library/Gallery/Prompt
  // handoff effect (which stays in GenerateWorkspace) and the pending-auth
  // resume effect.
  assert.match(
    g,
    /const activeSessionId = readActiveSession\(\);\s*\n\s*if \(activeSessionId\) pollSession\(activeSessionId\);/,
  );

  // A resumed job has no local `prompt` to resolve a ratio from; once the
  // job itself loads, its own width/height must be used instead of
  // falling back to a guessed (and likely wrong) "1:1 square". Every
  // consumer (GenerateWorkspace, InlineGenerationPanel) derives this from
  // simplifyRatioLabel + `job?.width && job?.height`, exported here.
  assert.match(g, /export function simplifyRatioLabel\(width: number, height: number\)/);

  assert.match(
    read("src/components/generate/GenerateWorkspace.tsx"),
    /gen\.job\?\.width && gen\.job\?\.height/,
  );
  assert.match(
    read("src/components/generate/InlineGenerationPanel.tsx"),
    /gen\.job\?\.width && gen\.job\?\.height/,
  );
});

test("jobs from a session are given full per-job detail, not just id/status", () => {
  const g = read("src/lib/generation/use-generation.ts");
  const pollSessionFn = g.slice(
    g.indexOf("function pollSession"),
    g.indexOf("async function submit"),
  );
  // Each session child is re-fetched via getGenerationJob for its own
  // width/height/model/errorMessage/signed result URL -- the session GET
  // itself only returns id/status/series_index/series_label/created_at.
  assert.match(pollSessionFn, /session\.jobs\.map\(async \(child\)/);
  assert.match(pollSessionFn, /await getGenerationJob\(child\.id\)/);
  assert.match(pollSessionFn, /label: child\.series_label \?\? null/);
  assert.match(pollSessionFn, /index: child\.series_index \?\? null/);
});
