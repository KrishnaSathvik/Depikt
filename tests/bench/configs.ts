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
const LUNA_WRITER: ModelConfig = {
  model: "gpt-5.6-luna",
  reasoningEffort: "none",
  temperature: 0.7,
  timeoutMs: T,
};
const TERRA_MEDIUM: ModelConfig = {
  model: "gpt-5.6-terra",
  reasoningEffort: "medium",
  timeoutMs: 180_000,
};

export const CONFIGS: Record<string, BenchConfig> = {
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
    model: LUNA_WRITER,
    note: "Phase 1 Luna candidate on the legacy engine",
  },
  // ---- Phase 2: old vs new, same model ----
  "legacy-luna": {
    label: "legacy-v2.9__builder-luna__critic-luna",
    engine: "legacy",
    api: "responses",
    model: LUNA_WRITER,
    note: "LEGACY engine + Luna (streaming, TTFT measured)",
  },
  "v3-luna": {
    label: "images-2.5-v3__intent-luna__builder-luna__critic-terra-medium",
    engine: "v3",
    model: LUNA_WRITER,
    intentModel: MODEL_ROLES.INTENT,
    criticModel: TERRA_MEDIUM,
    note: "NEW engine, production routing",
  },
  "legacy-critic-terra": {
    label: "legacy-v2.9__critic-terra-medium",
    engine: "legacy",
    api: "responses",
    model: TERRA_MEDIUM,
    pipeline: "critic",
    note: "LEGACY critic mode on Terra medium (critic cases only)",
  },
  "v3-critic-terra": {
    label: "images-2.5-v3__critic-terra-medium",
    engine: "v3",
    model: LUNA_WRITER,
    criticModel: TERRA_MEDIUM,
    pipeline: "critic",
    note: "NEW critic on Terra medium (critic cases only)",
  },
  // ---- reference-heavy writer comparison ----
  "v3-ref-luna": {
    label: "images-2.5-v3__reference__writer-luna",
    engine: "v3",
    model: LUNA_WRITER,
    tag: "reference",
    pipeline: "builder",
  },
  "v3-ref-terra": {
    label: "images-2.5-v3__reference__writer-terra-low",
    engine: "v3",
    model: MODEL_ROLES.BUILDER_REFERENCE_HEAVY,
    tag: "reference",
    pipeline: "builder",
    note: "Candidate only; not routed in production",
  },
};
