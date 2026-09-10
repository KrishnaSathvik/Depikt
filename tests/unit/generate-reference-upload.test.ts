// Regression coverage for the Library/Gallery -> Generate "lost reference"
// bug: attaching a reference before a session exists (a very common path —
// the handoff-consuming effect runs before the credit-balance/auth effects
// settle) 401s the upload. The entry must stay visible and retryable, never
// silently disappear.
//
// This logic lives in the shared useGeneration hook (src/lib/generation/
// use-generation.ts). See docs/plans/2026-09-10-inline-generation-workspace.md.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("a failed reference upload is flagged for retry, never filtered out of state", () => {
  const g = read("src/lib/generation/use-generation.ts");

  // The shared upload helper must exist and must not remove the entry from
  // `references` on failure — only an inline `prev.filter((r) => r !== entry)`
  // would do that, and that was the original bug.
  assert.match(g, /async function uploadReference\(entry: ReferenceEntry\): Promise<boolean>/);
  const uploadFn = g.slice(
    g.indexOf("async function uploadReference"),
    g.indexOf("function retryReferenceUpload"),
  );
  assert.match(uploadFn, /error: true/);
  assert.equal(/prev\.filter\(\(r\) => r !== entry\)/.test(uploadFn), false);

  // A retry path exists.
  assert.match(g, /function retryReferenceUpload\(index: number\)/);

  // ...and GenerateWorkspace (the surface with an editable reference picker)
  // wires the rendered thumbnail's retry control to it. Build/Critique
  // attach their reference before Generate is pressed and don't re-expose
  // reference editing inside InlineGenerationPanel, so they have nothing to
  // wire here.
  assert.match(
    read("src/components/generate/GenerateWorkspace.tsx"),
    /onRetryReference=\{gen\.retryReferenceUpload\}/,
  );

  // Failed uploads auto-retry once a session exists, so a Library/Gallery
  // handoff that arrived signed-out recovers without the user noticing.
  assert.match(
    g,
    /A reference attached before sign-in[\s\S]*?referencesRef\.current\.forEach\(\(r, i\) => \{\s*if \(r\.error\) retryReferenceUpload\(i\);/,
  );

  // addReferenceFromDataUrl (the Library/Gallery/Prompt handoff and pending-
  // auth-resume path) and addReference (the manual file picker) both go
  // through the shared helper rather than duplicating the old filter-on-
  // failure logic.
  assert.match(g, /await uploadReference\(entry\);\s*\n\s*\}/);
  assert.match(g, /const ok = await uploadReference\(entry\);/);
});
