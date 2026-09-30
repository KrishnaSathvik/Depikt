// Named benchmark configurations.
//
// engine "legacy" = frozen v2.9 prompt + v2.9 request construction (regex
// locks, random curated examples, loose contracts). engine "v3" = the Images
// 2.5 pipeline (intent analyzer → playbook → writer; separate critic).
// Every config runs both pipelines' cases unless filtered with --pipeline.

import type { ModelConfig } from "../../src/lib/openai/models.ts";
import { MODEL_ROLES } from "../../src/lib/openai/models.ts";

export interface BenchConfig {
  label: string;
  engine: "legacy" | "v3";
  /** Legacy only: "chat" replicates the pre-migration Chat Completions call. */
  api?: "chat" | "responses";
  /** Legacy: the single model. v3: the writer model. */
  model: ModelConfig;
  /** v3 only: intent analyzer model (defaults to MODEL_ROLES.INTENT). */
  intentModel?: ModelConfig;
  /** v3 only: critic model (defaults to MODEL_ROLES.CRITIC). Legacy critic uses `model`. */
  criticModel?: ModelConfig;
  tag?: string;
  pipeline?: "builder" | "critic";
  note?: string;
}

const T = 90_000;
/** Historical Phase 1/2 writer pin. Prefer MODEL_ROLES for current production. */
const HISTORICAL_LUNA_56_WRITER: ModelConfig = {
  model: "gpt-5.6-luna",
  reasoningEffort: "none",
  temperature: 0.7,
  timeoutMs: T,
};
/** Historical Phase 2 critic pin. Prefer MODEL_ROLES.CRITIC for current production. */
const HISTORICAL_TERRA_56_MEDIUM: ModelConfig = {
  model: "gpt-5.6-terra",
  reasoningEffort: "medium",
  timeoutMs: 180_000,
};

export const CONFIGS: Record<string, BenchConfig> = {
  // ---- Current production (follows MODEL_ROLES) ----
  "v3-production": {
    label: "images-2.5-v3__intent-gpt-6-luna__builder-gpt-6-luna__critic-gpt-6.1-sol-medium",
    engine: "v3",
    model: MODEL_ROLES.BUILDER_DEFAULT,
    intentModel: MODEL_ROLES.INTENT,
    criticModel: MODEL_ROLES.CRITIC,
    note: "Current production text routing: GPT-6 Luna intent/writer, GPT-6.1 Sol critic",
  },
  // ---- Phase 1 configs (kept reproducible) ----
  baseline: {
    label: "v2.9__gpt-5.4-mini__chat-completions__temp-0.7",
    engine: "legacy",
    api: "chat",
    model: { model: "gpt-5.4-mini", temperature: 0.7, timeoutMs: T },
    note: "Pre-migration route behavior (Chat Completions, loose tool)",
  },
  "luna-none-temp": {
    label: "v2.9__gpt-5.6-luna__responses__reasoning-none__temp-0.7",
    engine: "legacy",
    api: "responses",
    model: HISTORICAL_LUNA_56_WRITER,
    note: "Historical Phase 1: gpt-5.6-luna on the legacy engine",
  },
  // ---- Phase 2: old vs new, same model ----
  "legacy-luna": {
    label: "legacy-v2.9__builder-luna__critic-luna",
    engine: "legacy",
    api: "responses",
    model: HISTORICAL_LUNA_56_WRITER,
    note: "Historical: LEGACY engine + gpt-5.6-luna",
  },
  "v3-luna": {
    label: "images-2.5-v3__intent-luna__builder-luna__critic-terra-medium",
    engine: "v3",
    model: HISTORICAL_LUNA_56_WRITER,
    intentModel: HISTORICAL_LUNA_56_WRITER,
    criticModel: HISTORICAL_TERRA_56_MEDIUM,
    note: "Historical Phase 2 mix: gpt-5.6-luna writer + gpt-5.6-terra critic. Use v3-production for current routing.",
  },
  "legacy-critic-terra": {
    label: "legacy-v2.9__critic-terra-medium",
    engine: "legacy",
    api: "responses",
    model: HISTORICAL_TERRA_56_MEDIUM,
    pipeline: "critic",
    note: "Historical: LEGACY critic on gpt-5.6-terra medium",
  },
  "v3-critic-terra": {
    label: "images-2.5-v3__critic-terra-medium",
    engine: "v3",
    model: HISTORICAL_LUNA_56_WRITER,
    criticModel: HISTORICAL_TERRA_56_MEDIUM,
    pipeline: "critic",
    note: "Historical: v3 critic on gpt-5.6-terra medium",
  },
  // ---- reference-heavy writer comparison ----
  "v3-ref-luna": {
    label: "images-2.5-v3__reference__writer-luna",
    engine: "v3",
    model: HISTORICAL_LUNA_56_WRITER,
    tag: "reference",
    pipeline: "builder",
    note: "Historical Phase 2 reference writer on gpt-5.6-luna",
  },
  "v3-ref-terra": {
    label: "images-2.5-v3__reference__writer-terra-low",
    engine: "v3",
    model: { model: "gpt-5.6-terra", reasoningEffort: "low", timeoutMs: 120_000 },
    tag: "reference",
    pipeline: "builder",
    note: "Historical Phase 2 Terra candidate. Production reference-heavy routing uses GPT-6.1 Sol.",
  },
};
