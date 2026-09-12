import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, getClientIp, jsonError, rateLimitExceeded } from "@/lib/api/public-route";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { validateGenerationRequest } from "@/lib/generation/job-request";
import { resolveGenerationModel } from "@/lib/generation/model-router";
import { asGenerationClient } from "@/lib/generation/db-types";


/**
 * POST /api/generation/jobs — create a generation job.
 *
 * UNVERIFIED END-TO-END. This route has never run against a live Cloudflare
 * deployment or a live Supabase project (this session has neither). The
 * request/validate/reserve-credit path is unit-tested at the module level
 * (job-request, openai-images, job-pipeline); this file's job is to wire
 * those pieces together the way the framework expects, and that wiring
 * itself needs a real deploy to confirm — most importantly, that
 * `context.cloudflare.ctx` (or wherever this TanStack Start version exposes
 * Workers' ExecutionContext) actually resolves the way it's assumed to
 * below. If it doesn't, the fix is local to this file, not to the modules
 * it calls.
 *
 * Behind GENERATION_ENABLED — returns 404 when the flag is off so the route
 * doesn't leak into production before launch approval.
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

        const validation = validateGenerationRequest(body);
        if (!validation.ok) return jsonError(validation.error, 400);
        const req = validation.request;

        // The client never chooses Flare vs Sunburst — Depikt decides. See
        // model-router.ts: deterministic-first, using Prompt's structured
        // intent when available (req.routingHints) and falling back to
        // prompt-text heuristics for direct /generate submissions.
        const model = resolveGenerationModel({
          operation: req.operation,
          promptText: req.prompt,
          referenceCount: req.referenceAssetIds.length,
          hints: req.routingHints ?? undefined,
        });

        // Annual subscribers receive credits monthly: settle anything due
        // before reserving. Never fatal.
        await supabase.rpc("grant_due_subscription_credits").then(
          () => undefined,
          () => undefined,
        );

        // A session id is required by the schema; direct /generate without
        // one yet creates a new session per submission for now (one
        // creative thread per job) — see "Next slice" in the conversation
        // record for continuing an existing session across edits.
        const { data: session, error: sessionError } = await supabase
          .from("generation_sessions")
          .insert({
            user_id: userId,
            source_type: req.sourceContextType,
            source_id: req.sourceContextId,
          })
          .select("id")
          .single();
        if (sessionError || !session) return jsonError("Could not start a generation session", 500);

        const { data: created, error: createError } = await supabase.rpc("create_generation_job", {
          p_user_id: userId,
          p_session_id: session.id,
          p_operation: req.operation,
          p_model: model,
          p_prompt: req.prompt,
          p_width: req.size.width,
          p_height: req.size.height,
          p_source_version_id: req.sourceVersionId,
          p_idempotency_key: req.idempotencyKey,
        });
        if (createError) return jsonError("Could not create the generation job", 500);

        const row = Array.isArray(created) ? created[0] : created;
        if (!row?.reserved) {
          return jsonError("Not enough credits.", 402);
        }

        // Execution deliberately does NOT happen here. There is no
        // Cloudflare ExecutionContext (waitUntil) reachable from a TanStack
        // file route in this deployment, so anything fired-and-forgotten
        // after this response dies with the isolate — that is exactly what
        // left jobs stuck in `queued` with a credit reserved. The browser
        // instead calls POST /api/generation/jobs/:id/run, a long-lived
        // request that does the work while the platform keeps it alive.
        if (!process.env.OPENAI_API_KEY) {
          return jsonError("Generation is temporarily unavailable.", 503);
        }


        return new Response(
          JSON.stringify({ jobId: row.job_id, sessionId: session.id, status: "queued" }),
          { status: 202, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      },
    },
  },
});
