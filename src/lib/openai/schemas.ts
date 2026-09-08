// Strict result contracts for the two pipelines.
//
// Prompt Builder and Prompt Critic get SEPARATE schemas. There is no shared
// "everything optional" object. Builder has a small schema family keyed by
// its internal mode (default / BATCH / JSON). Each schema is exported both as
// a zod validator (server + tests) and as strict JSON Schema for the
// Responses API `text.format`.

import { z } from "zod";

export type Pipeline = "builder" | "critic";
export type BuilderMode = "default" | "BATCH" | "JSON";

// ---------- Builder ----------

export const BuilderDefaultResult = z.strictObject({
  prompt: z.string(),
  category: z.string(),
  why_it_works: z.string(),
});
export type BuilderDefaultResult = z.infer<typeof BuilderDefaultResult>;

export const BuilderBatchResult = z.strictObject({
  prompts: z.array(z.string()),
  category: z.string(),
  why_it_works: z.string(),
});
export type BuilderBatchResult = z.infer<typeof BuilderBatchResult>;

export const BuilderJsonResult = z.strictObject({
  prompt: z.string(),
  category: z.string(),
  size: z.string(),
  quality: z.string(),
  aspect_ratio: z.string(),
  why_it_works: z.string(),
});
export type BuilderJsonResult = z.infer<typeof BuilderJsonResult>;

export type BuilderResult = BuilderDefaultResult | BuilderBatchResult | BuilderJsonResult;

// ---------- Critic ----------

export const CriticResult = z.strictObject({
  score: z.number(),
  weaknesses: z.array(z.string()),
  improvements: z.array(z.string()),
  category: z.string(),
  rewritten_prompt: z.string(),
});
export type CriticResult = z.infer<typeof CriticResult>;

// ---------- Selection ----------

export interface ResultContract<T = unknown> {
  pipeline: Pipeline;
  /** Schema name sent to the API (must be a simple identifier). */
  name: string;
  zod: z.ZodType<T>;
  jsonSchema: Record<string, unknown>;
}

function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete json["$schema"];
  return json;
}

function contract<T>(pipeline: Pipeline, name: string, schema: z.ZodType<T>): ResultContract<T> {
  return { pipeline, name, zod: schema, jsonSchema: toStrictJsonSchema(schema) };
}

export const CONTRACTS = {
  builder_default: contract("builder", "depikt_builder_default", BuilderDefaultResult),
  builder_batch: contract("builder", "depikt_builder_batch", BuilderBatchResult),
  builder_json: contract("builder", "depikt_builder_json", BuilderJsonResult),
  critic: contract("critic", "depikt_critic", CriticResult),
} as const;

export type ContractKey = keyof typeof CONTRACTS;

/**
 * Map the public API `mode` string onto a contract. CRITIQUE is the Critic
 * pipeline; everything else is a Builder mode.
 */
export function selectContract(mode: string): ResultContract {
  switch (mode) {
    case "CRITIQUE":
      return CONTRACTS.critic;
    case "BATCH":
      return CONTRACTS.builder_batch;
    case "JSON":
      return CONTRACTS.builder_json;
    case "default":
      return CONTRACTS.builder_default;
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }
}

export interface ValidationOk<T> {
  ok: true;
  value: T;
}
export interface ValidationFail {
  ok: false;
  error: string;
}

/** Parse raw model text against a contract. Never throws. */
export function parseResult<T>(contract: ResultContract<T>, rawText: string): ValidationOk<T> | ValidationFail {
  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch (e) {
    return { ok: false, error: `invalid JSON: ${(e as Error).message}` };
  }
  const res = contract.zod.safeParse(json);
  if (!res.success) {
    return { ok: false, error: `schema mismatch (${contract.name}): ${res.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}` };
  }
  return { ok: true, value: res.data };
}

/** Build the Responses API `text.format` block for a contract. */
export function textFormatFor(contract: ResultContract): {
  type: "json_schema";
  name: string;
  schema: Record<string, unknown>;
  strict: true;
} {
  return { type: "json_schema", name: contract.name, schema: contract.jsonSchema, strict: true };
}
