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
  const g = read("src/routes/api/generation/jobs.ts");

  // The fetch must be conditioned on operation === "edit" with a
  // sourceVersionId, must look up image_versions for that id, and must
  // push the downloaded bytes into referenceImages — the same array
  // ultimately passed to editImage()'s image[] fields.
  assert.match(g, /req\.operation === "edit" && req\.sourceVersionId/);
  assert.match(g, /from\("image_versions"\)/);
  assert.match(g, /\.select\("storage_path"\)/);
  assert.match(g, /\.eq\("id", req\.sourceVersionId\)/);

  // The source-image fetch must happen before (and populate the same
  // array as) the user-uploaded reference loop, so both end up in the
  // request sent to OpenAI.
  const sourceFetchIdx = g.indexOf('req.operation === "edit"');
  const uploadedRefLoopIdx = g.indexOf("for (const path of req.referenceAssetIds)");
  assert.ok(sourceFetchIdx > 0 && uploadedRefLoopIdx > 0);
  assert.ok(
    sourceFetchIdx < uploadedRefLoopIdx,
    "source-version fetch must run before the user-uploaded reference loop",
  );
});
