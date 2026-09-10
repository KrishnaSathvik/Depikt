// Native image generation — server-side request validation.
//
// The client may submit only these fields. Everything security-sensitive
// (real OpenAI model id, quality, credit cost, storage path, user id) is
// derived server-side and is never accepted from the request body — see
// models.ts and aspect-ratio.ts. As of the Image Model Router, `model` is
// no longer a client-submitted field at all: the client never asks the
// user to choose Flare or Sunburst, so there's nothing to validate or
// trust there — see model-router.ts, called separately by the route
// handler with this validated request's operation/prompt/reference count.

import { MAX_REFERENCE_IMAGES_V1 } from "./models.ts";
import { resolveGenerationSize, type ResolvedSize } from "./aspect-ratio.ts";
import type { RoutingHints } from "./model-router.ts";

export type SourceContextType =
  | "direct"
  | "library"
  | "gallery"
  | "prompt_build"
  | "prompt_critique"
  | "template";

const SOURCE_CONTEXT_TYPES: readonly SourceContextType[] = [
  "direct",
  "library",
  "gallery",
  "prompt_build",
  "prompt_critique",
  "template",
];

export const MAX_PROMPT_CHARS = 4000;

export interface ValidatedGenerationRequest {
  operation: "generate" | "edit";
  prompt: string;
  referenceAssetIds: string[];
  sourceVersionId: string | null;
  sourceContextType: SourceContextType;
  sourceContextId: string | null;
  idempotencyKey: string;
  size: ResolvedSize;
  /** Optional structured signal from Prompt's Intent Analyzer, fed to the model router. Never used to pick a raw model id directly. */
  routingHints: RoutingHints | null;
}

export type ValidationResult =
  | { ok: true; request: ValidatedGenerationRequest }
  | { ok: false; error: string };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function parseRoutingHints(value: unknown): RoutingHints | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const hints: RoutingHints = {};
  if (isNonEmptyString(v.category)) hints.category = v.category;
  if (typeof v.exactTextCount === "number" && v.exactTextCount >= 0)
    hints.exactTextCount = v.exactTextCount;
  if (isNonEmptyString(v.referenceIntent)) hints.referenceIntent = v.referenceIntent;
  return Object.keys(hints).length > 0 ? hints : null;
}

/**
 * Validates a raw, untrusted request body for POST /api/generation/jobs.
 * Never trusts quality or credit cost from the client. Model choice is not
 * a request field at all — see model-router.ts.
 */
export function validateGenerationRequest(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null)
    return { ok: false, error: "Invalid request body" };
  const b = body as Record<string, unknown>;

  const operation = b.operation;
  if (operation !== "generate" && operation !== "edit") {
    return { ok: false, error: "operation must be 'generate' or 'edit'" };
  }

  if (!isNonEmptyString(b.prompt)) {
    return { ok: false, error: "prompt is required" };
  }
  if (b.prompt.length > MAX_PROMPT_CHARS) {
    return { ok: false, error: `prompt too long (max ${MAX_PROMPT_CHARS} chars)` };
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

  if (
    operation === "edit" &&
    referenceAssetIds.length === 0 &&
    !isNonEmptyString(b.sourceVersionId)
  ) {
    return { ok: false, error: "edit requires a sourceVersionId or at least one reference image" };
  }

  let sourceVersionId: string | null = null;
  if (b.sourceVersionId !== undefined && b.sourceVersionId !== null) {
    if (!isNonEmptyString(b.sourceVersionId))
      return { ok: false, error: "sourceVersionId must be a string" };
    sourceVersionId = b.sourceVersionId;
  }

  let sourceContextType: SourceContextType = "direct";
  if (b.sourceContext !== undefined && b.sourceContext !== null) {
    if (typeof b.sourceContext !== "object")
      return { ok: false, error: "sourceContext must be an object" };
    const sc = b.sourceContext as Record<string, unknown>;
    if (!SOURCE_CONTEXT_TYPES.includes(sc.type as SourceContextType)) {
      return { ok: false, error: "sourceContext.type is invalid" };
    }
    sourceContextType = sc.type as SourceContextType;
  }
  const sourceContextId =
    b.sourceContext && isNonEmptyString((b.sourceContext as Record<string, unknown>).id)
      ? ((b.sourceContext as Record<string, unknown>).id as string)
      : null;

  if (!isNonEmptyString(b.idempotencyKey)) {
    return { ok: false, error: "idempotencyKey is required" };
  }

  const structuredAspectRatio = isNonEmptyString(b.structuredAspectRatio)
    ? b.structuredAspectRatio
    : null;
  const referenceRatio =
    b.referenceRatio &&
    typeof b.referenceRatio === "object" &&
    typeof (b.referenceRatio as Record<string, unknown>).width === "number" &&
    typeof (b.referenceRatio as Record<string, unknown>).height === "number"
      ? (b.referenceRatio as { width: number; height: number })
      : null;

  const size = resolveGenerationSize({
    promptText: b.prompt,
    structuredAspectRatio,
    referenceRatio,
  });

  return {
    ok: true,
    request: {
      operation,
      prompt: b.prompt,
      referenceAssetIds,
      sourceVersionId,
      sourceContextType,
      sourceContextId,
      idempotencyKey: b.idempotencyKey,
      size,
      routingHints: parseRoutingHints(b.routingHints),
    },
  };
}
