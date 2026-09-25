import { savedCreationDetails, type SavedJob } from "@/lib/profile/creation-detail";
import type { CreationItem } from "@/lib/profile/client";
import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, jsonError } from "@/lib/api/public-route";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { asProfileClient } from "@/lib/profile/db-types";
import { UUID_RE } from "@/lib/generation/entities";
import { GENERATION_BUCKET, ownerOfStoragePath } from "@/lib/generation/storage-paths";

const deleteHeaders = {
  ...corsHeaders,
  "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
};

/**
 * DELETE /api/account/creations/:id
 *
 * Removes one image_versions row the caller owns (RLS-enforced) and its
 * storage object. Jobs and credit ledger stay put; child edits keep their
 * rows with parent/source FKs nulled by the migration.
 */
export const Route = createFileRoute("/api/account/creations/$id")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: deleteHeaders }),
      GET: async ({ request, params }) => {
        const authResult = await authenticateGenerationRequest(request);
        if (!authResult.ok) return jsonError(authResult.error, authResult.status);
        if (!UUID_RE.test(params.id)) return jsonError("Not found", 404);
        const { userId, supabase } = authResult.auth;
        const db = asProfileClient(supabase);
        const { data: selected, error: selectedError } = await db
          .from("image_versions")
          .select("session_id")
          .eq("id", params.id)
          .eq("user_id", userId)
          .maybeSingle();
        if (selectedError) return jsonError("Could not load image details", 500);
        if (!selected) return jsonError("Not found", 404);
        // Read-only account history: no job settlement, refunds, or provider calls.
        const [versions, jobs, session] = await Promise.all([
          db
            .from("image_versions")
            .select(
              "id, job_id, session_id, storage_path, width, height, prompt, model, created_at, parent_version_id",
            )
            .eq("session_id", selected.session_id)
            .eq("user_id", userId)
            .order("created_at", { ascending: true }),
          db
            .from("generation_jobs")
            .select("id, operation, status, series_index, series_label, usage_json")
            .eq("session_id", selected.session_id)
            .eq("user_id", userId),
          db
            .from("generation_sessions")
            .select("plan_json")
            .eq("id", selected.session_id)
            .eq("user_id", userId)
            .maybeSingle(),
        ]);
        if (versions.error || jobs.error || session.error)
          return jsonError("Could not load image details", 500);
        const jobRows = (jobs.data ?? []) as (SavedJob & {
          status: string;
          series_index: number | null;
          series_label: string | null;
        })[];
        const items: CreationItem[] = await Promise.all(
          (versions.data ?? [])
            .filter((row) =>
              jobRows.some((job) => job.id === row.job_id && job.status === "succeeded"),
            )
            .map(async (row) => {
              const job = jobRows.find((job) => job.id === row.job_id);
              const path = row.storage_path as string;
              const signed =
                ownerOfStoragePath(path) === userId && !path.includes("..")
                  ? await supabase.storage.from(GENERATION_BUCKET).createSignedUrl(path, 600)
                  : null;
              return {
                id: row.id,
                jobId: row.job_id,
                sessionId: row.session_id,
                url: signed?.data?.signedUrl ?? null,
                width: row.width,
                height: row.height,
                prompt: row.prompt,
                model: row.model,
                createdAt: row.created_at,
                parentVersionId: row.parent_version_id,
                operation: job?.operation ?? null,
                seriesIndex: job?.series_index ?? null,
                seriesLabel: job?.series_label ?? null,
              };
            }),
        );
        return new Response(
          JSON.stringify(savedCreationDetails(items, jobRows, session.data?.plan_json)),
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "private, no-store",
              ...deleteHeaders,
            },
          },
        );
      },
      DELETE: async ({ request, params }) => {
        const authResult = await authenticateGenerationRequest(request);
        if (!authResult.ok) return jsonError(authResult.error, authResult.status);
        if (!UUID_RE.test(params.id)) return jsonError("Not found", 404);

        const { userId } = authResult.auth;
        const db = asProfileClient(authResult.auth.supabase);

        const { data: row, error: loadError } = await db
          .from("image_versions")
          .select("id, storage_path")
          .eq("id", params.id)
          .eq("user_id", userId)
          .maybeSingle();
        if (loadError) {
          console.error("DELETE /api/account/creations:", loadError);
          return jsonError("Could not delete this image.", 500);
        }
        if (!row) return jsonError("Not found", 404);

        const path = row.storage_path as string;
        if (
          ownerOfStoragePath(path) !== userId ||
          !path.startsWith(`users/${userId}/sessions/`) ||
          path.includes("..")
        ) {
          return jsonError("Not found", 404);
        }

        const { error: storageError } = await authResult.auth.supabase.storage
          .from(GENERATION_BUCKET)
          .remove([path]);
        if (storageError) {
          console.error("DELETE /api/account/creations storage:", storageError);
          return jsonError("Could not delete this image.", 500);
        }

        const { error: deleteError } = await db
          .from("image_versions")
          .delete()
          .eq("id", params.id)
          .eq("user_id", userId);
        if (deleteError) {
          console.error("DELETE /api/account/creations row:", deleteError);
          return jsonError("Could not delete this image.", 500);
        }

        return new Response(JSON.stringify({ deleted: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...deleteHeaders },
        });
      },
    },
  },
});
