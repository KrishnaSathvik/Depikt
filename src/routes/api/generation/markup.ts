import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, jsonError, getClientIp, rateLimitExceeded } from "@/lib/api/public-route";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { asGenerationClient } from "@/lib/generation/db-types";
import { GENERATION_BUCKET, markupAssetStoragePath } from "@/lib/generation/storage-paths";
import { validateMarkupPng, MAX_MARKUP_BYTES } from "@/lib/generation/markup";
import { readBoundedJson } from "@/lib/generation/bounded-json";

export const Route = createFileRoute("/api/generation/markup")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        if (!isNativeGenerationEnabled()) return jsonError("Not found", 404);
        if (rateLimitExceeded(getClientIp(request)))
          return jsonError("Please wait and try again.", 429);
        const auth = await authenticateGenerationRequest(request);
        if (!auth.ok) return jsonError(auth.error, auth.status);
        if (Number(request.headers.get("content-length")) > MAX_MARKUP_BYTES * 1.4)
          return jsonError("Markup is too large", 413);
        const db = asGenerationClient(auth.auth.supabase);
        try {
          const body = (await readBoundedJson(request, MAX_MARKUP_BYTES * 1.4 + 4096)) as Record<
            string,
            unknown
          >;
          if (
            "path" in body ||
            "markupPath" in body ||
            typeof body.sourceVersionId !== "string" ||
            typeof body.dataUrl !== "string"
          )
            return jsonError("Invalid markup upload", 400);
          const match = body.dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
          if (!match || !match[1] || match[1].length > MAX_MARKUP_BYTES * 1.4)
            return jsonError("Invalid markup PNG", 400);
          const { data: source, error } = await db
            .from("image_versions")
            .select("width, height, mime_type")
            .eq("id", body.sourceVersionId)
            .eq("user_id", auth.auth.userId)
            .maybeSingle();
          if (error || !source) return jsonError("Source version not found", 404);
          if (source.mime_type !== "image/png")
            return jsonError("Markup requires a PNG source", 400);
          const bytes = Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0));
          validateMarkupPng(bytes, source.width, source.height);
          const assetId = crypto.randomUUID();
          const { error: uploadError } = await db.storage
            .from(GENERATION_BUCKET)
            .upload(markupAssetStoragePath(auth.auth.userId, assetId), bytes, {
              contentType: "image/png",
              upsert: false,
            });
          if (uploadError) return jsonError("Could not save annotations", 500);
          return new Response(JSON.stringify({ assetId }), {
            status: 201,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch {
          return jsonError("Invalid or misaligned annotations", 400);
        }
      },
    },
  },
});
