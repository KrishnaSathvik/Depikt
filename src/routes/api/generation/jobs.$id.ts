import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, jsonError } from "@/lib/api/public-route";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { asGenerationClient } from "@/lib/generation/db-types";
import { GENERATION_BUCKET } from "@/lib/generation/storage-paths";
import { createSignedUrlWithTimeout } from "@/lib/generation/signed-url";
import {
  failAndRefundStaleJob,
  settleSucceededJobCredits,
  STALE_ERROR_MESSAGE,
  type StaleJob,
} from "@/lib/generation/stale-job";

/**
 * GET /api/generation/jobs/:id — poll a job's status.
 *
 * RLS (generation_jobs_owner_read, see 20260910120000_add_image_generation.sql)
 * is what actually prevents a user from polling someone else's job — the
 * query below returns zero rows for a job it doesn't own rather than this
 * code needing to check ownership itself. UNVERIFIED against a live
 * deployment; see jobs.ts for the same caveat.
 */
export const Route = createFileRoute("/api/generation/jobs/$id")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request, params }) => {
        if (!isNativeGenerationEnabled()) return jsonError("Not found", 404);

        const authResult = await authenticateGenerationRequest(request);
        if (!authResult.ok) return jsonError(authResult.error, authResult.status);
        const supabase = asGenerationClient(authResult.auth.supabase);

        const { data: job, error } = await supabase
          .from("generation_jobs")
          .select(
            "id, user_id, status, operation, model, width, height, error_code, safe_error_message, session_id, idempotency_key, created_at, completed_at, usage_json",
          )
          .eq("id", params.id)
          .maybeSingle();

        if (error) return jsonError("Could not load the job", 500);
        if (!job) return jsonError("Not found", 404);

        let staleResult;
        try {
          staleResult = await failAndRefundStaleJob(supabase, job as StaleJob);
        } catch {
          return jsonError("Could not update the job", 500);
        }
        job.status = staleResult.status;
        if (staleResult.applied) {
          job.safe_error_message = STALE_ERROR_MESSAGE;
        } else if (staleResult.status === "failed") {
          job.safe_error_message = staleResult.safe_error_message;
        }

        await settleSucceededJobCredits(supabase, job as StaleJob);

        let version: { id: string; storage_path: string; width: number; height: number } | null =
          null;
        if (job.status === "succeeded") {
          const { data: v } = await supabase
            .from("image_versions")
            .select("id, storage_path, width, height")
            .eq("job_id", job.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          version = v ?? null;
        }

        let signedUrl: string | null = null;
        if (version) {
          signedUrl = await createSignedUrlWithTimeout(() =>
            supabase.storage.from(GENERATION_BUCKET).createSignedUrl(version.storage_path, 600),
          );
        }

        return new Response(
          JSON.stringify({
            ...(job.usage_json?.validation ? { validation: job.usage_json.validation } : {}),
            jobId: job.id,
            sessionId: job.session_id,
            status: job.status,
            operation: job.operation,
            model: job.model,
            width: job.width,
            height: job.height,
            errorMessage: job.status === "failed" ? job.safe_error_message : null,
            result: version
              ? {
                  versionId: version.id,
                  url: signedUrl,
                  width: version.width,
                  height: version.height,
                }
              : null,
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      },
    },
  },
});
