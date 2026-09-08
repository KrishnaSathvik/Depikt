// Named benchmark configurations. Every configuration runs the SAME v2.9
// prompt engine behavior (system prompt, locks, examples, sanitizer); only the
// transport/model/sampling settings differ.

import type { ModelConfig } from "../../src/lib/openai/models.ts";

export interface BenchConfig {
  label: string;
  /** "chat" = legacy Chat Completions + forced tool call (true baseline). */
  api: "chat" | "responses";
  model: ModelConfig;
  /** Restrict to cases carrying this tag (e.g. "subset"). */
  tag?: string;
  note?: string;
}

const T = 90_000;

export const CONFIGS: Record<string, BenchConfig> = {
  baseline: {
    label: "v2.9__gpt-5.4-mini__chat-completions__temp-0.7",
    api: "chat",
    model: { model: "gpt-5.4-mini", temperature: 0.7, timeoutMs: T },
    note: "TRUE BASELINE: exact pre-migration route behavior",
  },
  "mini-responses": {
    label: "v2.9__gpt-5.4-mini__responses__temp-0.7",
    api: "responses",
    model: { model: "gpt-5.4-mini", temperature: 0.7, timeoutMs: T },
    note: "Same model through the new abstraction (transport comparison)",
  },
  "luna-none": {
    label: "v2.9__gpt-5.6-luna__responses__reasoning-none__no-temp",
    api: "responses",
    model: { model: "gpt-5.6-luna", reasoningEffort: "none", timeoutMs: T },
  },
  "luna-none-temp": {
    label: "v2.9__gpt-5.6-luna__responses__reasoning-none__temp-0.7",
    api: "responses",
    model: { model: "gpt-5.6-luna", reasoningEffort: "none", temperature: 0.7, timeoutMs: T },
    note: "Parameter compatibility probe",
  },
  "terra-none": {
    label: "v2.9__gpt-5.6-terra__responses__reasoning-none__no-temp",
    api: "responses",
    model: { model: "gpt-5.6-terra", reasoningEffort: "none", timeoutMs: T },
  },
  "terra-none-temp": {
    label: "v2.9__gpt-5.6-terra__responses__reasoning-none__temp-0.7",
    api: "responses",
    model: { model: "gpt-5.6-terra", reasoningEffort: "none", temperature: 0.7, timeoutMs: T },
    note: "Parameter compatibility probe",
  },
  "terra-medium-subset": {
    label: "v2.9__gpt-5.6-terra__responses__reasoning-medium__no-temp__subset",
    api: "responses",
    model: { model: "gpt-5.6-terra", reasoningEffort: "medium", timeoutMs: 180_000 },
    tag: "subset",
    note: "Critic candidate probe on the representative subset",
  },
  "astra-judge-smoke": {
    label: "v2.9__gpt-6-astra__responses__reasoning-low__subset",
    api: "responses",
    model: { model: "gpt-6-astra", reasoningEffort: "low", timeoutMs: 300_000 },
    tag: "subset",
    note: "Integration smoke only. Not a production candidate.",
  },
};
