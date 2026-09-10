// Regression coverage for the Library/Gallery -> Generate "lost reference"
// bug: attaching a reference before a session exists (a very common path —
// GenerateWorkspace's handoff effect runs before the credit-balance/auth
// effects settle) 401s the upload. The entry must stay visible and
// retryable, never silently disappear.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("a failed reference upload is flagged for retry, never filtered out of state", () => {
  const g = read("src/components/generate/GenerateWorkspace.tsx");

  // The shared upload helper must exist and must not remove the entry from
  // `references` on failure — only restoreReference/handleAddReference's old
  // inline `prev.filter((r) => r !== entry)` did that, and it's the bug.
  assert.match(g, /async function uploadReference\(entry: ReferenceEntry\)/);
  const uploadFn = g.slice(
    g.indexOf("async function uploadReference"),
    g.indexOf("function retryReferenceUpload"),
  );
  assert.match(uploadFn, /error: true/);
  assert.equal(/prev\.filter\(\(r\) => r !== entry\)/.test(uploadFn), false);

  // A retry path exists and is reachable from the rendered thumbnail.
  assert.match(g, /function retryReferenceUpload\(index: number\)/);
  assert.match(g, /onClick=\{\(\) => retryReferenceUpload\(i\)\}/);

  // Failed uploads auto-retry once a session exists, so a Library/Gallery
  // handoff that arrived signed-out recovers without the user noticing.
  assert.match(
    g,
    /A reference attached before sign-in[\s\S]*?references\.forEach\(\(r, i\) => \{\s*if \(r\.error\) retryReferenceUpload\(i\);/,
  );

  // restoreReference (the Library/Gallery/Prompt handoff path) and
  // handleAddReference (the manual file picker) both go through the shared
  // helper rather than duplicating the old filter-on-failure logic.
  assert.match(g, /await uploadReference\(entry\);\s*\n\s*\}/);
  assert.match(g, /const ok = await uploadReference\(entry\);/);
});
