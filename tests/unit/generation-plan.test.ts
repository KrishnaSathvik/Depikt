import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadVnext1Cases } from "../image-evals/vnext-1/load-cases.ts";
import {
  AUTO_SERIES_CAP,
  buildGenerationPlan,
  resolveSelectedCount,
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
