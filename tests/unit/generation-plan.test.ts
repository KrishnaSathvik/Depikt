import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadVnext1Cases } from "../image-evals/vnext-1/load-cases.ts";
import {
  AUTO_SERIES_CAP,
  HARD_SERIES_CAP,
  buildGenerationPlan,
  clampGenerationPlan,
  resolveSelectedCount,
  resolveOperation,
  type GenerationPlan,
} from "../../src/lib/generation/plan.ts";

test("CI gate: fixture Intent → plan is 11/11", () => {
  const src = readFileSync(new URL("../../src/lib/generation/plan.ts", import.meta.url), "utf8");
  assert.equal(src.includes("astrophotography"), false);
  assert.equal(src.includes("Skylines"), false);
  assert.equal(src.includes("HALO"), false);
  for (const c of loadVnext1Cases()) {
    const plan = buildGenerationPlan(c.fixture_intent, c.prompt);
    assert.equal(plan.mode, c.expected.mode, c.id);
    assert.equal(plan.desiredCount, c.expected.desiredCount, c.id);
    assert.equal(plan.autoCount, c.expected.autoCount, c.id);
    assert.equal(plan.searchNeeded, c.expected.search_needed, c.id);
    assert.equal(plan.separateAssets, c.expected.separate_assets, c.id);
  }
});

test("library source forces single even when the prompt lists variants", () => {
  const c = loadVnext1Cases().find((x) => x.id === "product-campaign");
  assert.ok(c);
  const plan = buildGenerationPlan(c.fixture_intent, c.prompt, "library");
  assert.equal(plan.mode, "single");
  assert.equal(plan.desiredCount, 1);
});

test("plural alone is not a series", () => {
  const plan = buildGenerationPlan(
    loadVnext1Cases()[0]!.fixture_intent,
    "photos of a cat sitting on a windowsill",
  );
  assert.equal(plan.mode, "single");
});

test("explicit N ads is a series of N; >4 requires confirmation", () => {
  const intent = loadVnext1Cases()[0]!.fixture_intent;
  const plan = buildGenerationPlan(intent, "create 7 Instagram ads for a soda brand");
  assert.equal(plan.mode, "series");
  assert.equal(plan.desiredCount, 7);
  assert.equal(plan.autoCount, AUTO_SERIES_CAP);
  assert.equal(plan.requiresCountConfirmation, true);
  assert.equal(resolveSelectedCount(plan, 4), 4);
  assert.equal(resolveSelectedCount(plan, 7), 7);
  assert.throws(() => resolveSelectedCount(plan, 20));
});

test("desiredCount is hard-capped at 20 even when the prompt asks for more", () => {
  const intent = loadVnext1Cases()[0]!.fixture_intent;
  const plan = buildGenerationPlan(intent, "create 500 ads for a soda brand");
  assert.equal(plan.mode, "series");
  assert.equal(plan.desiredCount, HARD_SERIES_CAP);
  assert.equal(plan.autoCount, AUTO_SERIES_CAP);
  assert.equal(plan.requiresCountConfirmation, true);
  assert.equal(resolveSelectedCount(plan, AUTO_SERIES_CAP), AUTO_SERIES_CAP);
  assert.equal(resolveSelectedCount(plan, HARD_SERIES_CAP), HARD_SERIES_CAP);
  assert.throws(() => resolveSelectedCount(plan, 500));

  const forged = clampGenerationPlan({
    mode: "series",
    desiredCount: 500,
    autoCount: 4,
    separateAssets: true,
    searchNeeded: false,
    requiresCountConfirmation: true,
  });
  assert.equal(forged.desiredCount, HARD_SERIES_CAP);
  assert.equal(forged.autoCount, AUTO_SERIES_CAP);
});

test("spelled-out four separate images is a series, not a collage or a single", () => {
  const intent = loadVnext1Cases()[0]!.fixture_intent;
  const plan = buildGenerationPlan(
    intent,
    "Create four separate realistic astrophotography images for Instagram Stories: Milky Way, star trails, meteor shower, and a dense starfield. Each should be its own standalone image, not a collage.",
  );
  assert.equal(plan.mode, "series");
  assert.equal(plan.desiredCount, 4);
  assert.equal(plan.autoCount, AUTO_SERIES_CAP);
  assert.equal(plan.separateAssets, true);
  assert.equal(plan.requiresCountConfirmation, false);
});

test("object counts in a scene are not deliverable counts", () => {
  const breakfast = loadVnext1Cases().find((c) => c.id === "breakfast-table")!;
  const plan = buildGenerationPlan(breakfast.fixture_intent, breakfast.prompt);
  assert.equal(plan.mode, "single");
  assert.equal(plan.desiredCount, 1);
});

test("missing_facts alone do not imply search", () => {
  const intent = {
    ...loadVnext1Cases()[0]!.fixture_intent,
    factual_requirements: {
      user_supplied_facts: [],
      missing_facts: ["date"],
      placeholders_required: true,
    },
  };
  const plan = buildGenerationPlan(intent, `build a conference poster, title "HELLO"`);
  assert.equal(plan.searchNeeded, false);
  assert.equal(plan.mode, "single");
});

// Confirmed live bug: a signed "single"/"series" plan with an attached
// reference image (Library "Use as reference", a Gallery handoff, a manual
// attach on Generate) still went to OpenAI's images/generations endpoint
// with no image input at all -- only plan.mode === "edit" ever produced an
// "edit" operation. job-pipeline.ts's "generate" branch never receives
// referenceImages, so the attachment was silently ignored end to end. See
// generate-reference-upload.test.ts for the job-pipeline half of this.
test("resolveOperation: a reference image or a source version forces edit even when the plan is single/series", () => {
  const singlePlan: GenerationPlan = {
    mode: "single",
    desiredCount: 1,
    autoCount: 1,
    separateAssets: false,
    searchNeeded: false,
    requiresCountConfirmation: false,
  };
  const seriesPlan: GenerationPlan = {
    ...singlePlan,
    mode: "series",
    desiredCount: 3,
    autoCount: 3,
  };

  assert.equal(resolveOperation(singlePlan, [], null), "generate");
  assert.equal(resolveOperation(singlePlan, ["user-1/ref.png"], null), "edit");
  assert.equal(resolveOperation(singlePlan, [], "version-1"), "edit");
  assert.equal(resolveOperation(seriesPlan, ["user-1/ref.png"], null), "edit");
  assert.equal(resolveOperation(seriesPlan, [], null), "generate");

  const editPlan: GenerationPlan = { ...singlePlan, mode: "edit" };
  assert.equal(resolveOperation(editPlan, [], null), "edit");
});

test("listed variants with a coordinating deliverable noun infer a series", () => {
  const intent = loadVnext1Cases()[0]!.fixture_intent;
  const plan = buildGenerationPlan(
    intent,
    "Build a regional layout using relevant expansions. Check research. North quarter, downtown core, sports complex, coastal harbor.",
  );
  assert.equal(plan.mode, "series");
  assert.equal(plan.desiredCount, 4);
  assert.equal(plan.searchNeeded, true);
});
