import {
  resolveEntityReferences,
  selectOwnedEntities,
} from "@/lib/generation/entity-reference-resolver";
import {
  MAX_JOB_INPUT_IMAGES_WITH_ENTITIES,
  entityReferenceIntent,
  type ReferenceEntity,
  type ResolvedEntity,
} from "@/lib/generation/entities";
import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, getClientIp, jsonError, rateLimitExceeded } from "@/lib/api/public-route";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { validateCreatePlanBody } from "@/lib/generation/job-request";
import { buildGenerationPlan, type GenerationPlan } from "@/lib/generation/plan";
import { signPlanToken, PLAN_TOKEN_TTL_MS } from "@/lib/generation/plan-token";
import {
  ownerOfStoragePath,
  GENERATION_BUCKET,
  maskAssetStoragePath,
} from "@/lib/generation/storage-paths";
import { MAX_MASK_BYTES } from "@/lib/generation/mask-upload-request";
import { validateMaskPng } from "@/lib/generation/png-mask";
import { asGenerationClient, type UntypedSupabaseClient } from "@/lib/generation/db-types";
import { analyzeIntent } from "@/lib/prompt-engine/builder";
import { IntentSchema, type Intent } from "@/lib/prompt-engine/intent";

export interface DisplayPlan {
  mode: GenerationPlan["mode"];
  desiredCount: number;
  autoCount: number;
  separateAssets: boolean;
  searchNeeded: boolean;
  requiresCountConfirmation: boolean;
  /** Credit cost = image count; 1 credit = 1 image (see models.ts). */
  creditCostAuto: number;
  creditCostAll: number;
}

function toDisplayPlan(plan: GenerationPlan): DisplayPlan {
  return {
    mode: plan.mode,
    desiredCount: plan.desiredCount,
    autoCount: plan.autoCount,
    separateAssets: plan.separateAssets,
    searchNeeded: plan.searchNeeded,
    requiresCountConfirmation: plan.requiresCountConfirmation,
    creditCostAuto: plan.autoCount,
    creditCostAll: plan.desiredCount,
  };
}

/**
 * A best-effort, low-detail preview of the first attached reference image,
 * used only so intent analysis knows an image is actually attached (which
 * flips several inference rules in intent.ts — a `style`/`subject_identity`
 * reference_intent can never be inferred as "none"). Never fatal: a preview
 * that can't be produced just means intent analysis runs text-only, same as
 * before this feature existed.
 */
async function previewReferenceImageUrl(
  supabase: UntypedSupabaseClient,
  userId: string,
  referenceAssetIds: string[],
): Promise<string | null> {
  const path = referenceAssetIds[0];
  if (!path) return null;
  if (ownerOfStoragePath(path) !== userId) return null;
  try {
    const { data } = await supabase.storage.from(GENERATION_BUCKET).createSignedUrl(path, 600);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

/**
 * POST /api/generation/plans — turn a prompt (+ optional pre-computed
 * intent) into a signed, opaque planToken the browser cannot read or edit.
 *
 * This is the only generation route that ever runs intent analysis or
 * decides series/collage/edit shape from free text. POST /jobs, by design,
 * never sees a raw prompt again — see job-request.ts and jobs.ts.
 */
export const Route = createFileRoute("/api/generation/plans")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        if (!isNativeGenerationEnabled()) return jsonError("Not found", 404);

        const ip = getClientIp(request);
        if (rateLimitExceeded(ip)) {
          return jsonError("Too many requests. Please wait a moment and try again.", 429);
        }

        const authResult = await authenticateGenerationRequest(request);
        if (!authResult.ok) return jsonError(authResult.error, authResult.status);
        const { userId } = authResult.auth;
        const supabase = asGenerationClient(authResult.auth.supabase);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonError("Invalid JSON body", 400);
        }

        const validation = validateCreatePlanBody(body);
        if (!validation.ok) return jsonError(validation.error, 400);
        const req = validation.request;

        const secret = process.env.GENERATION_PLAN_SECRET;
        if (!secret) return jsonError("Generation is temporarily unavailable.", 503);

        for (const path of req.referenceAssetIds) {
          if (ownerOfStoragePath(path) !== userId) {
            return jsonError("Invalid reference image", 400);
          }
        }

        let entities: ResolvedEntity[] = [];
        if (req.entityIds.length) {
          const { data: rows, error } = await supabase
            .from("reference_entities")
            .select("*, assets:reference_entity_assets(*)")
            .eq("user_id", userId)
            .in("id", req.entityIds);
          if (error) return jsonError("Could not load reference packs", 500);
          const owned = (rows ?? []) as ReferenceEntity[];
          if (owned.length !== req.entityIds.length || owned.some((e) => e.user_id !== userId))
            return jsonError("Invalid reference pack", 400);
          try {
            entities = resolveEntityReferences({
              entities: selectOwnedEntities(owned, req.entityIds, userId),
              prompt: req.userInput ?? req.prompt,
              budget:
                MAX_JOB_INPUT_IMAGES_WITH_ENTITIES -
                req.referenceAssetIds.length -
                (req.sourceVersionId ? 1 : 0),
            });
          } catch (error) {
            return jsonError((error as Error).message, 400);
          }
        }

        const maskAssetId: string | null = req.maskAssetId;
        let maskPath: string | null = null;
        if (maskAssetId) {
          // sourceVersionId is required by validateCreatePlanBody when a mask is set.
          if (!req.sourceVersionId) {
            return jsonError("sourceVersionId is required when maskAssetId is set", 400);
          }
          try {
            maskPath = maskAssetStoragePath(userId, maskAssetId);
          } catch {
            return jsonError("Invalid mask", 400);
          }
          if (ownerOfStoragePath(maskPath) !== userId) {
            return jsonError("Invalid mask", 400);
          }

          const { data: source, error: sourceError } = await supabase
            .from("image_versions")
            .select("id, width, height")
            .eq("id", req.sourceVersionId)
            .eq("user_id", userId)
            .maybeSingle();
          if (sourceError) return jsonError("Could not load source version", 500);
          if (!source) return jsonError("Source version not found", 404);

          const { data: file } = await supabase.storage.from(GENERATION_BUCKET).download(maskPath);
          if (!file) return jsonError("Mask not found", 400);
          const bytes = new Uint8Array(await file.arrayBuffer());
          const maskCheck = validateMaskPng(bytes, source.width, source.height, MAX_MASK_BYTES);
          if (!maskCheck.ok) return jsonError(maskCheck.error, 400);
        }

        let intent: Intent;
        if (req.intent) {
          try {
            intent = IntentSchema.parse(req.intent);
          } catch {
            return jsonError("Invalid intent", 400);
          }
        } else {
          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) return jsonError("Generation is temporarily unavailable.", 503);
          const referenceImageUrl = await previewReferenceImageUrl(
            supabase,
            userId,
            req.referenceAssetIds.length
              ? req.referenceAssetIds
              : entities.flatMap((e) => e.resolvedReferences.map((r) => r.path)),
          );
          try {
            const analysis = await analyzeIntent({
              apiKey,
              userInput: req.userInput ?? req.prompt,
              mode: "default",
              referenceImageUrl,
              referenceIntent:
                !req.referenceAssetIds.length && entities.length
                  ? entityReferenceIntent(entities[0].type)
                  : "auto",
              category: null,
              remixRef: null,
            });
            intent = analysis.intent;
          } catch {
            return jsonError("Could not analyze the request.", 502);
          }
        }

        const userInput = req.userInput ?? req.prompt;
        const plan = buildGenerationPlan(intent, userInput, req.sourceContextType);

        const planToken = signPlanToken(
          {
            userId,
            prompt: req.prompt,
            userInput,
            ...(entities.length ? { entities } : {}),
            referenceAssetIds: req.referenceAssetIds,
            sourceVersionId: req.sourceVersionId,
            maskAssetId,
            maskPath,
            intent,
            plan,
            exp: Date.now() + PLAN_TOKEN_TTL_MS,
          },
          secret,
        );

        return new Response(JSON.stringify({ plan: toDisplayPlan(plan), planToken }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      },
    },
  },
});
