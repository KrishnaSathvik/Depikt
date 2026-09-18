import type { ResolvedEntity } from "./entities.ts";
import { extractStoredEntities } from "./stored-entities.ts";
export { extractStoredEntityReferencePaths } from "./stored-entities.ts";
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
  entities?: ResolvedEntity[];
  lockedEntityCount?: number;
  /** Flat telemetry/evidence fields — see vnext-1 design §6. */
  mode: GenerationPlan["mode"];
  desiredCount: number;
  autoCount: number;
  selectedCount: number;
  searchNeeded: boolean;
  childLabels: Array<string | null>;
  plan: GenerationPlan;
  referenceAssetIds: string[];
  sourceVersionId: string | null;
  maskAssetId: string | null;
  maskPath: string | null;
  children: ExecutionPlanChild[];
}

export function buildExecutionPlanJson(args: {
  entities?: ResolvedEntity[];
  plan: GenerationPlan;
  selectedCount: number;
  referenceAssetIds: string[];
  sourceVersionId: string | null;
  maskAssetId: string | null;
  maskPath: string | null;
  children: Array<{ label: string | null; prompt: string }>;
}): ExecutionPlanJson {
  const childLabels = args.children.map((c) => c.label);
  return {
    ...(args.entities?.length
      ? { entities: args.entities, lockedEntityCount: args.entities.length }
      : {}),
    mode: args.plan.mode,
    desiredCount: args.plan.desiredCount,
    autoCount: args.plan.autoCount,
    selectedCount: args.selectedCount,
    searchNeeded: args.plan.searchNeeded,
    childLabels,
    plan: args.plan,
    referenceAssetIds: args.referenceAssetIds,
    sourceVersionId: args.sourceVersionId,
    maskAssetId: args.maskAssetId,
    maskPath: args.maskPath,
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

/**
 * /run must never trust a client-supplied mask path — a stale or crafted
 * client could otherwise swap the signed mask. The only trusted source is
 * maskPath persisted on plan_json from the verified plan token. Missing or
 * malformed values (including request-shaped fields like `mask` / `path`)
 * degrade to no mask.
 */
export function extractStoredMaskPath(planJson: unknown): string | null {
  if (!planJson || typeof planJson !== "object") return null;
  const path = (planJson as { maskPath?: unknown }).maskPath;
  return typeof path === "string" && path.length > 0 ? path : null;
}

/** Fields that define whether a stored session may be reused for a new token. */
export interface ExecutionPlanIdentity {
  entities?: ResolvedEntity[];
  plan: Pick<GenerationPlan, "mode" | "desiredCount" | "autoCount">;
  selectedCount: number;
  referenceAssetIds: string[];
  sourceVersionId: string | null;
  maskAssetId: string | null;
  maskPath: string | null;
}

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  if (setA.size !== a.length) return false;
  for (const id of b) {
    if (!setA.has(id)) return false;
  }
  return true;
}

function parseStoredExecutionPlanIdentity(stored: unknown): ExecutionPlanIdentity | null {
  if (!stored || typeof stored !== "object") return null;
  const root = stored as Record<string, unknown>;
  const plan = root.plan;
  if (!plan || typeof plan !== "object") return null;
  const planFields = plan as Record<string, unknown>;
  if (typeof planFields.mode !== "string") return null;
  if (typeof planFields.desiredCount !== "number") return null;
  if (typeof planFields.autoCount !== "number") return null;
  if (typeof root.selectedCount !== "number") return null;
  const sourceVersionId = root.sourceVersionId ?? null;
  if (sourceVersionId !== null && typeof sourceVersionId !== "string") return null;
  const maskAssetId = root.maskAssetId ?? null;
  if (maskAssetId !== null && typeof maskAssetId !== "string") return null;
  const maskPath = root.maskPath ?? null;
  if (maskPath !== null && typeof maskPath !== "string") return null;

  return {
    plan: {
      mode: planFields.mode as GenerationPlan["mode"],
      desiredCount: planFields.desiredCount,
      autoCount: planFields.autoCount,
    },
    selectedCount: root.selectedCount,
    referenceAssetIds: extractStoredReferenceAssetIds(stored),
    sourceVersionId,
    maskAssetId,
    maskPath,
  };
}

/**
 * A zero-job session may only be reused when its immutable plan_json matches
 * the verified token that is trying to create jobs now.
 */
export function executionPlanIdentityMatches(
  stored: unknown,
  current: ExecutionPlanIdentity,
): boolean {
  let storedEntities: ResolvedEntity[];
  try {
    storedEntities = extractStoredEntities(stored);
  } catch {
    return false;
  }
  // JSONB may reorder object keys. Compare explicit values, retaining reference
  // order because the preamble binds identity to image positions.
  const identity = (entities: ResolvedEntity[]) =>
    entities.map((e) => [
      e.id,
      e.type,
      e.name,
      e.description,
      e.locked,
      e.resolvedReferences.map((r) => [r.assetId, r.role, r.path]),
    ]);
  if (JSON.stringify(identity(storedEntities)) !== JSON.stringify(identity(current.entities ?? [])))
    return false;
  const parsed = parseStoredExecutionPlanIdentity(stored);
  if (!parsed) return false;
  return (
    parsed.plan.mode === current.plan.mode &&
    parsed.plan.desiredCount === current.plan.desiredCount &&
    parsed.plan.autoCount === current.plan.autoCount &&
    parsed.selectedCount === current.selectedCount &&
    parsed.sourceVersionId === current.sourceVersionId &&
    parsed.maskAssetId === current.maskAssetId &&
    parsed.maskPath === current.maskPath &&
    sameStringSet(parsed.referenceAssetIds, current.referenceAssetIds)
  );
}
