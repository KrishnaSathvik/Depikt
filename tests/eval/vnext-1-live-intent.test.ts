import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeIntent } from "../../src/lib/prompt-engine/builder.ts";
import { buildGenerationPlan } from "../../src/lib/generation/plan.ts";
import { loadVnext1Cases } from "../image-evals/vnext-1/load-cases.ts";

const hasKey = Boolean(process.env.OPENAI_API_KEY);

test("release gate: live analyzeIntent → plan is 11/11", { skip: !hasKey }, async () => {
  const failures: string[] = [];
  for (const c of loadVnext1Cases()) {
    const { intent } = await analyzeIntent({
      apiKey: process.env.OPENAI_API_KEY!,
      userInput: c.prompt,
      mode: "default",
      referenceImageUrl: null,
    });
    const plan = buildGenerationPlan(intent, c.prompt);
    if (
      plan.mode !== c.expected.mode ||
      plan.desiredCount !== c.expected.desiredCount ||
      plan.searchNeeded !== c.expected.search_needed
    ) {
      failures.push(
        `${c.id}: got ${plan.mode}/${plan.desiredCount}/search=${plan.searchNeeded} expected ${c.expected.mode}/${c.expected.desiredCount}/search=${c.expected.search_needed}`,
      );
    }
  }
  assert.deepEqual(failures, []);
});
