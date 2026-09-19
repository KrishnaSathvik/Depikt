import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { withPrecisionEditPreamble } from "../../src/lib/generation/precision-edit-prompt.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

test("precision-edit preamble contains REQUEST: and the user prompt", () => {
  const out = withPrecisionEditPreamble("  make the sky warmer  ");
  assert.match(out, /REQUEST:/);
  assert.match(out, /make the sky warmer/);
  assert.doesNotMatch(out, / {2}make the sky warmer {2}/);
  assert.match(out, /Change only the selected region according to the request/);
  assert.match(out, /Preserve all unselected content/);
  assert.doesNotMatch(out, /pixel-perfect|pixel perfect/i);
});

test("precision-edit preamble includes must_preserve lines when provided", () => {
  const out = withPrecisionEditPreamble("replace the mug", ["the face", "the lighting"]);
  assert.match(out, /REQUEST:\nreplace the mug/);
  assert.match(out, /\n\nPreserve: the face; the lighting\./);
});

test("precision-edit preamble omits Preserve: when must_preserve is empty", () => {
  const out = withPrecisionEditPreamble("replace the mug");
  assert.doesNotMatch(out, /\nPreserve:/);
});

test("precision-edit-prompt.ts is string assembly only — no writer or intent analyzer", () => {
  const src = read("src/lib/generation/precision-edit-prompt.ts");
  assert.doesNotMatch(src, /analyzeIntent/);
  assert.doesNotMatch(src, /from ["'].*prompt-engine\/builder/);
  assert.doesNotMatch(src, /openai/i);
  assert.doesNotMatch(src, /writePrompt|runWriter|prompt writer/i);
});

test("jobs.ts uses withPrecisionEditPreamble for masked non-series jobs and withFidelityPreamble otherwise", () => {
  const src = read("src/routes/api/generation/jobs.ts");
  assert.match(src, /withPrecisionEditPreamble/);
  assert.match(src, /from ["']@\/lib\/generation\/precision-edit-prompt["']/);

  const resolveStart = src.indexOf("async function resolveChildren");
  const resolveEnd = src.indexOf("export const Route");
  assert.ok(resolveStart >= 0 && resolveEnd > resolveStart);
  const resolveChildren = src.slice(resolveStart, resolveEnd);

  const seriesIdx = resolveChildren.indexOf('payload.plan.mode !== "series"');
  const maskIdx = resolveChildren.indexOf("withPrecisionEditPreamble");
  const fidelityIdx = resolveChildren.indexOf("withFidelityPreamble");
  assert.ok(seriesIdx >= 0 && maskIdx > seriesIdx && fidelityIdx > maskIdx);

  assert.match(
    resolveChildren,
    /withPrecisionEditPreamble\(\s*withEntities\(payload\.prompt\),\s*payload\.intent\.must_preserve,\s*payload\.userInput,?\s*\)/,
  );
  assert.match(resolveChildren, /withFidelityPreamble\(payload\.prompt,\s*payload\.intent\)/);
  assert.match(resolveChildren, /maskPath|maskAssetId/);
});

test("attribute-only edit explicitly preserves selected-object geometry", () => {
  const out = withPrecisionEditPreamble(
    "Change only the cobalt-blue teapot to matte ivory. Preserve the pears.",
  );
  assert.match(
    out,
    /Preserve shape, silhouette, dimensions, perspective, pose and internal geometry/,
  );
  assert.match(out, /Change only the requested attribute/);
});
test("replacement, removal and addition have distinct local geometry semantics", async () => {
  const { classifyLocalEdit } = await import("../../src/lib/generation/local-edit-intent.ts");
  for (const [request, kind] of [
    ["Replace the blue teapot with a vase", "replacement"],
    ["Remove the red teapot", "removal"],
    ["Add a silver handle", "addition"],
    ["Change the material to ceramic", "attribute_change"],
    ["Recolor the jacket turquoise", "attribute_change"],
  ]) {
    assert.equal(classifyLocalEdit(request), kind, request);
    if (kind !== "attribute_change")
      assert.doesNotMatch(
        withPrecisionEditPreamble(request),
        /Change only the requested attribute/,
      );
  }
});
