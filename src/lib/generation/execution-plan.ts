// Native image generation — what a generation_sessions row's `plan_json`
// actually stores.
//
// jobs.ts previously stored only the raw display plan (`payload.plan`),
// which is not enough to safely execute or resume a session: /run needs
// the reference-image storage paths the signed plan token carried (see
// jobs.$id.run.ts), and a future resume needs to know how many children
// were confirmed and what they were labeled. Prompts themselves are
// deliberately NOT stored here in full -- only their length -- so this
// column never becomes an unbounded, duplicate copy of user content.

import type { GenerationPlan } from "./plan.ts";

export interface ExecutionPlanChild {
  label: string | null;
  promptLength: number;
}

export interface ExecutionPlanJson {
  plan: GenerationPlan;
  selectedCount: number;
  referenceAssetIds: string[];
  sourceVersionId: string | null;
  children: ExecutionPlanChild[];
}

export function buildExecutionPlanJson(args: {
  plan: GenerationPlan;
  selectedCount: number;
  referenceAssetIds: string[];
  sourceVersionId: string | null;
  children: Array<{ label: string | null; prompt: string }>;
}): ExecutionPlanJson {
  return {
    plan: args.plan,
    selectedCount: args.selectedCount,
    referenceAssetIds: args.referenceAssetIds,
    sourceVersionId: args.sourceVersionId,
    children: args.children.map((c) => ({ label: c.label, promptLength: c.prompt.length })),
  };
}

/**
 * /run must never trust a client-supplied `referencePaths` body -- a stale
 * or crafted client could otherwise ask the server to download and attach
 * some other path as a "reference". The only trusted source is the
 * reference list the signed plan token carried at job-creation time,
 * persisted here by jobs.ts. Anything else in `plan_json` (or a malformed/
 * missing column, e.g. a pre-migration session) degrades to no references,
 * matching a plain generate.
 */
export function extractStoredReferenceAssetIds(planJson: unknown): string[] {
  if (!planJson || typeof planJson !== "object") return [];
  const ids = (planJson as { referenceAssetIds?: unknown }).referenceAssetIds;
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is string => typeof id === "string");
}
