import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, jsonError } from "@/lib/api/public-route";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { asGenerationClient } from "@/lib/generation/db-types";

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
            "id, status, operation, model, width, height, error_code, safe_error_message, session_id, created_at, completed_at",
          )
          .eq("id", params.id)
          .maybeSingle();

        if (error) return jsonError("Could not load the job", 500);
        if (!job) return jsonError("Not found", 404);

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
            .from("generation-assets")
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
