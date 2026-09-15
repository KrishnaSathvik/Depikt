// Task 2J — precision edit Apply wires the local PNG into the existing
// VNext 1 plan/jobs/run/poll lifecycle. Source-inspect: drawing stays local,
// upload happens only inside applyEdit, submit() forwards maskAssetId.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

function sliceFn(src: string, start: string, end: string): string {
  const from = src.indexOf(start);
  const to = src.indexOf(end, from + start.length);
  assert.ok(from >= 0, `missing start marker: ${start}`);
  assert.ok(to > from, `missing end marker after ${start}: ${end}`);
  return src.slice(from, to);
}

test("SubmitInput includes maskAssetId and submit() forwards it to createGenerationPlan", () => {
  const hook = read("src/lib/generation/use-generation.ts");
  const submitInput = sliceFn(hook, "export interface SubmitInput {", "export interface UseGenerationOptions");
  assert.match(submitInput, /maskAssetId\?:\s*string\s*\|\s*null/);

  const submitFn = sliceFn(hook, "async function submit(input: SubmitInput)", "function applyPlanOrJobError");
  assert.match(submitFn, /createGenerationPlan\(\{/);
  assert.match(submitFn, /maskAssetId:\s*input\.maskAssetId\s*\?\?\s*null/);
  assert.match(submitFn, /sourceVersionId:\s*input\.sourceVersionId\s*\?\?\s*null/);
});

test("applyEdit uploads via uploadEditMask only when maskPng is provided", () => {
  const hook = read("src/lib/generation/use-generation.ts");
  assert.match(hook, /uploadEditMask/);
  assert.match(hook, /bytesToPngDataUrl/);
  assert.match(
    hook,
    /function applyEdit\(editPrompt: string,\s*opts\?:\s*\{\s*maskPng\?:\s*Uint8Array\s*\|\s*null\s*\}\)/,
  );

  const applyEditFn = sliceFn(hook, "function applyEdit(editPrompt: string", "function download()");
  assert.match(applyEditFn, /uploadEditMask\(/);
  assert.match(applyEditFn, /opts\?\.maskPng/);
  assert.match(applyEditFn, /bytesToPngDataUrl\(/);
  assert.match(applyEditFn, /sourceVersionId:\s*activeVersionId|sourceVersionId,/);
  assert.match(applyEditFn, /maskAssetId/);
  assert.match(applyEditFn, /submit\(\{/);
  assert.match(applyEditFn, /setPhase\("starting"\)/);
  assert.ok(
    applyEditFn.indexOf('setPhase("starting")') < applyEditFn.indexOf("uploadEditMask("),
    "phase must become starting before the mask upload",
  );
  assert.match(applyEditFn, /toast\.error\(/);
  assert.match(applyEditFn, /setPhase\("result"\)/);
  assert.doesNotMatch(applyEditFn, /setAuthPrompt/);
  assert.doesNotMatch(applyEditFn, /pollSession|getGenerationJob/);
  assert.doesNotMatch(applyEditFn, /savePendingGeneration/);
});

test("GenerationMaskEditor and the edit form never call uploadEditMask", () => {
  const editor = read("src/components/generate/GenerationMaskEditor.tsx");
  const form = read("src/components/generate/GenerationEditForm.tsx");
  for (const src of [editor, form]) {
    assert.doesNotMatch(src, /uploadEditMask/);
    assert.doesNotMatch(src, /POST\s*\/masks|\/api\/.*masks/);
    assert.doesNotMatch(src, /applyEdit\s*\(/);
  }
});

test("form onApply whole-image passes null mask; area uses exportMaskPng", () => {
  const form = read("src/components/generate/GenerationEditForm.tsx");
  assert.match(form, /onApply:\s*\(result:\s*\{\s*maskPng:\s*Uint8Array\s*\|\s*null\s*\}\)\s*=>\s*void/);
  assert.match(form, /exportMaskPng/);
  assert.match(form, /onApply\(\{\s*maskPng:\s*null\s*\}\)/);
  assert.match(form, /onApply\(\{\s*maskPng:\s*exportMaskPng\(strokes,\s*sourceWidth,\s*sourceHeight\)\s*\}\)/);
  assert.match(form, /hasPaintCoverage/);
  assert.match(form, /Apply edit → · 1 credit/);
});

test("both parents still call applyEdit with the form's maskPng", () => {
  const workspace = read("src/components/generate/GenerateWorkspace.tsx");
  const panel = read("src/components/generate/InlineGenerationPanel.tsx");
  for (const src of [workspace, panel]) {
    assert.match(src, /onApply=\{\(\{\s*maskPng\s*\}\)\s*=>\s*\{/);
    assert.match(src, /gen\.applyEdit\(editPrompt,\s*\{\s*maskPng\s*\}\)/);
  }
});

test("applyEdit uses activeVersionId as sourceVersionId", () => {
  const hook = read("src/lib/generation/use-generation.ts");
  const applyEditFn = sliceFn(hook, "function applyEdit(editPrompt: string", "function download()");
  assert.match(applyEditFn, /activeVersionId/);
  assert.match(applyEditFn, /sourceVersionId/);
  assert.doesNotMatch(applyEditFn, /sourceVersionId:\s*null/);
});

test("IntentSchema still has no mask field", () => {
  const src = read("src/lib/prompt-engine/intent.ts");
  const start = src.indexOf("export const IntentSchema");
  assert.ok(start >= 0, "IntentSchema is exported");
  const typeStart = src.indexOf("export type Intent", start);
  const schema = typeStart === -1 ? src.slice(start) : src.slice(start, typeStart);
  assert.doesNotMatch(schema, /mask/i);
});

test("regenerate still strips sourceVersionId and does not keep a mask", () => {
  const hook = read("src/lib/generation/use-generation.ts");
  const regenerateFn = sliceFn(hook, "function regenerate()", "function applyEdit");
  assert.match(regenerateFn, /sourceVersionId:\s*null/);
  assert.match(regenerateFn, /maskAssetId:\s*(null|undefined)/);
});

test("signed-out pending payload skips mask bytes", () => {
  const pending = read("src/lib/generation/pending-generation.ts");
  const iface = sliceFn(pending, "export interface PendingGeneration {", "const KEY");
  assert.doesNotMatch(iface, /mask/i);

  const hook = read("src/lib/generation/use-generation.ts");
  const submitFn = sliceFn(hook, "async function submit(input: SubmitInput)", "function applyPlanOrJobError");
  const saveCall = submitFn.slice(
    submitFn.indexOf("savePendingGeneration({"),
    submitFn.indexOf("setAuthPromptContext"),
  );
  assert.match(saveCall, /sourceVersionId:/);
  assert.doesNotMatch(saveCall, /mask/i);
});
