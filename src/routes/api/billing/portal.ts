import { createFileRoute } from "@tanstack/react-router";
import { jsonError } from "@/lib/api/public-route";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { ensureStripeCustomer } from "@/lib/billing/customer";
import { getBillingContext, requestOrigin } from "@/lib/billing/server";
import { ROUTES } from "@/lib/product";

/**
 * POST /api/billing/portal — Stripe Customer Portal session for the caller.
 * Payment methods, invoices, cancel/reactivate, and plan switches all live
 * in the portal; Depikt does not rebuild any of that UI.
 */
export const Route = createFileRoute("/api/billing/portal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authResult = await authenticateGenerationRequest(request);
        if (!authResult.ok) return jsonError(authResult.error, authResult.status);
        const { userId } = authResult.auth;

        const billing = getBillingContext();
        if (!billing.ok) return billing.response;
        const { stripe, sync } = billing.ctx;

        const { data: userData } = await authResult.auth.supabase.auth.getUser();
        const customerId = await ensureStripeCustomer(
          {
            store: sync.store,
            stripe: {
              createCustomer: (input) =>
                stripe.customers.create({
                  email: input.email ?? undefined,
                  metadata: input.metadata,
                }),
            },
          },
          { id: userId, email: userData.user?.email ?? null },
        );

        try {
          const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${requestOrigin(request)}${ROUTES.account}`,
          });
          return Response.json({ url: session.url });
        } catch (err) {
          console.error("billing: portal session failed", err);
          return jsonError("Could not open billing", 502);
        }
      },
    },
  },
});
