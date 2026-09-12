// Regression coverage for a live-QA bug: an "edit" job's source image was
// never fetched/attached, so every edit request reached OpenAI's
// /v1/images/edits with zero images and was rejected outright. Confirmed
// live (real API, real credit reserve+refund) before the fix, and fixed
// afterward with a second live edit that preserved the untouched parts of
// the source image correctly.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("an edit job fetches and attaches its source version's own image, not just user-uploaded references", () => {
  // Execution moved out of the create route (jobs.ts) into the long-lived
  // run route, because this deployment has no waitUntil/Queues to keep
  // fire-and-forget work alive — so the source-image fetch lives there now.
  const g = read("src/routes/api/generation/jobs.$id.run.ts");

  assert.match(g, /job\.operation === "edit" && job\.source_version_id/);
  assert.match(g, /from\("image_versions"\)/);
  assert.match(g, /\.select\("storage_path"\)/);
  assert.match(g, /\.eq\("id", job\.source_version_id\)/);

  // The source-image fetch must happen before (and populate the same
  // array as) the user-uploaded reference loop, so both end up in the
  // request sent to OpenAI.
  const sourceFetchIdx = g.indexOf('job.operation === "edit"');
  const uploadedRefLoopIdx = g.indexOf("for (const path of referencePaths)");
  assert.ok(sourceFetchIdx > 0 && uploadedRefLoopIdx > 0);
  assert.ok(
    sourceFetchIdx < uploadedRefLoopIdx,
    "source-version fetch must run before the user-uploaded reference loop",
  );
});

