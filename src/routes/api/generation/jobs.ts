import { authorizeExecution } from "@/lib/generation/execution-auth";
import { buildJobValidationPlans } from "@/lib/generation/validation/contract";
import { groundingBrief } from "@/lib/generation/grounding/service";
import { buildEntityPreamble } from "@/lib/generation/entity-preamble";
import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, getClientIp, jsonError, rateLimitExceeded } from "@/lib/api/public-route";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { validateCreateJobsFromPlanBody } from "@/lib/generation/job-request";
import { verifyPlanToken, type PlanTokenPayload } from "@/lib/generation/plan-token";
import {
  clampGenerationPlan,
  HARD_SERIES_CAP,
  resolveOperation,
  resolveSelectedCount,
} from "@/lib/generation/plan";
import { resolveGenerationModel } from "@/lib/generation/model-router";
import { withPrecisionEditPreamble } from "@/lib/generation/precision-edit-prompt";
import { resolveGenerationSize, preserveEditSourceSize } from "@/lib/generation/aspect-ratio";
import { selectDecomposerInput, decomposeSeries } from "@/lib/generation/decompose-series";
import { referenceGuidance, type ReferenceIntent } from "@/lib/prompt-engine/reference";
import type { Intent } from "@/lib/prompt-engine/intent";
import { asGenerationClient, type UntypedSupabaseClient } from "@/lib/generation/db-types";
import {
  buildExecutionPlanJson,
  executionPlanIdentityMatches,
} from "@/lib/generation/execution-plan";
import {
  decideExistingSession,
  generationJobIdempotencyKeys,
  toExistingJobsResult,
  type ExistingJobRow,
} from "@/lib/generation/idempotent-jobs";

// Reference intents where the image must be reproduced faithfully, not just
// used for inspiration — see reference.ts. A prompt built for one of these
// needs an explicit preserve instruction; if it doesn't already have one, a
// short preamble is prepended so the fidelity requirement travels with the
// prompt into ChatGPT/Imago, without running the prompt writer again.
const FIDELITY_REFERENCE_INTENTS = new Set<ReferenceIntent>([
  "subject_identity",
  "product_object",
  "edit_source",
  "composition",
]);
const HAS_PRESERVE_LIST_RE = /\bpreserve\b/i;

/** String assembly only — never the prompt writer. See job-request.ts / plan.ts for why. */
function withFidelityPreamble(prompt: string, intent: Intent): string {
  if (!FIDELITY_REFERENCE_INTENTS.has(intent.reference_intent)) return prompt;
  if (HAS_PRESERVE_LIST_RE.test(prompt)) return prompt;
  const guidance = referenceGuidance(intent.reference_intent);
  const preserveList =
    intent.must_preserve.length > 0 ? `Preserve: ${intent.must_preserve.join("; ")}.` : "";
  const preamble = [guidance, preserveList].filter(Boolean).join(" ");
  return preamble ? `${preamble}\n\n${prompt}` : prompt;
}

interface JobChild {
  prompt: string;
  label: string | null;
}

async function deleteSessionIfEmpty(
  supabase: UntypedSupabaseClient,
  userId: string,
  sessionId: string,
): Promise<void> {
  const { data: jobs, error: jobsError } = await supabase
    .from("generation_jobs")
    .select("id")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .limit(1);
  if (jobsError || (jobs?.length ?? 0) > 0) return;

  await supabase.from("generation_sessions").delete().eq("user_id", userId).eq("id", sessionId);
}

async function resolveChildren(payload: PlanTokenPayload, selected: number): Promise<JobChild[]> {
  const preamble = buildEntityPreamble(
    payload.entities ?? [],
    payload.referenceAssetIds.length + (payload.sourceVersionId ? 1 : 0),
  );
  const withEntities = (prompt: string) =>
    [preamble, groundingBrief(payload.grounding), prompt].filter(Boolean).join("\n\n");
  if (payload.plan.mode !== "series") {
    if (payload.maskPath || payload.maskAssetId) {
      return [
        {
          prompt: withPrecisionEditPreamble(
            withEntities(payload.prompt),
            payload.intent.must_preserve,
            payload.userInput,
          ),
          label: null,
        },
      ];
    }
    return [
      { prompt: withEntities(withFidelityPreamble(payload.prompt, payload.intent)), label: null },
    ];
  }
  const decomposerInput = selectDecomposerInput({
    userInput: payload.userInput,
    writerPrompt: payload.prompt,
  });
  const decomposition = await decomposeSeries({
    entities: payload.entities,
    userInput: decomposerInput,
    intent: payload.intent,
    selectedCount: selected,
    apiKey: process.env.OPENAI_API_KEY,
  });
  return decomposition.children.map((c) => ({ prompt: withEntities(c.prompt), label: c.label }));
}

/**
 * POST /api/generation/jobs — create generation job(s) from a previously
 * issued, signed plan token.
 *
 * Depikt's Generate surface must not accept executable plan JSON from the
 * browser: this route never sees a raw prompt, a client-chosen operation,
 * or a client-assembled child-brief list — see job-request.ts. Everything
 * that decides *what* gets generated (task/category/series shape) already
 * happened in POST /plans; this route only verifies that decision's
 * signature, decomposes it into per-image prompts when it's a series, and
 * reserves credits for exactly the confirmed count.
 *
 * UNVERIFIED END-TO-END — see the original note this route shipped with:
 * the request/validate/reserve-credit path is unit-tested at the module
 * level; this file's wiring (Cloudflare ExecutionContext, Supabase RPCs)
 * needs a real deploy to confirm.
 *
 * Execution deliberately does NOT happen here — see jobs.$id.run.ts.
 */
export const Route = createFileRoute("/api/generation/jobs")({
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

        const validation = validateCreateJobsFromPlanBody(body);
        if (!validation.ok) return jsonError(validation.error, 400);
        const req = validation.request;

        const secret = process.env.GENERATION_PLAN_SECRET;
        if (!secret) return jsonError("Generation is temporarily unavailable.", 503);

        let payload: PlanTokenPayload;
        try {
          payload = verifyPlanToken(req.planToken, secret, userId);
        } catch {
          return jsonError("This plan has expired. Please try again.", 400);
        }
        payload = { ...payload, plan: clampGenerationPlan(payload.plan) };

        if (req.selectedCount != null && req.selectedCount > HARD_SERIES_CAP) {
          return jsonError(`selectedCount cannot exceed ${HARD_SERIES_CAP}`, 400);
        }

        let selected: number;
        try {
          selected = resolveSelectedCount(payload.plan, req.selectedCount ?? undefined);
        } catch (e) {
          return jsonError((e as Error).message, 400);
        }

        // Idempotent replay (retry, double-submit, a second tab). Use the
        // exact key(s) create_generation_job(s) assigns rather than LIKE:
        // idempotency keys may legally contain `%` or `_`.
        const isSeriesPlan = payload.plan.mode === "series";
        const expectedIdempotencyKeys = generationJobIdempotencyKeys(
          req.idempotencyKey,
          isSeriesPlan,
          selected,
        );
        const { data: existingJobRows, error: existingJobsError } = await supabase
          .from("generation_jobs")
          .select("id, session_id, idempotency_key, status, series_index, series_label")
          .eq("user_id", userId)
          .in("idempotency_key", expectedIdempotencyKeys);
        if (existingJobsError) {
          return jsonError("Could not check for an existing generation job", 500);
        }
        const existingResult = toExistingJobsResult(
          (existingJobRows ?? []) as ExistingJobRow[],
          expectedIdempotencyKeys,
        );
        if (existingResult) {
          return new Response(JSON.stringify(existingResult), {
            status: 202,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        // Annual subscribers receive credits monthly: settle anything due
        // before reserving. Never fatal.
        await supabase.rpc("grant_due_subscription_credits").then(
          () => undefined,
          () => undefined,
        );

        const operation = resolveOperation(
          payload.plan,
          payload.referenceAssetIds,
          payload.sourceVersionId,
          payload.entities?.reduce((n, entity) => n + entity.resolvedReferences.length, 0) ?? 0,
          payload.grounding?.bundle.visualReferences.length ?? 0,
        );
        const model = resolveGenerationModel({
          operation,
          promptText: payload.prompt,
          referenceCount: payload.referenceAssetIds.length,
          lockedEntityCount: payload.entities?.length ?? 0,
          hints: {
            category: payload.intent.category,
            exactTextCount: payload.intent.exact_text.length,
            referenceIntent: payload.intent.reference_intent,
          },
          hasMask: Boolean(payload.maskPath ?? payload.maskAssetId),
        });
        let size = resolveGenerationSize({
          promptText: payload.prompt,
          structuredAspectRatio: req.structuredAspectRatio ?? payload.intent.aspect_ratio.value,
        });
        if (payload.sourceVersionId) {
          const { data: source, error: sourceError } = await supabase
            .from("image_versions")
            .select("width, height")
            .eq("id", payload.sourceVersionId)
            .eq("user_id", userId)
            .maybeSingle();
          if (sourceError) return jsonError("Could not load source version", 500);
          if (!source) return jsonError("Source version not found", 404);
          if (!(source.width > 0 && source.height > 0)) {
            return jsonError("Source version has invalid dimensions", 400);
          }
          size = preserveEditSourceSize(
            size,
            source,
            Boolean(payload.maskPath ?? payload.maskAssetId),
          );
        }

        if (payload.plan.mode === "edit" && operation === "generate" && !payload.grounding) {
          return jsonError("Editing requires a sourceVersionId or a reference image", 400);
        }

        if (!process.env.OPENAI_API_KEY) {
          return jsonError("Generation is temporarily unavailable.", 503);
        }

        let children: JobChild[];
        try {
          children = await resolveChildren(payload, selected);
        } catch {
          return jsonError("Could not prepare the generation request.", 502);
        }

        // A session id is required by the schema; direct /generate without
        // one yet creates a new session per submission for now (one
        // creative thread per job). plan_json carries more than the raw
        // display plan -- see execution-plan.ts -- because /run needs the
        // reference paths this token carried, and it must never trust a
        // client-supplied list at execution time.
        let validationSnapshot;
        if (process.env.VALIDATION_REPAIR_ENABLED === "true") {
          try {
            validationSnapshot = buildJobValidationPlans({
              groundingBundle: payload.grounding?.bundle,
              intent: payload.intent,
              entities: payload.entities ?? [],
              selectedCount: selected,
              prompt: payload.userInput,
              hasMask: !!payload.maskPath,
              children: children.map((child, index) => ({
                key: expectedIdempotencyKeys[index],
                prompt: child.prompt,
              })),
              userId,
              secret,
            });
          } catch {
            return jsonError("Could not prepare image requirements. Please try again.", 502);
          }
        }
        const executionPlan = buildExecutionPlanJson({
          validation: validationSnapshot,
          grounding: payload.grounding,
          groundingUsage: payload.groundingUsage,
          entities: payload.entities,
          plan: payload.plan,
          selectedCount: selected,
          referenceAssetIds: payload.referenceAssetIds,
          sourceVersionId: payload.sourceVersionId,
          maskAssetId: payload.maskAssetId ?? null,
          maskPath: payload.maskPath ?? null,
          children,
        });
        const signedExecutionPlan = {
          ...executionPlan,
          executionAuthorization: authorizeExecution(executionPlan, {
            operation,
            width: size.width,
            height: size.height,
            userId,
            secret,
            children: children.map((child, index) => ({
              key: expectedIdempotencyKeys[index],
              prompt: child.prompt,
            })),
          }),
        };
        const { data: insertedSession, error: sessionError } = await supabase
          .from("generation_sessions")
          .insert({
            user_id: userId,
            source_type: req.sourceContextType,
            source_id: req.sourceContextId,
            plan_json: signedExecutionPlan,
            create_idempotency_key: req.idempotencyKey,
          })
          .select("id")
          .single();

        let sessionId: string;
        if (!sessionError && insertedSession) {
          sessionId = insertedSession.id;
        } else if (sessionError?.code === "23505") {
          // A concurrent submit or failed cleanup left the unique session.
          // Replay a complete job set, reuse a zero-job session, and reject
          // partial/unexpected sets rather than splicing in new jobs.
          const { data: existingSession, error: existingSessionError } = await supabase
            .from("generation_sessions")
            .select("id, plan_json")
            .eq("user_id", userId)
            .eq("create_idempotency_key", req.idempotencyKey)
            .single();
          if (existingSessionError || !existingSession) {
            return jsonError("Could not replay the generation session", 500);
          }

          const { data: concurrentJobRows, error: concurrentJobsError } = await supabase
            .from("generation_jobs")
            .select("id, session_id, idempotency_key, status, series_index, series_label")
            .eq("user_id", userId)
            .eq("session_id", existingSession.id);
          if (concurrentJobsError) {
            return jsonError("Could not replay the generation jobs", 500);
          }

          const decision = decideExistingSession(
            (concurrentJobRows ?? []) as ExistingJobRow[],
            expectedIdempotencyKeys,
          );
          switch (decision.kind) {
            case "replay":
              return new Response(JSON.stringify(decision.result), {
                status: 202,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              });
            case "reuse":
              if (
                !executionPlanIdentityMatches(existingSession.plan_json, {
                  validation: validationSnapshot,
                  grounding: payload.grounding,
                  groundingUsage: payload.groundingUsage,
                  entities: payload.entities,
                  plan: payload.plan,
                  selectedCount: selected,
                  referenceAssetIds: payload.referenceAssetIds,
                  sourceVersionId: payload.sourceVersionId,
                  maskAssetId: payload.maskAssetId ?? null,
                  maskPath: payload.maskPath ?? null,
                })
              ) {
                return jsonError("Generation is still being prepared. Please retry.", 409);
              }
              sessionId = existingSession.id;
              break;
            case "invalid":
              return jsonError("Generation is still being prepared. Please retry.", 409);
            default: {
              const exhaustive: never = decision;
              return exhaustive;
            }
          }
        } else {
          return jsonError("Could not start a generation session", 500);
        }

        if (children.length === 1) {
          const { data: created, error: createError } = await supabase.rpc(
            "create_generation_job",
            {
              p_user_id: userId,
              p_session_id: sessionId,
              p_operation: operation,
              p_model: model,
              p_prompt: children[0].prompt,
              p_width: size.width,
              p_height: size.height,
              p_source_version_id: payload.sourceVersionId,
              p_idempotency_key: req.idempotencyKey,
            },
          );
          if (createError) {
            await deleteSessionIfEmpty(supabase, userId, sessionId);
            return jsonError("Could not create the generation job", 500);
          }
          const row = Array.isArray(created) ? created[0] : created;
          if (!row?.reserved) {
            await deleteSessionIfEmpty(supabase, userId, sessionId);
            return jsonError("Not enough credits.", 402);
          }

          return new Response(
            JSON.stringify({
              sessionId,
              jobs: [{ id: row.job_id, label: null, index: null, status: "queued" }],
            }),
            { status: 202, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }

        const { data: created, error: createError } = await supabase.rpc("create_generation_jobs", {
          p_user_id: userId,
          p_session_id: sessionId,
          p_operation: operation,
          p_model: model,
          p_prompts: children.map((c) => c.prompt),
          p_labels: children.map((c) => c.label),
          p_width: size.width,
          p_height: size.height,
          p_source_version_id: payload.sourceVersionId,
          p_idempotency_prefix: req.idempotencyKey,
        });
        if (createError) {
          await deleteSessionIfEmpty(supabase, userId, sessionId);
          return jsonError("Could not create the generation jobs", 500);
        }
        const row = Array.isArray(created) ? created[0] : created;
        if (!row?.reserved) {
          await deleteSessionIfEmpty(supabase, userId, sessionId);
          return jsonError("Not enough credits.", 402);
        }

        const jobIds = (row.job_ids ?? []) as string[];
        return new Response(
          JSON.stringify({
            sessionId,
            jobs: jobIds.map((id, index) => ({
              id,
              label: children[index]?.label ?? null,
              index,
              status: "queued",
            })),
          }),
          { status: 202, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      },
    },
  },
});
