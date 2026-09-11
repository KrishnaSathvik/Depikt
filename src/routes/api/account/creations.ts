import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, jsonError } from "@/lib/api/public-route";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { asProfileClient } from "@/lib/profile/db-types";
import { GENERATION_BUCKET } from "@/lib/generation/storage-paths";
import type { CreationItem, CreationsPage } from "@/lib/profile/client";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;

interface CreationRow {
  id: string;
  job_id: string | null;
  storage_path: string;
  width: number;
  height: number;
  prompt: string;
  model: "flare" | "sunburst";
  created_at: string;
  parent_version_id: string | null;
  generation_jobs: { operation: "generate" | "edit" } | { operation: "generate" | "edit" }[] | null;
}

function operationOf(row: CreationRow): "generate" | "edit" | null {
  const j = row.generation_jobs;
  if (!j) return null;
  return Array.isArray(j) ? (j[0]?.operation ?? null) : j.operation;
}

/**
 * GET /api/account/creations?cursor=&type=all|generated|edited&limit=
 *
 * Every successful image_versions row the caller owns (RLS-enforced,
 * mirrors the read path in sessions.$id.ts / jobs.$id.ts), newest first,
 * cursor-paginated on created_at. Returns only what the Creations grid and
 * detail view need — no estimated API cost, no provider diagnostics, no
 * other user's data.
 */
export const Route = createFileRoute("/api/account/creations")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const authResult = await authenticateGenerationRequest(request);
        if (!authResult.ok) return jsonError(authResult.error, authResult.status);
        const db = asProfileClient(authResult.auth.supabase);

        const url = new URL(request.url);
        const cursor = url.searchParams.get("cursor");
        const type = url.searchParams.get("type");
        const limitParam = Number(url.searchParams.get("limit"));
        const limit =
          Number.isFinite(limitParam) && limitParam > 0
            ? Math.min(Math.floor(limitParam), MAX_LIMIT)
            : DEFAULT_LIMIT;

        // image_versions has two FKs to generation_jobs (its own job_id, and
        // an edit's source_version_id pointing at a *different* row's job),
        // so PostgREST can't infer which relationship "generation_jobs"
        // means and 400s with PGRST201. Name the FK explicitly: the row's
        // own job, via image_versions.job_id -> generation_jobs.id.
        let query = db
          .from("image_versions")
          .select(
            "id, job_id, storage_path, width, height, prompt, model, created_at, parent_version_id, generation_jobs!image_versions_job_id_fkey!inner(operation)",
          )
          .order("created_at", { ascending: false })
          .limit(limit + 1);

        if (cursor) query = query.lt("created_at", cursor);
        if (type === "generated") query = query.eq("generation_jobs.operation", "generate");
        if (type === "edited") query = query.eq("generation_jobs.operation", "edit");

        const { data, error } = await query;
        if (error) {
          console.error("GET /api/account/creations:", error);
          return jsonError("Could not load your creations.", 500);
        }

        const rows = (data ?? []) as unknown as CreationRow[];
        const hasMore = rows.length > limit;
        const page = hasMore ? rows.slice(0, limit) : rows;

        const items: CreationItem[] = await Promise.all(
          page.map(async (row) => {
            const { data: signed } = await authResult.auth.supabase.storage
              .from(GENERATION_BUCKET)
              .createSignedUrl(row.storage_path, 600);
            return {
              id: row.id,
              jobId: row.job_id,
              url: signed?.signedUrl ?? null,
              width: row.width,
              height: row.height,
              prompt: row.prompt,
              model: row.model,
              createdAt: row.created_at,
              operation: operationOf(row),
              parentVersionId: row.parent_version_id,
            };
          }),
        );

        const body: CreationsPage = {
          items,
          nextCursor: hasMore ? page[page.length - 1].created_at : null,
        };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      },
    },
  },
});
