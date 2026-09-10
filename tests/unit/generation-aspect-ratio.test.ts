import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveGenerationSize } from "../../src/lib/generation/aspect-ratio.ts";

test("priority 1: structured ratio from Prompt wins over everything else", () => {
  const r = resolveGenerationSize({
    promptText: "a square product shot", // says square, but structured intent says 4:5
    structuredAspectRatio: "4:5",
  });
  assert.equal(r.source, "structured");
  assert.deepEqual([r.width, r.height], [1024, 1280]);
  assert.equal(r.orientation, "portrait");
});

test("structured ratio is ignored when unrecognized, falling through", () => {
  const r = resolveGenerationSize({
    promptText: "wide banner",
    structuredAspectRatio: "7:2", // not in the supported table
  });
  assert.equal(r.source, "orientation");
});

test("priority 2: explicit ratio in prompt text", () => {
  const r = resolveGenerationSize({ promptText: "a poster, 3:4 portrait layout" });
  assert.equal(r.source, "explicit_ratio");
  assert.deepEqual([r.width, r.height], [1152, 1536]);
});

test("explicit 16:9 maps to the landscape wide bucket", () => {
  const r = resolveGenerationSize({ promptText: "cinematic still, 16:9" });
  assert.deepEqual([r.width, r.height], [1536, 864]);
  assert.equal(r.orientation, "landscape");
});

test("priority 3: known named format when no explicit ratio is given", () => {
  const r = resolveGenerationSize({ promptText: "make a youtube thumbnail for this video" });
  assert.equal(r.source, "known_format");
  assert.deepEqual([r.width, r.height], [1536, 864]);
});

test("instagram story maps to 9:16", () => {
  const r = resolveGenerationSize({ promptText: "design an instagram story graphic" });
  assert.deepEqual([r.width, r.height], [864, 1536]);
});

test("priority 4: orientation word when no ratio or known format present", () => {
  const r = resolveGenerationSize({ promptText: "a landscape photo of mountains at sunrise" });
  assert.equal(r.source, "orientation");
  assert.deepEqual([r.width, r.height], [1536, 1024]);
});

test("orientation 'vertical' resolves to portrait default", () => {
  const r = resolveGenerationSize({ promptText: "a vertical poster of a city skyline" });
  assert.equal(r.orientation, "portrait");
  assert.deepEqual([r.width, r.height], [1024, 1536]);
});

test("priority 5: reference composition preserved only when asked", () => {
  const r = resolveGenerationSize({
    promptText: "turn this into a winter scene, preserve the composition",
    referenceRatio: { width: 1536, height: 1024 }, // 3:2
  });
  assert.equal(r.source, "reference");
  assert.deepEqual([r.width, r.height], [1536, 1024]);
});

test("reference ratio is ignored without an explicit preserve instruction", () => {
  const r = resolveGenerationSize({
    promptText: "turn this into a winter scene",
    referenceRatio: { width: 1536, height: 1024 },
  });
  assert.notEqual(r.source, "reference");
  assert.equal(r.source, "fallback");
});

test("an explicit new ratio overrides a request to preserve the reference", () => {
  const r = resolveGenerationSize({
    promptText: "turn this into a 16:9 website hero, keep the composition",
    referenceRatio: { width: 1024, height: 1536 }, // 2:3 portrait source
  });
  // explicit ratio (priority 2) wins over reference preservation (priority 5)
  assert.equal(r.source, "explicit_ratio");
  assert.deepEqual([r.width, r.height], [1536, 864]);
});

test("priority 6: fallback square only when nothing else applies", () => {
  const r = resolveGenerationSize({ promptText: "a photo of a dog running through snow" });
  assert.equal(r.source, "fallback");
  assert.deepEqual([r.width, r.height], [1024, 1024]);
  assert.equal(r.orientation, "square");
});

test("all resolved sizes are multiples of 16", () => {
  const cases = [
    { promptText: "1:1" },
    { promptText: "4:5" },
    { promptText: "5:4" },
    { promptText: "3:4" },
    { promptText: "4:3" },
    { promptText: "2:3" },
    { promptText: "3:2" },
    { promptText: "9:16" },
    { promptText: "16:9" },
    { promptText: "nothing here" },
  ];
  for (const c of cases) {
    const r = resolveGenerationSize(c);
    assert.equal(r.width % 16, 0, `${r.width} not a multiple of 16 for ${c.promptText}`);
    assert.equal(r.height % 16, 0, `${r.height} not a multiple of 16 for ${c.promptText}`);
  }
});
