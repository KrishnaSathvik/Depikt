import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, jsonError } from "@/lib/api/public-route";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { automaticRepairEnabled } from "@/lib/generation/economic-policy";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { asGenerationClient } from "@/lib/generation/db-types";
import { refineGenerationSession } from "@/lib/generation/validation/session-repair";
/** Automatic resume hook; no client-selected image, repair instruction or budget is accepted. */
export const Route = createFileRoute("/api/generation/sessions/$id/refine")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request, params }) => {
        if (!isNativeGenerationEnabled() || !automaticRepairEnabled())
          return jsonError("Not found", 404);
        const auth = await authenticateGenerationRequest(request);
        if (!auth.ok) return jsonError(auth.error, auth.status);
        const apiKey = process.env.OPENAI_API_KEY,
          secret = process.env.GENERATION_PLAN_SECRET;
        if (!apiKey || !secret) return jsonError("Temporarily unavailable", 503);
        try {
          await refineGenerationSession({
            db: asGenerationClient(auth.auth.supabase),
            userId: auth.auth.userId,
            sessionId: params.id,
            apiKey,
            secret,
          });
        } catch {
          return jsonError("Could not finish refinement", 503);
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      },
    },
  },
});
