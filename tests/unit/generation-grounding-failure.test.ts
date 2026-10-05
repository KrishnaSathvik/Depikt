import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { withoutGrounding } from "../../src/lib/generation/grounding/planner.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

// Research is a helper, not a gate: when the lookup fails the generation must
// still run from the prompt alone instead of dying with "Could not research
// references."

test("a failed research step degrades the plan to prompt-only generation", () => {
  const wanted = { mode: "single", desiredCount: 3, autoCount: 2, searchNeeded: true };
  const degraded = withoutGrounding(wanted);
  assert.equal(degraded.searchNeeded, false);
  assert.equal(degraded.mode, "single");
  assert.equal(degraded.desiredCount, 3);
  assert.equal(degraded.autoCount, 2);
  assert.equal(wanted.searchNeeded, true, "the caller's plan object is left untouched");
});

test("a research failure no longer aborts the generation", () => {
  const src = read("src/routes/api/generation/plans.ts");
  assert.doesNotMatch(src, /Could not research references/);
  assert.match(src, /plan = withoutGrounding\(plan\)/);
  assert.match(src, /console\.error\([\s\S]{0,40}"grounding_failed"/);
});
