import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, getClientIp, jsonError, rateLimitExceeded } from "@/lib/api/public-route";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { validateReferenceUploadRequest } from "@/lib/generation/reference-upload-request";
import { GENERATION_BUCKET, referenceAssetStoragePath } from "@/lib/generation/storage-paths";
import { asGenerationClient } from "@/lib/generation/db-types";

/**
 * POST /api/generation/references — upload one reference image for later
 * use in a generate/edit job. The client already processes the file
 * through fileToReferenceState (same pipeline Prompt's reference picker
 * uses) and sends a data: URL; this route decodes and stores it privately,
 * scoped to users/<uid>/references/<assetId>.<ext> — ownership is enforced
 * by the RLS policy in 20260910140000_add_generation_storage.sql, verified
 * adversarially there, not by anything this handler decides on its own.
 */
export const Route = createFileRoute("/api/generation/references")({
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

        const validation = validateReferenceUploadRequest(body);
        if (!validation.ok) return jsonError(validation.error, 400);
        const { bytes, mimeType, extension } = validation.upload;

        const assetId = crypto.randomUUID();
        const path = referenceAssetStoragePath(userId, assetId, extension);

        const { error: uploadError } = await supabase.storage
          .from(GENERATION_BUCKET)
          .upload(path, bytes, { contentType: mimeType, upsert: false });
        if (uploadError) return jsonError("Could not store the reference image", 500);

        const { data: signed } = await supabase.storage
          .from(GENERATION_BUCKET)
          .createSignedUrl(path, 600);

        return new Response(
          JSON.stringify({ assetId, path, previewUrl: signed?.signedUrl ?? null }),
          { status: 201, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      },
    },
  },
});
