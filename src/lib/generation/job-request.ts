// Native image generation — server-side request validation.
//
// The client may submit only these fields. Everything security-sensitive
// (real OpenAI model id, quality, credit cost, storage path, user id) is
// derived server-side and is never accepted from the request body — see
// models.ts and aspect-ratio.ts. As of the Image Model Router, `model` is
// no longer a client-submitted field at all: the client never asks the
// user to choose Flare or Sunburst, so there's nothing to validate or
// trust there — see model-router.ts.
//
// As of the plan-token cutover (Depikt VNext 1), the browser never submits
// an executable plan: POST /plans turns a prompt (+ optional pre-computed
// intent) into a signed, opaque planToken; POST /jobs accepts only that
// token plus an optional selectedCount for series confirmation. There is no
// client-submitted `operation`, `mode`, `count`, `children`, or raw `plan`
// object anywhere in this file — see plan.ts and plan-token.ts.

import {
  MAX_ADHOC_REFERENCE_IMAGES as MAX_REFERENCE_IMAGES_V1,
  MAX_ATTACHED_ENTITIES,
  UUID_RE,
} from "./entities.ts";

export type SourceContextType =
  | "direct"
  | "library"
  | "gallery"
  | "prompt_build"
  | "prompt_critique"
  | "template";

export const SOURCE_CONTEXT_TYPES: readonly SourceContextType[] = [
  "direct",
  "library",
  "gallery",
  "prompt_build",
  "prompt_critique",
  "template",
];

export const MAX_PROMPT_CHARS = 4000;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

interface ParsedSourceContext {
  sourceContextType: SourceContextType;
  sourceContextId: string | null;
}

/** Shared by both request bodies below: `{ type, id? }`, defaulting to "direct". */
function parseSourceContext(value: unknown): ParsedSourceContext | { error: string } {
  if (value === undefined || value === null) {
    return { sourceContextType: "direct", sourceContextId: null };
  }
  if (typeof value !== "object") return { error: "sourceContext must be an object" };
  const sc = value as Record<string, unknown>;
  if (!SOURCE_CONTEXT_TYPES.includes(sc.type as SourceContextType)) {
    return { error: "sourceContext.type is invalid" };
  }
  return {
    sourceContextType: sc.type as SourceContextType,
    sourceContextId: isNonEmptyString(sc.id) ? sc.id : null,
  };
}

// ---------- POST /api/generation/plans ----------

export interface ValidatedCreatePlanRequest {
  refreshGrounding: boolean;
  /** The final, ready-to-render prompt (a direct /generate submission, or Build/Critique's finished output). */
  prompt: string;
  /** The original human request, when different from `prompt` (Build/Critique). Series decomposition must use this — see decompose-series.ts. */
  userInput: string | null;
  /** Pre-computed Intent from Build/Critique, when available. Unvalidated here — the route parses it with IntentSchema. */
  intent: unknown;
  entityIds: string[];
  referenceAssetIds: string[];
  sourceVersionId: string | null;
  /** Server-issued mask asset id from POST /masks. Never a storage path. */
  maskAssetId: string | null;
  sourceContextType: SourceContextType;
  sourceContextId: string | null;
  structuredAspectRatio: string | null;
}

export type CreatePlanValidationResult =
  | { ok: true; request: ValidatedCreatePlanRequest }
  | { ok: false; error: string };

/**
 * Validates a raw, untrusted request body for POST /api/generation/plans.
 * This is the only route that ever sees a free-form prompt/intent — its
 * whole job is to turn that into an opaque, signed plan the browser cannot
 * forge or edit. See plans.ts.
 */
export function validateCreatePlanBody(body: unknown): CreatePlanValidationResult {
  if (typeof body !== "object" || body === null)
    return { ok: false, error: "Invalid request body" };
  const b = body as Record<string, unknown>;

  if (
    [
      "validation",
      "repair",
      "repairPolicy",
      "grounding",
      "facts",
      "sources",
      "visualReferences",
      "groundingPlan",
    ].some((k) => k in b)
  )
    return { ok: false, error: "Grounding is resolved by the server" };
  if (b.refreshGrounding !== undefined && typeof b.refreshGrounding !== "boolean")
    return { ok: false, error: "refreshGrounding must be a boolean" };

  // The browser may submit a server-issued maskAssetId, never a raw storage
  // path — /plans derives maskPath server-side. See storage-paths.ts.
  if ("maskPath" in b || "mask" in b) {
    return { ok: false, error: "Do not send a storage path; submit maskAssetId instead" };
  }

  if (["entities", "entityPaths", "resolvedReferences"].some((k) => k in b))
    return { ok: false, error: "Submit entityIds only" };
  const entityIds = b.entityIds === undefined ? [] : b.entityIds;
  if (
    !Array.isArray(entityIds) ||
    entityIds.length > MAX_ATTACHED_ENTITIES ||
    entityIds.some((id) => typeof id !== "string" || !UUID_RE.test(id)) ||
    new Set(entityIds).size !== entityIds.length
  )
    return { ok: false, error: "Invalid reference pack ids" };

  if (!isNonEmptyString(b.prompt)) {
    return { ok: false, error: "prompt is required" };
  }
  if (b.prompt.length > MAX_PROMPT_CHARS) {
    return { ok: false, error: `prompt too long (max ${MAX_PROMPT_CHARS} chars)` };
  }

  let userInput: string | null = null;
  if (b.userInput !== undefined && b.userInput !== null) {
    if (!isNonEmptyString(b.userInput)) return { ok: false, error: "userInput must be a string" };
    userInput = b.userInput;
  }

  // Generate cannot fulfill an explicit instruction to avoid AI image models.
  // Reject before intent analysis, research, reservations or image execution.
  const forbidsAiImages =
    /(?:^|[.!?\n]\s*)(?:please\s+)?(?:do not|don't|don’t|never)\s+use\s+(?:an?\s+)?AI\s+image\s+(?:models?|generators?)\b/i;
  if ([b.prompt, userInput].some((text) => text && forbidsAiImages.test(text))) {
    return {
      ok: false,
      error:
        "This request forbids AI image generation. Generate uses an AI image model; use your code-based renderer for this request.",
    };
  }

  if (b.intent !== undefined && b.intent !== null && typeof b.intent !== "object") {
    return { ok: false, error: "intent must be an object" };
  }

  let referenceAssetIds: string[] = [];
  if (b.referenceAssetIds !== undefined) {
    if (
      !Array.isArray(b.referenceAssetIds) ||
      !b.referenceAssetIds.every((id) => isNonEmptyString(id))
    ) {
      return { ok: false, error: "referenceAssetIds must be an array of strings" };
    }
    referenceAssetIds = b.referenceAssetIds as string[];
    if (referenceAssetIds.length > MAX_REFERENCE_IMAGES_V1) {
      return {
        ok: false,
        error: `at most ${MAX_REFERENCE_IMAGES_V1} reference images are supported`,
      };
    }
  }

  let sourceVersionId: string | null = null;
  if (b.sourceVersionId !== undefined && b.sourceVersionId !== null) {
    if (!isNonEmptyString(b.sourceVersionId))
      return { ok: false, error: "sourceVersionId must be a string" };
    sourceVersionId = b.sourceVersionId;
  }

  let maskAssetId: string | null = null;
  if (b.maskAssetId !== undefined && b.maskAssetId !== null) {
    if (!isNonEmptyString(b.maskAssetId))
      return { ok: false, error: "maskAssetId must be a string" };
    maskAssetId = b.maskAssetId;
  }
  if (maskAssetId && !sourceVersionId) {
    return { ok: false, error: "sourceVersionId is required when maskAssetId is set" };
  }

  const sourceContext = parseSourceContext(b.sourceContext);
  if ("error" in sourceContext) return { ok: false, error: sourceContext.error };

  const structuredAspectRatio = isNonEmptyString(b.structuredAspectRatio)
    ? b.structuredAspectRatio
    : null;

  return {
    ok: true,
    request: {
      refreshGrounding: b.refreshGrounding === true,
      prompt: b.prompt,
      userInput,
      intent: b.intent ?? null,
      entityIds,
      referenceAssetIds,
      sourceVersionId,
      maskAssetId,
      sourceContextType: sourceContext.sourceContextType,
      sourceContextId: sourceContext.sourceContextId,
      structuredAspectRatio,
    },
  };
}

// ---------- POST /api/generation/jobs ----------

export interface ValidatedCreateJobsFromPlanRequest {
  planToken: string;
  /** Only meaningful when the plan requires series-count confirmation; otherwise the plan's autoCount is used. */
  selectedCount: number | null;
  idempotencyKey: string;
  structuredAspectRatio: string | null;
  sourceContextType: SourceContextType;
  sourceContextId: string | null;
}

export type CreateJobsFromPlanValidationResult =
  | { ok: true; request: ValidatedCreateJobsFromPlanRequest }
  | { ok: false; error: string };

// Fields that belonged to the old, pre-token request shape (or would let a
// client hand-assemble an executable plan) are rejected outright rather
// than silently ignored, so a stale/crafted client fails loudly instead of
// quietly losing the protection the token provides.
const FORBIDDEN_FIELDS = [
  "validation",
  "repair",
  "repairPolicy",
  "grounding",
  "facts",
  "sources",
  "visualReferences",
  "plan",
  "count",
  "children",
  "prompt",
  "operation",
  "mode",
  "entities",
  "entityIds",
  "entityPaths",
  "resolvedReferences",
] as const;

/**
 * Validates a raw, untrusted request body for POST /api/generation/jobs.
 * The browser may submit only a previously issued planToken plus the count
 * it confirmed — never a prompt, a mode, child briefs, or a raw plan
 * object. See plans.ts (the only place a plan is computed) and
 * plan-token.ts (the signature that makes this token unforgeable).
 */
export function validateCreateJobsFromPlanBody(body: unknown): CreateJobsFromPlanValidationResult {
  if (typeof body !== "object" || body === null)
    return { ok: false, error: "Invalid request body" };
  const b = body as Record<string, unknown>;

  for (const field of FORBIDDEN_FIELDS) {
    if (b[field] !== undefined) {
      return { ok: false, error: `${field} is not a valid field; submit a planToken instead` };
    }
  }

  if (!isNonEmptyString(b.planToken)) {
    return { ok: false, error: "planToken is required" };
  }

  let selectedCount: number | null = null;
  if (b.selectedCount !== undefined) {
    if (typeof b.selectedCount !== "number" || !Number.isFinite(b.selectedCount)) {
      return { ok: false, error: "selectedCount must be a number" };
    }
    selectedCount = b.selectedCount;
  }

  if (!isNonEmptyString(b.idempotencyKey)) {
    return { ok: false, error: "idempotencyKey is required" };
  }

  const structuredAspectRatio = isNonEmptyString(b.structuredAspectRatio)
    ? b.structuredAspectRatio
    : null;

  const sourceContext = parseSourceContext(b.sourceContext);
  if ("error" in sourceContext) return { ok: false, error: sourceContext.error };

  return {
    ok: true,
    request: {
      planToken: b.planToken,
      selectedCount,
      idempotencyKey: b.idempotencyKey,
      structuredAspectRatio,
      sourceContextType: sourceContext.sourceContextType,
      sourceContextId: sourceContext.sourceContextId,
    },
  };
}
