import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, getClientIp, jsonError, rateLimitExceeded } from "@/lib/api/public-route";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { validateCreateJobsFromPlanBody } from "@/lib/generation/job-request";
import { verifyPlanToken, type PlanTokenPayload } from "@/lib/generation/plan-token";
import { resolveSelectedCount } from "@/lib/generation/plan";
import { resolveGenerationModel } from "@/lib/generation/model-router";
import { resolveGenerationSize } from "@/lib/generation/aspect-ratio";
import { selectDecomposerInput, decomposeSeries } from "@/lib/generation/decompose-series";
import { referenceGuidance, type ReferenceIntent } from "@/lib/prompt-engine/reference";
import type { Intent } from "@/lib/prompt-engine/intent";
import { asGenerationClient } from "@/lib/generation/db-types";

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

async function resolveChildren(payload: PlanTokenPayload, selected: number): Promise<JobChild[]> {
  if (payload.plan.mode !== "series") {
    return [{ prompt: withFidelityPreamble(payload.prompt, payload.intent), label: null }];
  }
  const decomposerInput = selectDecomposerInput({
    userInput: payload.userInput,
    writerPrompt: payload.prompt,
  });
  const decomposition = await decomposeSeries({
    userInput: decomposerInput,
    intent: payload.intent,
    selectedCount: selected,
    apiKey: process.env.OPENAI_API_KEY,
  });
  return decomposition.children.map((c) => ({ prompt: c.prompt, label: c.label }));
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

        let selected: number;
        try {
          selected = resolveSelectedCount(payload.plan, req.selectedCount ?? undefined);
        } catch (e) {
          return jsonError((e as Error).message, 400);
        }

        // Annual subscribers receive credits monthly: settle anything due
        // before reserving. Never fatal.
        await supabase.rpc("grant_due_subscription_credits").then(
          () => undefined,
          () => undefined,
        );

        const operation = payload.plan.mode === "edit" ? "edit" : "generate";
        const model = resolveGenerationModel({
          operation,
          promptText: payload.prompt,
          referenceCount: payload.referenceAssetIds.length,
          hints: {
            category: payload.intent.category,
            exactTextCount: payload.intent.exact_text.length,
            referenceIntent: payload.intent.reference_intent,
          },
        });
        const size = resolveGenerationSize({
          promptText: payload.prompt,
          structuredAspectRatio: req.structuredAspectRatio ?? payload.intent.aspect_ratio.value,
        });

        if (
          operation === "edit" &&
          payload.referenceAssetIds.length === 0 &&
          !payload.sourceVersionId
        ) {
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
        // creative thread per job).
        const { data: session, error: sessionError } = await supabase
          .from("generation_sessions")
          .insert({
            user_id: userId,
            source_type: req.sourceContextType,
            source_id: req.sourceContextId,
            plan_json: payload.plan,
          })
          .select("id")
          .single();
        if (sessionError || !session) return jsonError("Could not start a generation session", 500);

        if (children.length === 1) {
          const { data: created, error: createError } = await supabase.rpc(
            "create_generation_job",
            {
              p_user_id: userId,
              p_session_id: session.id,
              p_operation: operation,
              p_model: model,
              p_prompt: children[0].prompt,
              p_width: size.width,
              p_height: size.height,
              p_source_version_id: payload.sourceVersionId,
              p_idempotency_key: req.idempotencyKey,
            },
          );
          if (createError) return jsonError("Could not create the generation job", 500);
          const row = Array.isArray(created) ? created[0] : created;
          if (!row?.reserved) return jsonError("Not enough credits.", 402);

          return new Response(
            JSON.stringify({
              sessionId: session.id,
              jobs: [{ id: row.job_id, label: null, index: null, status: "queued" }],
            }),
            { status: 202, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }

        const { data: created, error: createError } = await supabase.rpc("create_generation_jobs", {
          p_user_id: userId,
          p_session_id: session.id,
          p_operation: operation,
          p_model: model,
          p_prompts: children.map((c) => c.prompt),
          p_labels: children.map((c) => c.label),
          p_width: size.width,
          p_height: size.height,
          p_source_version_id: payload.sourceVersionId,
          p_idempotency_prefix: req.idempotencyKey,
        });
        if (createError) return jsonError("Could not create the generation jobs", 500);
        const row = Array.isArray(created) ? created[0] : created;
        if (!row?.reserved) return jsonError("Not enough credits.", 402);

        const jobIds = (row.job_ids ?? []) as string[];
        return new Response(
          JSON.stringify({
            sessionId: session.id,
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
