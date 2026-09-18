// VNext 1 Task 10 — generation_planned / series telemetry. Source-read only.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(import.meta.dirname, "../..", rel), "utf8");
}

test("generation_planned fires after /plans with plan fields and source, never prompt text", () => {
  const hook = read("src/lib/generation/use-generation.ts");
  const submitFn = hook.slice(
    hook.indexOf("async function submit"),
    hook.indexOf("// Re-upload any references"),
  );

  assert.match(submitFn, /await createGenerationPlan\(/);
  assert.match(submitFn, /trackEvent\("generation_planned", \{/);
  assert.match(submitFn, /mode: planRes\.plan\.mode/);
  assert.match(submitFn, /desiredCount: planRes\.plan\.desiredCount/);
  assert.match(submitFn, /autoCount: planRes\.plan\.autoCount/);
  assert.match(submitFn, /searchNeeded: planRes\.plan\.searchNeeded/);
  assert.match(submitFn, /requiresCountConfirmation: planRes\.plan\.requiresCountConfirmation/);
  assert.match(submitFn, /source: effectiveSourceContext\.type/);
  assert.equal(
    /prompt:/.test(submitFn.match(/trackEvent\("generation_planned"[\s\S]*?\}\);/)?.[0] ?? ""),
    false,
  );
});

test("generation_series_started fires when createGenerationJobs returns multiple jobs", () => {
  const hook = read("src/lib/generation/use-generation.ts");
  const executePlanFn = hook.slice(
    hook.indexOf("async function executePlan"),
    hook.indexOf("/**\n   * The user picked a count"),
  );

  assert.match(executePlanFn, /if \(res\.jobs\.length > 1\) \{/);
  assert.match(executePlanFn, /trackEvent\("generation_series_started", \{ selectedCount \}\)/);
});

test("generation_series_child_done fires once per child on succeeded/failed transition during poll", () => {
  const hook = read("src/lib/generation/use-generation.ts");
  const pollFn = hook.slice(
    hook.indexOf("function pollSession"),
    hook.indexOf("async function submit"),
  );

  assert.match(pollFn, /pollChildStatusRef/);
  assert.match(pollFn, /pollBaselineRef/);
  assert.match(pollFn, /trackEvent\("generation_series_child_done", \{/);
  assert.match(pollFn, /index: child\.index/);
  assert.match(pollFn, /success: child\.status === "succeeded"/);
  assert.match(pollFn, /!isTerminalStatus\(prev\)/);
  assert.match(pollFn, /child\.status === "succeeded" \|\| child\.status === "failed"/);
  assert.doesNotMatch(pollFn, /isTerminalStatus\(child\.status\)/);
  assert.match(pollFn, /detailed\.length > 1/);
});

test("fresh submissions seed poll baseline from /jobs queued jobs; resume seeds on first poll", () => {
  const hook = read("src/lib/generation/use-generation.ts");
  const pollFn = hook.slice(
    hook.indexOf("function pollSession"),
    hook.indexOf("async function submit"),
  );
  const executePlanFn = hook.slice(
    hook.indexOf("async function executePlan"),
    hook.indexOf("/**\n   * The user picked a count"),
  );

  assert.match(pollFn, /queuedJobs\?: Array<\{ id: string \}>/);
  assert.match(pollFn, /pollChildStatusRef\.current\.set\(child\.id, "queued"\)/);
  assert.match(pollFn, /seeded: true/);
  assert.match(pollFn, /seeded: false/);
  assert.match(executePlanFn, /pollSession\(res\.sessionId, res\.jobs\)/);
  assert.match(
    hook,
    /if \(sessionId\) pollSession\(sessionId\);/,
    "resume omits queuedJobs so first poll seeds without emitting",
  );
});

test("jobs route persists plan_json with telemetry fields via buildExecutionPlanJson", () => {
  const route = read("src/routes/api/generation/jobs.ts");
  const executionPlan = read("src/lib/generation/execution-plan.ts");

  assert.match(route, /buildExecutionPlanJson\(/);
  assert.match(route, /plan_json: signedExecutionPlan/);
  assert.match(route, /authorizeExecution\(executionPlan,/);
  assert.match(executionPlan, /mode: args\.plan\.mode/);
  assert.match(executionPlan, /desiredCount: args\.plan\.desiredCount/);
  assert.match(executionPlan, /autoCount: args\.plan\.autoCount/);
  assert.match(executionPlan, /searchNeeded: args\.plan\.searchNeeded/);
  assert.match(executionPlan, /childLabels/);
  assert.match(executionPlan, /referenceAssetIds: args\.referenceAssetIds/);
});
