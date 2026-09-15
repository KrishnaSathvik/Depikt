import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, jsonError } from "@/lib/api/public-route";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { asGenerationClient } from "@/lib/generation/db-types";
import { GENERATION_BUCKET } from "@/lib/generation/storage-paths";
import { runGenerationJob } from "@/lib/generation/job-pipeline";
import { createSupabaseDataAccess } from "@/lib/generation/supabase-data-access";
import type { ModelAlias } from "@/lib/generation/models";
import { classifyJobClaimResult, duplicateStartResponse } from "@/lib/generation/series-resume";
import {
  extractStoredReferenceAssetIds,
  extractStoredMaskPath,
} from "@/lib/generation/execution-plan";
import { assembleJobImages, type StoredImage } from "@/lib/generation/job-images";

/**
 * POST /api/generation/jobs/:id/run — execute a queued job.
 *
 * Why this exists: this deployment has no Cloudflare ExecutionContext
 * (`waitUntil`) reachable from a TanStack file route, and no Queues binding.
 * Fire-and-forget work therefore dies with the isolate the moment the create
 * response is returned, which left jobs stuck in `queued` forever with a
 * credit still reserved. Instead the browser opens this second, long-lived
 * request and the work happens *inside* it, so the platform keeps the isolate
 * alive until OpenAI answers. The client does not await it — it polls
 * /api/generation/jobs/:id as before.
 *
 * Claiming is a conditional queued -> running update, so two callers (retry,
 * double-submit, a second tab) can never run the same job twice.
 */
export const Route = createFileRoute("/api/generation/jobs/$id/run")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request, params }) => {
        if (!isNativeGenerationEnabled()) return jsonError("Not found", 404);

        const authResult = await authenticateGenerationRequest(request);
        if (!authResult.ok) {
          return jsonError(authResult.error, authResult.status);
        }
        const { userId } = authResult.auth;
        const supabase = asGenerationClient(authResult.auth.supabase);

        const { data: job, error } = await supabase
          .from("generation_jobs")
          .select(
            "id, user_id, session_id, operation, model, prompt, width, height, idempotency_key, source_version_id, status",
          )
          .eq("id", params.id)
          .maybeSingle();
        if (error) return jsonError("Could not load the job", 500);
        if (!job) return jsonError("Not found", 404);

        // The reference and mask paths to attach are never taken from the
        // request body -- a stale/crafted client could otherwise ask this
        // route to download and attach an arbitrary storage path. A
        // body.maskPath would be ignored because this handler never reads
        // request JSON. The only trusted source is the list the signed plan
        // token carried at job-creation time, persisted on the job's own
        // session -- see execution-plan.ts and jobs.ts.
        const { data: session, error: sessionLoadError } = await supabase
          .from("generation_sessions")
          .select("plan_json")
          .eq("id", job.session_id as string)
          .maybeSingle();
        if (sessionLoadError) return jsonError("Could not load the session", 500);
        const referencePaths = extractStoredReferenceAssetIds(session?.plan_json);
        const maskPath = extractStoredMaskPath(session?.plan_json);

        // Claim it. Anything other than `queued` means someone else is on it.
        const claimResult = await supabase
          .from("generation_jobs")
          .update({ status: "running", started_at: new Date().toISOString() })
          .eq("id", job.id)
          .eq("status", "queued")
          .select("id")
          .maybeSingle();
        const claimOutcome = classifyJobClaimResult(claimResult);
        switch (claimOutcome) {
          case "error":
            return jsonError("Could not claim the job", 500);
          case "duplicate":
            return duplicateStartResponse(job.status as string, corsHeaders);
          case "claimed":
            break;
          default: {
            const _exhaustive: never = claimOutcome;
            return _exhaustive;
          }
        }

        const apiKey = process.env.OPENAI_API_KEY;
        const data = createSupabaseDataAccess(authResult.auth.supabase);
        if (!apiKey) {
          await data
            .markJobFailed(job.id, {
              errorCode: "unavailable",
              safeErrorMessage: "Generation is temporarily unavailable.",
            })
            .catch(() => {});
          await data
            .finalizeCredits(userId, 1, job.idempotency_key as string, "refunded", job.id)
            .catch(() => {});
          return jsonError("Generation is temporarily unavailable.", 503);
        }

        const download = async (path: string): Promise<StoredImage | null> => {
          const { data: file } = await authResult.auth.supabase.storage
            .from(GENERATION_BUCKET)
            .download(path);
          if (!file) return null;
          return {
            bytes: new Uint8Array(await file.arrayBuffer()),
            filename: path.split("/").pop() ?? "image.png",
            mimeType: file.type || "image/png",
          };
        };

        let sourcePath: string | null = null;
        if (job.operation === "edit" && job.source_version_id) {
          const { data: sourceVersion } = await supabase
            .from("image_versions")
            .select("storage_path")
            .eq("id", job.source_version_id)
            .maybeSingle();
          if (sourceVersion) sourcePath = (sourceVersion.storage_path as string) ?? null;
        }
        let referenceImages: StoredImage[];
        let editMask: StoredImage | null;
        try {
          const assembled = await assembleJobImages({
            download,
            sourcePath,
            referencePaths,
            maskPath,
          });
          referenceImages = assembled.referenceImages;
          editMask = assembled.editMask;
        } catch {
          await data
            .markJobFailed(job.id, {
              errorCode: "mask_unavailable",
              safeErrorMessage: "Could not load the selected region.",
            })
            .catch(() => {});
          await data
            .finalizeCredits(userId, 1, job.idempotency_key as string, "refunded", job.id)
            .catch(() => {});
          return jsonError("Could not load the selected region.", 500);
        }

        const outcome = await runGenerationJob(
          {
            id: job.id as string,
            userId,
            sessionId: job.session_id as string,
            operation: job.operation as "generate" | "edit",
            model: job.model as ModelAlias,
            prompt: job.prompt as string,
            width: job.width as number,
            height: job.height as number,
            idempotencyKey: job.idempotency_key as string,
            referenceImages,
            editMask,
          },
          (job.source_version_id as string | null) ?? null,
          {
            data,
            apiKey,
            decodeBase64: (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)),
          },
        );

        return new Response(JSON.stringify({ claimed: true, ...outcome }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      },
    },
  },
});
