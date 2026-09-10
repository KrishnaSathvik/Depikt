// Native image generation — model, quality, and credit configuration.
//
// Locked V1 decisions (2026-09-10, after the max-quality economics benchmark
// in research/images-2-5-community/runs/_fixtures/log.json, labels bench-*):
//
//   - Exactly two user-facing models: Flare (faster) and Sunburst (more
//     precise, ~2x the wall-clock latency of Flare at the same API cost).
//   - Server always requests quality "max". Never client-settable.
//   - 1 credit = 1 successful image operation, regardless of model or
//     operation. At max quality, Flare and Sunburst cost OpenAI the same
//     (~$0.211 generate, ~$0.222 edit); the ~$0.01 edit delta is absorbed
//     into plan economics rather than exposed as credit math. Credits are a
//     product abstraction — never equate them to OpenAI tokens or dollars.
//
// This file is the single source of truth for that mapping. Nothing else
// in the generation surface should hardcode a model id, a quality value, or
// a credit number.

export type ModelAlias = "flare" | "sunburst";
export type GenerationOperation = "generate" | "edit";

/** The only two aliases the client may submit. Anything else is rejected server-side. */
export const MODEL_ALIASES: readonly ModelAlias[] = ["flare", "sunburst"];

export const DEFAULT_MODEL_ALIAS: ModelAlias = "flare";

/** Alias → real OpenAI model id. The client never sends the real id. */
const MODEL_IDS: Record<ModelAlias, string> = {
  flare: "gpt-image-2.5-flare",
  sunburst: "gpt-image-2.5-sunburst",
};

/** Server-injected quality. Not derived from any client input. */
export const GENERATION_QUALITY = "max" as const;

export function isModelAlias(value: unknown): value is ModelAlias {
  return typeof value === "string" && (MODEL_ALIASES as readonly string[]).includes(value);
}

/** Throws on an unknown alias — callers should validate with isModelAlias first for a soft path. */
export function resolveModelId(alias: ModelAlias): string {
  const id = MODEL_IDS[alias];
  if (!id) throw new Error(`Unknown model alias: ${alias}`);
  return id;
}

export const MODEL_COPY: Record<ModelAlias, { title: string; tagline: string }> = {
  flare: { title: "Flare", tagline: "Faster" },
  sunburst: { title: "Sunburst", tagline: "More precise" },
};

// ---------- credits ----------
//
// Flat by design: 1 credit per successful generate, edit, or regenerate,
// on either model. Do not branch this by model or by size — that reopens
// the token-like complexity the benchmark showed users shouldn't see.
const CREDIT_COST_PER_OPERATION = 1;

export function creditCostFor(_operation: GenerationOperation, _model?: ModelAlias): number {
  return CREDIT_COST_PER_OPERATION;
}

// ---------- V1 product limits (not OpenAI API limits) ----------
//
// Depikt's own ceiling for references per edit request in V1. OpenAI's
// documented example uses up to 4 images without stating a hard maximum;
// this is our product choice, and copy referencing it must say "Depikt's
// V1 limit," not "OpenAI's limit."
export const MAX_REFERENCE_IMAGES_V1 = 4;
