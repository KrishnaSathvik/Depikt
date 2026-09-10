import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveGenerationModel } from "../../src/lib/generation/model-router.ts";

test("defaults to flare for a simple photography prompt", () => {
  const m = resolveGenerationModel({
    operation: "generate",
    promptText: "a cinematic photograph of a cabin in snow at sunrise",
    referenceCount: 0,
  });
  assert.equal(m, "flare");
});

test("routes to sunburst for a quoted headline (exact text)", () => {
  const m = resolveGenerationModel({
    operation: "generate",
    promptText: 'a poster with the headline "GRAND OPENING" in bold type',
    referenceCount: 0,
  });
  assert.equal(m, "sunburst");
});

test("routes to sunburst for explicit exact-text phrasing without quotes", () => {
  const m = resolveGenerationModel({
    operation: "generate",
    promptText: "make a title that says Welcome Home in elegant typography",
    referenceCount: 0,
  });
  assert.equal(m, "sunburst");
});

test("routes to sunburst for layout-heavy categories: infographic, poster, slide, dashboard", () => {
  for (const kw of ["infographic", "poster", "slide", "dashboard", "storyboard"]) {
    const m = resolveGenerationModel({
      operation: "generate",
      promptText: `create an ${kw} about quarterly growth`,
      referenceCount: 0,
    });
    assert.equal(m, "sunburst", `expected sunburst for "${kw}"`);
  }
});

test("routes to sunburst for multiple references", () => {
  const m = resolveGenerationModel({
    operation: "generate",
    promptText: "combine these into one scene",
    referenceCount: 2,
  });
  assert.equal(m, "sunburst");
});

test("a single reference with no fidelity language stays on flare", () => {
  const m = resolveGenerationModel({
    operation: "generate",
    promptText: "use this as a style reference for a landscape painting",
    referenceCount: 1,
  });
  assert.equal(m, "flare");
});

test("a single reference with an identity/product fidelity ask routes to sunburst", () => {
  const m = resolveGenerationModel({
    operation: "generate",
    promptText: "keep the same face, change the outfit to a suit",
    referenceCount: 1,
  });
  assert.equal(m, "sunburst");
});

test("a simple edit stays on flare", () => {
  const m = resolveGenerationModel({
    operation: "edit",
    promptText: "make the sky more orange",
    referenceCount: 0,
  });
  assert.equal(m, "flare");
});

test("an edit that preserves identity/product routes to sunburst", () => {
  const m = resolveGenerationModel({
    operation: "edit",
    promptText: "change the jacket color, preserve the face and lighting exactly",
    referenceCount: 0,
  });
  assert.equal(m, "sunburst");
});

test("an edit asking for a precise localized change routes to sunburst", () => {
  const m = resolveGenerationModel({
    operation: "edit",
    promptText: "only change the text on the sign, leave everything else untouched",
    referenceCount: 0,
  });
  assert.equal(m, "sunburst");
});

test("structured hint: non-empty exact_text from Prompt's analyzer wins even if prose gives no clue", () => {
  const m = resolveGenerationModel({
    operation: "generate",
    promptText: "a clean minimal poster design",
    referenceCount: 0,
    hints: { exactTextCount: 2 },
  });
  assert.equal(m, "sunburst");
});

test("structured hint: layout-heavy category routes to sunburst even with plain prose", () => {
  const m = resolveGenerationModel({
    operation: "generate",
    promptText: "something for the team meeting",
    referenceCount: 0,
    hints: { category: "infographic" },
  });
  assert.equal(m, "sunburst");
});

test("structured hint: a non-layout category with zero exact text stays on flare", () => {
  const m = resolveGenerationModel({
    operation: "generate",
    promptText: "a nice photo",
    referenceCount: 0,
    hints: { category: "photography", exactTextCount: 0 },
  });
  assert.equal(m, "flare");
});

test("structured hint: fidelity reference_intent routes to sunburst", () => {
  const m = resolveGenerationModel({
    operation: "generate",
    promptText: "put this person on a beach",
    referenceCount: 1,
    hints: { referenceIntent: "subject_identity" },
  });
  assert.equal(m, "sunburst");
});

test("structured hint: style reference_intent does not force sunburst on its own", () => {
  const m = resolveGenerationModel({
    operation: "generate",
    promptText: "a landscape in this art style",
    referenceCount: 1,
    hints: { referenceIntent: "style" },
  });
  assert.equal(m, "flare");
});
