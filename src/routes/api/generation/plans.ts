import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, getClientIp, jsonError, rateLimitExceeded } from "@/lib/api/public-route";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { validateCreatePlanBody } from "@/lib/generation/job-request";
import { buildGenerationPlan, type GenerationPlan } from "@/lib/generation/plan";
import { signPlanToken, PLAN_TOKEN_TTL_MS } from "@/lib/generation/plan-token";
import { ownerOfStoragePath, GENERATION_BUCKET } from "@/lib/generation/storage-paths";
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
            req.referenceAssetIds,
          );
          try {
            const analysis = await analyzeIntent({
              apiKey,
              userInput: req.userInput ?? req.prompt,
              mode: "default",
              referenceImageUrl,
              referenceIntent: "auto",
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
            referenceAssetIds: req.referenceAssetIds,
            sourceVersionId: req.sourceVersionId,
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
