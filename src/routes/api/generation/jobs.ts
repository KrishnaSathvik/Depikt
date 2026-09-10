import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, getClientIp, jsonError, rateLimitExceeded } from "@/lib/api/public-route";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { validateGenerationRequest } from "@/lib/generation/job-request";
import { resolveGenerationModel } from "@/lib/generation/model-router";
import { runGenerationJob } from "@/lib/generation/job-pipeline";
import { createSupabaseDataAccess } from "@/lib/generation/supabase-data-access";
import {
  createWaitUntilExecutor,
  createInlineExecutor,
  type WaitUntilContext,
} from "@/lib/generation/job-executor";
import { asGenerationClient } from "@/lib/generation/db-types";
import { GENERATION_BUCKET } from "@/lib/generation/storage-paths";

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

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return jsonError("Generation is temporarily unavailable.", 503);

        // The client sends the storage `path` it got back from
        // POST /api/generation/references (not a bare asset id), so a
        // reference resolves directly against private storage. Ownership is
        // enforced by RLS (20260910140000_add_generation_storage.sql) — this
        // download uses the same user-JWT-bound client as everything else
        // here, so it can only ever succeed for that user's own paths.
        const referenceImages: { bytes: Uint8Array; filename: string; mimeType: string }[] = [];

        // An edit's source is the version being edited, not a
        // user-attached reference — OpenAI's edits endpoint still needs it
        // as an image[] entry, so fetch it here rather than relying on the
        // caller to have also attached it via referenceAssetIds (it never
        // does: the Edit composer only sends sourceVersionId). Without
        // this, an edit request reaches OpenAI with zero images and is
        // rejected outright.
        if (req.operation === "edit" && req.sourceVersionId) {
          const { data: sourceVersion, error: sourceError } = await supabase
            .from("image_versions")
            .select("storage_path")
            .eq("id", req.sourceVersionId)
            .single();
          if (sourceError || !sourceVersion) {
            return jsonError("Source image for this edit could not be found.", 400);
          }
          const { data: file, error: downloadError } = await authResult.auth.supabase.storage
            .from(GENERATION_BUCKET)
            .download(sourceVersion.storage_path);
          if (downloadError || !file) {
            return jsonError("Source image for this edit could not be used.", 400);
          }
          referenceImages.push({
            bytes: new Uint8Array(await file.arrayBuffer()),
            filename: sourceVersion.storage_path.split("/").pop() ?? "source.png",
            mimeType: file.type || "image/png",
          });
        }

        for (const path of req.referenceAssetIds) {
          const { data: file, error: downloadError } = await authResult.auth.supabase.storage
            .from(GENERATION_BUCKET)
            .download(path);
          if (downloadError || !file) return jsonError("Reference image could not be used.", 400);
          referenceImages.push({
            bytes: new Uint8Array(await file.arrayBuffer()),
            filename: path.split("/").pop() ?? "reference.png",
            mimeType: file.type || "image/png",
          });
        }

        const waitUntilCtx = (request as unknown as { cloudflare?: { ctx?: WaitUntilContext } })
          .cloudflare?.ctx;
        const executor = waitUntilCtx
          ? createWaitUntilExecutor(waitUntilCtx)
          : // Local dev (vite dev) has no Cloudflare ExecutionContext. Falling
            // back to the inline executor means the job actually runs during
            // local QA instead of sitting queued forever — real production
            // behavior still requires waitUntilCtx (or Queues/Workflows) and
            // must not silently rely on this path once deployed.
            createInlineExecutor();
        executor.schedule(() =>
          runGenerationJob(
            {
              id: row.job_id,
              userId,
              sessionId: session.id,
              operation: req.operation,
              model,
              prompt: req.prompt,
              width: req.size.width,
              height: req.size.height,
              idempotencyKey: req.idempotencyKey,
              referenceImages,
            },
            req.sourceVersionId,
            {
              data: createSupabaseDataAccess(authResult.auth.supabase),
              apiKey,
              decodeBase64: (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)),
            },
          ).then(() => undefined),
        );

        return new Response(
          JSON.stringify({ jobId: row.job_id, sessionId: session.id, status: "queued" }),
          { status: 202, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      },
    },
  },
});
