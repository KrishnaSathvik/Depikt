// Strict result contracts for the Images 2.5 engine (v3).
//
// The Prompt Writer never emits `category`; the Intent object is authoritative
// and the server attaches category + intent to the result. The Critic has its
// own contract with per-dimension scores; the overall score is computed in
// code (see critic.ts).

import { z } from "zod";
import type { ResultContract } from "../openai/schemas.ts";
import { CATEGORY_IDS } from "./categories.ts";

/**
 * zod → JSON Schema that satisfies OpenAI strict mode:
 * additionalProperties:false and all-required come from strictObject;
 * nullable unions are rewritten from anyOf[{type:X},{type:null}] to type:[X,"null"].
 */
export function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete json["$schema"];
  return collapseNullables(json) as Record<string, unknown>;
}

function collapseNullables(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(collapseNullables);
  if (!node || typeof node !== "object") return node;
  const obj = { ...(node as Record<string, unknown>) };
  const anyOf = obj.anyOf as Array<Record<string, unknown>> | undefined;
  if (anyOf && anyOf.length === 2) {
    const nul = anyOf.find((a) => a.type === "null");
    const other = anyOf.find((a) => a.type !== "null");
    if (nul && other && typeof other.type === "string") {
      delete obj.anyOf;
      const merged = { ...other, type: [other.type, "null"] };
      return collapseNullables({ ...obj, ...merged });
    }
  }
  for (const k of Object.keys(obj)) obj[k] = collapseNullables(obj[k]);
  return obj;
}

// ---------- Builder writer outputs (no category: intent is authoritative) ----------

export const WriterDefaultResult = z.strictObject({
  prompt: z.string(),
  why_it_works: z.string(),
});
export const WriterBatchResult = z.strictObject({
  prompts: z.array(z.string()),
  why_it_works: z.string(),
});
export const WriterJsonResult = z.strictObject({
  prompt: z.string(),
  size: z.string(),
  quality: z.string(),
  aspect_ratio: z.string(),
  why_it_works: z.string(),
});

function contract<T>(name: string, schema: z.ZodType<T>): ResultContract<T> {
  return { pipeline: "builder", name, zod: schema, jsonSchema: toStrictJsonSchema(schema) };
}

export const WRITER_CONTRACTS = {
  default: contract("depikt_writer_default_v3", WriterDefaultResult),
  BATCH: contract("depikt_writer_batch_v3", WriterBatchResult),
  JSON: contract("depikt_writer_json_v3", WriterJsonResult),
} as const;
export type WriterMode = keyof typeof WRITER_CONTRACTS;

export function isWriterMode(m: string): m is WriterMode {
  return m in WRITER_CONTRACTS;
}

// ---------- Critic output ----------

export const CRITIC_CORE_IDS = [
  "intent_fidelity",
  "clarity",
  "contradictions",
  "efficiency",
] as const;
export const CRITIC_CONDITIONAL_IDS = [
  "composition_control",
  "reference_handling",
  "edit_preservation",
  "text_layout",
  "style_coherence",
  "factual_integrity",
] as const;
export const CRITIC_DIMENSION_IDS = [...CRITIC_CORE_IDS, ...CRITIC_CONDITIONAL_IDS] as const;
export type CriticDimensionId = (typeof CRITIC_DIMENSION_IDS)[number];

/** Normalized per-dimension record used by the UI, history, and scoring. */
export const CriticDimension = z.strictObject({
  id: z.enum(CRITIC_DIMENSION_IDS),
  applicable: z.boolean(),
  score: z.union([z.number(), z.null()]),
  reason: z.string(),
});
export type CriticDimension = z.infer<typeof CriticDimension>;

const Scored = z.strictObject({ score: z.number(), reason: z.string() });

/**
 * What the model returns. Core dimensions are structurally required (the
 * model cannot mark them non-applicable); conditional ones carry an
 * applicability flag.
 */
export const CriticModelResult = z.strictObject({
  category: z.enum(CATEGORY_IDS),
  summary: z.string(),
  core: z.strictObject({
    intent_fidelity: Scored,
    clarity: Scored,
    contradictions: Scored,
    efficiency: Scored,
  }),
  conditional: z.array(
    z.strictObject({
      id: z.enum(CRITIC_CONDITIONAL_IDS),
      applicable: z.boolean(),
      score: z.union([z.number(), z.null()]),
      reason: z.string(),
    }),
  ),
  weaknesses: z.array(z.string()),
  improvements: z.array(z.string()),
  rewritten_prompt: z.string(),
});
export type CriticModelResult = z.infer<typeof CriticModelResult>;

export const CRITIC_CONTRACT: ResultContract<CriticModelResult> = {
  pipeline: "critic",
  name: "depikt_critic_v3_1",
  zod: CriticModelResult as z.ZodType<CriticModelResult>,
  jsonSchema: toStrictJsonSchema(CriticModelResult),
};
