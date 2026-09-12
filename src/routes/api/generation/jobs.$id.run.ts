import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, jsonError } from "@/lib/api/public-route";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { asGenerationClient } from "@/lib/generation/db-types";
import { GENERATION_BUCKET } from "@/lib/generation/storage-paths";
import { runGenerationJob } from "@/lib/generation/job-pipeline";
import { createSupabaseDataAccess } from "@/lib/generation/supabase-data-access";
import type { ModelAlias } from "@/lib/generation/models";

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
        if (!authResult.ok) return jsonError(authResult.error, authResult.status);
        const { userId } = authResult.auth;
        const supabase = asGenerationClient(authResult.auth.supabase);

        let referencePaths: string[] = [];
        try {
          const body = (await request.json()) as { referencePaths?: unknown };
          if (Array.isArray(body?.referencePaths)) {
            referencePaths = body.referencePaths.filter((p): p is string => typeof p === "string");
          }
        } catch {
          /* no body is fine: a plain generate has no references */
        }

        const { data: job, error } = await supabase
          .from("generation_jobs")
          .select(
            "id, user_id, session_id, operation, model, prompt, width, height, idempotency_key, source_version_id, status",
          )
          .eq("id", params.id)
          .maybeSingle();
        if (error) return jsonError("Could not load the job", 500);
        if (!job) return jsonError("Not found", 404);

        // Claim it. Anything other than `queued` means someone else is on it.
        const { data: claimed } = await supabase
          .from("generation_jobs")
          .update({ status: "running", started_at: new Date().toISOString() })
          .eq("id", job.id)
          .eq("status", "queued")
          .select("id")
          .maybeSingle();
        if (!claimed) {
          return new Response(JSON.stringify({ claimed: false, status: job.status }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
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

        const referenceImages: { bytes: Uint8Array; filename: string; mimeType: string }[] = [];
        const download = async (path: string) => {
          const { data: file } = await authResult.auth.supabase.storage
            .from(GENERATION_BUCKET)
            .download(path);
          if (!file) return false;
          referenceImages.push({
            bytes: new Uint8Array(await file.arrayBuffer()),
            filename: path.split("/").pop() ?? "image.png",
            mimeType: file.type || "image/png",
          });
          return true;
        };

        if (job.operation === "edit" && job.source_version_id) {
          const { data: sourceVersion } = await supabase
            .from("image_versions")
            .select("storage_path")
            .eq("id", job.source_version_id)
            .maybeSingle();
          if (sourceVersion) await download(sourceVersion.storage_path as string);
        }
        for (const path of referencePaths) await download(path);

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
