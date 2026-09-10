import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, jsonError } from "@/lib/api/public-route";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { asGenerationClient } from "@/lib/generation/db-types";
import { GENERATION_BUCKET } from "@/lib/generation/storage-paths";

/**
 * GET /api/generation/sessions/:id — every version in one creative thread,
 * for the version strip. Ownership enforced by RLS the same way as
 * jobs.$id.ts; this handler doesn't decide who can see what.
 */
export const Route = createFileRoute("/api/generation/sessions/$id")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request, params }) => {
        if (!isNativeGenerationEnabled()) return jsonError("Not found", 404);

        const authResult = await authenticateGenerationRequest(request);
        if (!authResult.ok) return jsonError(authResult.error, authResult.status);
        const supabase = asGenerationClient(authResult.auth.supabase);

        const { data: versions, error } = await supabase
          .from("image_versions")
          .select("id, parent_version_id, storage_path, width, height, prompt, model, created_at")
          .eq("session_id", params.id)
          .order("created_at", { ascending: true });

        if (error) return jsonError("Could not load session versions", 500);

        const withUrls = await Promise.all(
          (versions ?? []).map(async (v: { storage_path: string; [k: string]: unknown }) => {
            const { data: signed } = await supabase.storage
              .from(GENERATION_BUCKET)
              .createSignedUrl(v.storage_path, 600);
            return { ...v, url: signed?.signedUrl ?? null };
          }),
        );

        return new Response(JSON.stringify({ sessionId: params.id, versions: withUrls }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      },
    },
  },
});
