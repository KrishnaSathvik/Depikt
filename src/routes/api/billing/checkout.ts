import { createFileRoute } from "@tanstack/react-router";
import { jsonError } from "@/lib/api/public-route";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { CATALOG, isProductKey } from "@/lib/billing/plans";
import { ensureStripeCustomer } from "@/lib/billing/customer";
import { getBillingContext, requestOrigin } from "@/lib/billing/server";
import { ROUTES } from "@/lib/product";

/**
 * POST /api/billing/checkout { productKey }
 *
 * The browser sends an internal catalog key only. The server resolves the
 * Stripe Price, the Stripe customer, and the mode (subscription for plans,
 * one-time payment for packs) and returns the hosted Checkout URL. The
 * success redirect is never proof of payment — the webhook and the Account
 * landing-page confirmation both run the same idempotent fulfillment.
 */
export const Route = createFileRoute("/api/billing/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authResult = await authenticateGenerationRequest(request);
        if (!authResult.ok) return jsonError(authResult.error, authResult.status);
        const { userId } = authResult.auth;

        let body: { productKey?: unknown } = {};
        try {
          body = (await request.json()) as { productKey?: unknown };
        } catch {
          return jsonError("Invalid JSON body", 400);
        }
        if (!isProductKey(body.productKey)) return jsonError("Unknown product", 400);
        const product = CATALOG[body.productKey];

        const billing = getBillingContext();
        if (!billing.ok) return billing.response;
        const { stripe, env, sync } = billing.ctx;

        const { data: userData } = await authResult.auth.supabase.auth.getUser();
        const email = userData.user?.email ?? null;
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
          { id: userId, email },
        );

        const origin = requestOrigin(request);
        const priceId = env.priceIds[product.key];
        const common = {
          customer: customerId,
          client_reference_id: userId,
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${origin}${ROUTES.account}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}${ROUTES.pricing}`,
          allow_promotion_codes: true,
          ...(env.automaticTax ? { automatic_tax: { enabled: true } } : {}),
        };

        try {
          const session =
            product.kind === "plan"
              ? await stripe.checkout.sessions.create({
                  ...common,
                  mode: "subscription",
                  metadata: { supabase_user_id: userId, product_key: product.key },
                  subscription_data: { metadata: { supabase_user_id: userId } },
                })
              : await stripe.checkout.sessions.create({
                  ...common,
                  mode: "payment",
                  metadata: {
                    supabase_user_id: userId,
                    product_key: product.key,
                    pack_key: product.key,
                    credits: String(product.credits),
                  },
                  payment_intent_data: {
                    metadata: { supabase_user_id: userId, pack_key: product.key },
                  },
                });
          if (!session.url) return jsonError("Could not start checkout", 502);
          return Response.json({ url: session.url, sessionId: session.id });
        } catch (err) {
          console.error("billing: checkout session failed", err);
          return jsonError("Could not start checkout", 502);
        }
      },
    },
  },
});
