import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, jsonError } from "@/lib/api/public-route";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { asGenerationClient } from "@/lib/generation/db-types";
import { GENERATION_BUCKET } from "@/lib/generation/storage-paths";

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
            "id, user_id, status, operation, model, width, height, error_code, safe_error_message, session_id, idempotency_key, created_at, completed_at",
          )
          .eq("id", params.id)
          .maybeSingle();

        if (error) return jsonError("Could not load the job", 500);
        if (!job) return jsonError("Not found", 404);

        // Give up on a job that can never finish. The worker running it can
        // die (deploy, isolate eviction, a dropped run request) leaving the
        // row `queued`/`running` forever with a credit still reserved — the
        // UI would then poll indefinitely. Past the cap, fail it and refund.
        const STALE_MS = 6 * 60 * 1000;
        if (
          (job.status === "queued" || job.status === "running") &&
          Date.now() - new Date(job.created_at as string).getTime() > STALE_MS
        ) {
          await supabase
            .from("generation_jobs")
            .update({
              status: "failed",
              completed_at: new Date().toISOString(),
              error_code: "timed_out",
              safe_error_message: "Generation timed out. Your credit was returned.",
            })
            .eq("id", job.id)
            .in("status", ["queued", "running"]);
          await supabase
            .rpc("finalize_generation_credits", {
              p_user_id: job.user_id as string,
              p_amount: 1,
              p_idempotency_key: job.idempotency_key as string,
              p_outcome: "refunded",
              p_job_id: job.id as string,
            })
            .then(
              () => undefined,
              () => undefined,
            );
          job.status = "failed";
          job.safe_error_message = "Generation timed out. Your credit was returned.";
        }


        let version: { id: string; storage_path: string; width: number; height: number } | null =
          null;
        if (job.status === "succeeded") {
          const { data: v } = await supabase
            .from("image_versions")
            .select("id, storage_path, width, height")
            .eq("job_id", job.id)
            .maybeSingle();
          version = v ?? null;
        }

        let signedUrl: string | null = null;
        if (version) {
          const { data: signed } = await supabase.storage
            .from(GENERATION_BUCKET)
            .createSignedUrl(version.storage_path, 600); // 10 minutes; re-signed on each poll/reload, never persisted
          signedUrl = signed?.signedUrl ?? null;
        }

        return new Response(
          JSON.stringify({
            jobId: job.id,
            sessionId: job.session_id,
            status: job.status,
            operation: job.operation,
            model: job.model,
            width: job.width,
            height: job.height,
            errorMessage: job.status === "failed" ? job.safe_error_message : null,
            result:
              version && signedUrl
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
