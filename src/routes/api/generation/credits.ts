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

        // Annual subscribers receive credits monthly: settle anything due
        // before reading. Never fatal (RPC missing → balance still returned).
        await supabase.rpc("grant_due_subscription_credits").then(
          () => undefined,
          () => undefined,
        );

        const [{ data, error }, { data: billing }] = await Promise.all([
          supabase
            .from("credit_accounts")
            .select("available_credits, plan_credits, extra_credits")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("billing_accounts")
            .select("plan_key, stripe_customer_id")
            .eq("user_id", userId)
            .maybeSingle(),
        ]);

        if (error) return jsonError("Could not load credit balance", 500);

        const body = {
          availableCredits: data?.available_credits ?? 0,
          planCredits: data?.plan_credits ?? 0,
          extraCredits: data?.extra_credits ?? 0,
          plan: billing?.plan_key ?? "free",
          hasStripeCustomer: Boolean(billing?.stripe_customer_id),
        };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      },
    },
  },
});
