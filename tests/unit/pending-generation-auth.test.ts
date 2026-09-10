// Regression coverage for the auth-persistence gap the audit flagged: the
// original GenerateWorkspace held a pending submission only in a React ref
// (pendingSubmit.current), which a hard-navigating OAuth round trip can
// wipe out on remount. use-generation.ts must persist enough to resume the
// exact same submission after sign-in, without a second Generate click and
// without double-charging a credit.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("pending-generation.ts persists to sessionStorage, not a ref", () => {
  const p = read("src/lib/generation/pending-generation.ts");
  assert.match(p, /const KEY = "depikt:pending-generation"/);
  assert.match(p, /export function savePendingGeneration/);
  assert.match(p, /export function readPendingGeneration/);
  assert.match(p, /export function clearPendingGeneration/);
  assert.match(p, /sessionStorage\.setItem\(KEY/);
  // The full request shape a resume needs, not just the prompt string.
  for (const field of [
    "prompt",
    "referenceDataUrls",
    "structuredAspectRatio",
    "routingHints",
    "sourceContext",
    "sourceVersionId",
    "idempotencyKey",
  ]) {
    assert.match(p, new RegExp(field), `PendingGeneration must carry ${field}`);
  }
});

test("submit() persists pending generation before starting OAuth, not just a ref", () => {
  const g = read("src/lib/generation/use-generation.ts");
  assert.equal(
    /pendingSubmit\.current/.test(g),
    false,
    "the fragile ref-only pending flag must be gone",
  );
  const submitFn = g.slice(
    g.indexOf("async function submit"),
    g.indexOf("// Re-upload any references"),
  );
  assert.match(submitFn, /if \(!user\)/);
  assert.match(submitFn, /savePendingGeneration\(\{/);
  assert.match(submitFn, /signInWithOAuth/);
});

test("a resume effect fires once signed in, matched to this hook instance's sourceContext", () => {
  const g = read("src/lib/generation/use-generation.ts");
  assert.match(g, /readPendingGeneration\(\)/);
  assert.match(g, /pending\.sourceContext\.type !== sourceContextRef\.current\.type/);
  assert.match(g, /clearPendingGeneration\(\)/);
  assert.match(g, /resumePendingGeneration\(pending\)/);
});

test("resume re-uploads any references lost to a hard navigation before resubmitting", () => {
  const g = read("src/lib/generation/use-generation.ts");
  const resumeFn = g.slice(
    g.indexOf("async function resumePendingGeneration"),
    g.indexOf("function regenerate"),
  );
  assert.match(resumeFn, /addReferenceFromDataUrl/);
  assert.match(resumeFn, /idempotencyKey: pending\.idempotencyKey/);
});
