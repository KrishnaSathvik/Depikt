// Central OpenAI model configuration.
//
// Every model ID, price, and per-role request setting lives here so the route,
// the benchmark harness, and future pipelines share one source of truth.
// Prices verified against developers.openai.com on 2026-09-08 (USD per 1M tokens).

export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

export interface ModelSpec {
  id: string;
  /** Human label for tables. */
  label: string;
  /** USD per 1M tokens. `cachedInput` is null when the docs don't list it. */
  pricing: { input: number; cachedInput: number | null; output: number };
  /** Reasoning effort values the model accepts. */
  reasoningEfforts: ReasoningEffort[];
  /** Whether the API accepts a custom `temperature` for this model. */
  supportsTemperature: boolean;
  /** Whether image inputs are accepted. */
  supportsImageInput: boolean;
}

export const MODELS = {
  "gpt-5.4-mini": {
    id: "gpt-5.4-mini",
    label: "GPT-5.4 mini",
    pricing: { input: 0.75, cachedInput: 0.075, output: 4.5 },
    reasoningEfforts: ["none", "low", "medium", "high", "xhigh"],
    supportsTemperature: true,
    supportsImageInput: true,
  },
  "gpt-5.6-luna": {
    id: "gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    pricing: { input: 0.2, cachedInput: 0.02, output: 1.2 },
    reasoningEfforts: ["none", "low", "medium", "high", "xhigh", "max"],
    // Unverified for reasoning models — the Phase 1 benchmark matrix tests this
    // explicitly. Kept `true` so the harness can attempt it; production roles
    // omit temperature for 5.6 models.
    supportsTemperature: true,
    supportsImageInput: true,
  },
  "gpt-5.6-terra": {
    id: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    pricing: { input: 2, cachedInput: 0.2, output: 12 },
    reasoningEfforts: ["none", "low", "medium", "high", "xhigh", "max"],
    supportsTemperature: true,
    supportsImageInput: true,
  },
  "gpt-6-astra": {
    id: "gpt-6-astra",
    label: "GPT-6 Astra",
    pricing: { input: 10, cachedInput: 1, output: 50 },
    // Docs: `none` returns HTTP 400; custom temperature/top_p are not supported.
    reasoningEfforts: ["minimal", "low", "medium", "high", "xhigh", "max"],
    supportsTemperature: false,
    supportsImageInput: true,
  },
} as const satisfies Record<string, ModelSpec>;

export type ModelId = keyof typeof MODELS;

export function getModelSpec(id: string): ModelSpec {
  const spec = (MODELS as Record<string, ModelSpec>)[id];
  if (!spec) throw new Error(`Unknown model id: ${id}`);
  return spec;
}

/** Request-shaping settings for one model call. */
export interface ModelConfig {
  model: ModelId;
  reasoningEffort?: ReasoningEffort;
  /** Omit (undefined) to let the API use its default. */
  temperature?: number;
  maxOutputTokens?: number;
  /** Per-attempt timeout in ms. */
  timeoutMs: number;
}

/**
 * Conceptual roles. Phase 1 keeps production on the pre-migration model
 * (gpt-5.4-mini, temperature 0.7) so the public route behaves exactly as
 * before. The other roles exist so later phases can route without editing
 * the route file; the benchmark decides their final values.
 */
export type ModelRole =
  | "INTENT"
  | "BUILDER_DEFAULT"
  | "BUILDER_REFERENCE_HEAVY"
  | "CRITIC"
  | "BENCHMARK_JUDGE";

/**
 * Production routing after Phase 2 (chosen from the Phase 1 benchmark):
 * - INTENT and BUILDER_DEFAULT: gpt-5.6-luna, reasoning none (temperature 0.7 for the writer).
 * - CRITIC: gpt-5.6-terra, reasoning medium, no temperature.
 * - BUILDER_REFERENCE_HEAVY: Terra candidate, benchmarked in Phase 2 but not routed by default.
 * - BENCHMARK_JUDGE: GPT-6 Astra, offline evaluation only, never used by a public route.
 */
export const MODEL_ROLES: Record<ModelRole, ModelConfig> = {
  INTENT: {
    model: "gpt-5.6-luna",
    reasoningEffort: "none",
    maxOutputTokens: 900,
    timeoutMs: 45_000,
  },
  BUILDER_DEFAULT: {
    model: "gpt-5.6-luna",
    reasoningEffort: "none",
    temperature: 0.7,
    timeoutMs: 90_000,
  },
  BUILDER_REFERENCE_HEAVY: { model: "gpt-5.6-terra", reasoningEffort: "low", timeoutMs: 120_000 },
  CRITIC: { model: "gpt-5.6-terra", reasoningEffort: "medium", timeoutMs: 150_000 },
  BENCHMARK_JUDGE: { model: "gpt-6-astra", reasoningEffort: "medium", timeoutMs: 300_000 },
};

/** Token usage in the shape the Responses API reports. */
export interface TokenUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
}

/** Estimated USD cost for one request. Output price covers reasoning tokens too. */
export function estimateCostUsd(modelId: string, usage: TokenUsage): number {
  const { pricing } = getModelSpec(modelId);
  const cachedRate = pricing.cachedInput ?? pricing.input;
  const uncached = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  return (
    (uncached * pricing.input +
      usage.cachedInputTokens * cachedRate +
      usage.outputTokens * pricing.output) /
    1_000_000
  );
}

/**
 * Decide which sampling/reasoning fields to send. Pure so it can be tested:
 * - temperature is omitted when the model doesn't accept it or none is given
 * - reasoning is omitted when not requested, and rejected when unsupported
 */
export function resolveRequestParams(config: ModelConfig): {
  temperature?: number;
  reasoning?: { effort: ReasoningEffort };
  max_output_tokens?: number;
} {
  const spec = getModelSpec(config.model);
  const out: ReturnType<typeof resolveRequestParams> = {};
  // Verified 2026-09-08: the API rejects `temperature` on 5.6 models whenever
  // reasoning is active (effort other than "none"). Send it only when the
  // model supports it AND reasoning is off.
  const reasoningOff = config.reasoningEffort === undefined || config.reasoningEffort === "none";
  if (config.temperature !== undefined && spec.supportsTemperature && reasoningOff) {
    out.temperature = config.temperature;
  }
  if (config.reasoningEffort !== undefined) {
    if (!spec.reasoningEfforts.includes(config.reasoningEffort)) {
      throw new Error(
        `Model ${config.model} does not support reasoning.effort=${config.reasoningEffort}`,
      );
    }
    out.reasoning = { effort: config.reasoningEffort };
  }
  if (config.maxOutputTokens !== undefined) out.max_output_tokens = config.maxOutputTokens;
  return out;
}
