import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, jsonError } from "@/lib/api/public-route";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { asProfileClient } from "@/lib/profile/db-types";
import { UUID_RE } from "@/lib/generation/entities";
import { GENERATION_BUCKET, ownerOfStoragePath } from "@/lib/generation/storage-paths";

const deleteHeaders = {
  ...corsHeaders,
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
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
