// Native image generation — what generation_sessions.plan_json stores, and
// what /run is allowed to trust from it. See execution-plan.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildExecutionPlanJson,
  executionPlanIdentityMatches,
  extractStoredReferenceAssetIds,
} from "../../src/lib/generation/execution-plan.ts";
import type { GenerationPlan } from "../../src/lib/generation/plan.ts";

const plan: GenerationPlan = {
  mode: "series",
  desiredCount: 3,
  autoCount: 3,
  separateAssets: true,
  searchNeeded: false,
  requiresCountConfirmation: false,
};

test("buildExecutionPlanJson carries selectedCount, references, sourceVersionId, and child shape without raw prompt text", () => {
  const executionPlan = buildExecutionPlanJson({
    plan,
    selectedCount: 3,
    referenceAssetIds: ["user-1/a.png", "user-1/b.png"],
    sourceVersionId: "version-9",
    children: [
      { label: "Scene 1", prompt: "a".repeat(500) },
      { label: "Scene 2", prompt: "b".repeat(20) },
    ],
  });

  assert.deepEqual(executionPlan.plan, plan);
  assert.equal(executionPlan.selectedCount, 3);
  assert.deepEqual(executionPlan.referenceAssetIds, ["user-1/a.png", "user-1/b.png"]);
  assert.equal(executionPlan.sourceVersionId, "version-9");
  assert.deepEqual(executionPlan.children, [
    { label: "Scene 1", promptLength: 500 },
    { label: "Scene 2", promptLength: 20 },
  ]);
  // Never the raw prompt text -- see the file header.
  assert.equal(JSON.stringify(executionPlan).includes("a".repeat(500)), false);
});

test("extractStoredReferenceAssetIds only trusts a real string array on the stored plan_json", () => {
  assert.deepEqual(
    extractStoredReferenceAssetIds({ referenceAssetIds: ["user-1/a.png", "user-1/b.png"] }),
    ["user-1/a.png", "user-1/b.png"],
  );
  assert.deepEqual(extractStoredReferenceAssetIds({ referenceAssetIds: ["ok", 42, null] }), ["ok"]);
  assert.deepEqual(extractStoredReferenceAssetIds(null), []);
  assert.deepEqual(extractStoredReferenceAssetIds(undefined), []);
  assert.deepEqual(extractStoredReferenceAssetIds("not-an-object"), []);
  assert.deepEqual(extractStoredReferenceAssetIds({}), []);
  assert.deepEqual(extractStoredReferenceAssetIds({ referenceAssetIds: "not-an-array" }), []);
});

const identity = {
  plan: { mode: "series" as const, desiredCount: 3, autoCount: 3 },
  selectedCount: 3,
  referenceAssetIds: ["user-1/a.png", "user-1/b.png"],
  sourceVersionId: "version-9",
};

test("executionPlanIdentityMatches accepts a stored plan with the same execution identity", () => {
  const stored = buildExecutionPlanJson({
    plan,
    selectedCount: 3,
    referenceAssetIds: ["user-1/b.png", "user-1/a.png"],
    sourceVersionId: "version-9",
    children: [{ label: "Scene 1", prompt: "x" }],
  });
  assert.equal(executionPlanIdentityMatches(stored, identity), true);
});

test("executionPlanIdentityMatches rejects a different reference set", () => {
  const stored = buildExecutionPlanJson({
    plan,
    selectedCount: 3,
    referenceAssetIds: ["user-1/other.png"],
    sourceVersionId: "version-9",
    children: [{ label: "Scene 1", prompt: "x" }],
  });
  assert.equal(executionPlanIdentityMatches(stored, identity), false);
});

test("executionPlanIdentityMatches rejects mismatched sourceVersionId, selectedCount, or plan fields", () => {
  const base = buildExecutionPlanJson({
    plan,
    selectedCount: 3,
    referenceAssetIds: identity.referenceAssetIds,
    sourceVersionId: "version-9",
    children: [{ label: "Scene 1", prompt: "x" }],
  });

  assert.equal(
    executionPlanIdentityMatches(
      { ...base, sourceVersionId: "version-other" },
      identity,
    ),
    false,
  );
  assert.equal(
    executionPlanIdentityMatches({ ...base, selectedCount: 2 }, identity),
    false,
  );
  assert.equal(
    executionPlanIdentityMatches(
      { ...base, plan: { ...plan, mode: "single" } },
      identity,
    ),
    false,
  );
  assert.equal(
    executionPlanIdentityMatches(
      { ...base, plan: { ...plan, desiredCount: 4 } },
      identity,
    ),
    false,
  );
  assert.equal(
    executionPlanIdentityMatches(
      { ...base, plan: { ...plan, autoCount: 2 } },
      identity,
    ),
    false,
  );
});

test("executionPlanIdentityMatches rejects malformed stored plan_json", () => {
  assert.equal(executionPlanIdentityMatches(null, identity), false);
  assert.equal(executionPlanIdentityMatches({}, identity), false);
  assert.equal(
    executionPlanIdentityMatches({ plan: { mode: "series" } }, identity),
    false,
  );
});
