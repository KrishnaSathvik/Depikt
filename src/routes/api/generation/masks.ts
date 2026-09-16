import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, getClientIp, jsonError, rateLimitExceeded } from "@/lib/api/public-route";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { MAX_MASK_BYTES, validateMaskUploadRequest } from "@/lib/generation/mask-upload-request";
import { validateMaskPng } from "@/lib/generation/png-mask";
import { GENERATION_BUCKET, maskAssetStoragePath } from "@/lib/generation/storage-paths";
import { asGenerationClient } from "@/lib/generation/db-types";

/**
 * POST /api/generation/masks — upload one precision-edit mask bound to a
 * source image version. The client sends a PNG data: URL; this route
 * decodes it, checks alpha + source dimensions, and stores it privately
 * at users/<uid>/masks/<assetId>.png. Ownership of the source version is
 * RLS; the browser never supplies a storage path.
 */
export const Route = createFileRoute("/api/generation/masks")({
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

        const validation = validateMaskUploadRequest(body);
        if (!validation.ok) return jsonError(validation.error, 400);
        const { sourceVersionId, bytes } = validation.upload;

        const { data: source, error: sourceError } = await supabase
          .from("image_versions")
          .select("id, user_id, mime_type, width, height")
          .eq("id", sourceVersionId)
          .maybeSingle();
        if (sourceError) return jsonError("Could not load source version", 500);
        if (!source) return jsonError("Source version not found", 404);
        if (source.mime_type !== "image/png") {
          return jsonError("Source version must be a PNG", 400);
        }

        const maskCheck = validateMaskPng(bytes, source.width, source.height, MAX_MASK_BYTES);
        if (!maskCheck.ok) return jsonError(maskCheck.error, 400);

        const assetId = crypto.randomUUID();
        const path = maskAssetStoragePath(userId, assetId);

        const { error: uploadError } = await supabase.storage
          .from(GENERATION_BUCKET)
          .upload(path, bytes, { contentType: "image/png", upsert: false });
        if (uploadError) return jsonError("Could not store the mask", 500);

        return new Response(JSON.stringify({ assetId }), {
          status: 201,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      },
    },
  },
});
