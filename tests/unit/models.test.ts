import { test } from "node:test";
import assert from "node:assert/strict";
import { MODELS, MODEL_ROLES, estimateCostUsd, getModelSpec, resolveRequestParams } from "../../src/lib/openai/models.ts";

test("model ids are centralized and roles reference known models", () => {
  for (const role of Object.values(MODEL_ROLES)) {
    assert.ok(MODELS[role.model], `role model ${role.model} must exist in MODELS`);
    assert.ok(role.timeoutMs > 0);
  }
  assert.equal(MODEL_ROLES.BUILDER_DEFAULT.model, "gpt-5.4-mini");
  assert.equal(MODEL_ROLES.BUILDER_DEFAULT.temperature, 0.7);
  assert.equal(MODEL_ROLES.BENCHMARK_JUDGE.model, "gpt-6-astra");
});

test("temperature is sent only when the model supports it", () => {
  assert.deepEqual(resolveRequestParams({ model: "gpt-5.4-mini", temperature: 0.7, timeoutMs: 1 }), { temperature: 0.7 });
  assert.deepEqual(resolveRequestParams({ model: "gpt-5.4-mini", timeoutMs: 1 }), {});
  // Astra rejects custom temperature: it must be omitted, not sent.
  assert.deepEqual(resolveRequestParams({ model: "gpt-6-astra", temperature: 0.7, reasoningEffort: "high", timeoutMs: 1 }), {
    reasoning: { effort: "high" },
  });
});

test("reasoning effort is validated per model", () => {
  assert.deepEqual(resolveRequestParams({ model: "gpt-5.6-luna", reasoningEffort: "none", timeoutMs: 1 }), {
    reasoning: { effort: "none" },
  });
  assert.throws(() => resolveRequestParams({ model: "gpt-6-astra", reasoningEffort: "none", timeoutMs: 1 }), /does not support/);
  assert.deepEqual(resolveRequestParams({ model: "gpt-5.6-terra", reasoningEffort: "medium", maxOutputTokens: 500, timeoutMs: 1 }), {
    reasoning: { effort: "medium" },
    max_output_tokens: 500,
  });
});

test("cost estimate uses cached-input pricing and counts output tokens", () => {
  const usd = estimateCostUsd("gpt-5.6-terra", { inputTokens: 1_000_000, cachedInputTokens: 500_000, outputTokens: 100_000, reasoningTokens: 0 });
  // 500k uncached * $2 + 500k cached * $0.2 + 100k * $12 = 1 + 0.1 + 1.2
  assert.ok(Math.abs(usd - 2.3) < 1e-9, String(usd));
  assert.throws(() => getModelSpec("gpt-nope"), /Unknown model/);
});
