import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, jsonError } from "@/lib/api/public-route";
import { isNativeGenerationEnabled } from "@/lib/generation/feature-flag";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { asGenerationClient } from "@/lib/generation/db-types";

/** GET /api/generation/credits — the caller's own authoritative balance. Never trust a client-cached number for this. */
export const Route = createFileRoute("/api/generation/credits")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        if (!isNativeGenerationEnabled()) return jsonError("Not found", 404);

        const authResult = await authenticateGenerationRequest(request);
        if (!authResult.ok) return jsonError(authResult.error, authResult.status);
        const { userId } = authResult.auth;
        const supabase = asGenerationClient(authResult.auth.supabase);

        const { data, error } = await supabase
          .from("credit_accounts")
          .select("available_credits")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) return jsonError("Could not load credit balance", 500);

        return new Response(JSON.stringify({ availableCredits: data?.available_credits ?? 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      },
    },
  },
});
