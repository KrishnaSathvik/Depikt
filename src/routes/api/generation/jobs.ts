import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, getClientIp, jsonError, rateLimitExceeded } from "@/lib/api/public-route";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { validateGenerationRequest } from "@/lib/generation/job-request";
import { runGenerationJob } from "@/lib/generation/job-pipeline";
import { createSupabaseDataAccess } from "@/lib/generation/supabase-data-access";
import { createWaitUntilExecutor, type WaitUntilContext } from "@/lib/generation/job-executor";
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
          p_model: req.model,
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

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return jsonError("Generation is temporarily unavailable.", 503);

        // Reference bytes would be fetched from GENERATION_BUCKET here for
        // an edit; omitted in this slice (see report — reference-asset
        // upload endpoint is not yet built).
        const waitUntilCtx = (request as unknown as { cloudflare?: { ctx?: WaitUntilContext } })
          .cloudflare?.ctx;
        if (waitUntilCtx) {
          const executor = createWaitUntilExecutor(waitUntilCtx);
          executor.schedule(() =>
            runGenerationJob(
              {
                id: row.job_id,
                userId,
                sessionId: session.id,
                operation: req.operation,
                model: req.model,
                prompt: req.prompt,
                width: req.size.width,
                height: req.size.height,
                idempotencyKey: req.idempotencyKey,
                referenceImages: [],
              },
              req.sourceVersionId,
              {
                data: createSupabaseDataAccess(authResult.auth.supabase),
                apiKey,
                decodeBase64: (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)),
              },
            ).then(() => undefined),
          );
        }
        // If waitUntilCtx is unavailable (e.g. local dev without the
        // Cloudflare adapter), the job stays queued until a reconciler or a
        // manual run picks it up — see "Stale job safety" in the report.

        return new Response(
          JSON.stringify({ jobId: row.job_id, sessionId: session.id, status: "queued" }),
          { status: 202, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      },
    },
  },
});
