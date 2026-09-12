import { createFileRoute } from "@tanstack/react-router";
import { getBillingContext } from "@/lib/billing/server";
import { verifyStripeEvent } from "@/lib/billing/stripe";
import { processStripeEvent } from "@/lib/billing/sync";

/**
 * POST /api/public/billing/webhook — the authoritative source of billing truth.
 *
 * Lives under /api/public/* so Stripe can reach it on preview and published
 * hosts without hitting the site auth wall. Authentication is the Stripe
 * signature: the raw body is verified against STRIPE_WEBHOOK_SECRET before
 * anything is processed, and every downstream credit mutation is idempotent
 * by ledger key, so duplicate or out-of-order deliveries cannot double-grant.
 */
export const Route = createFileRoute("/api/public/billing/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const billing = getBillingContext();
        if (!billing.ok) return new Response("Billing not configured", { status: 503 });
        const { stripe, env, sync } = billing.ctx;

        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Missing signature", { status: 400 });
        const rawBody = await request.text();

        let event;
        try {
          event = await verifyStripeEvent(stripe, rawBody, signature, env.stripeWebhookSecret);
        } catch (err) {
          console.warn("billing: webhook signature rejected", (err as Error).message);
          return new Response("Invalid signature", { status: 400 });
        }

        try {
          const result = await processStripeEvent(event, sync);
          return Response.json({ received: true, ...result });
        } catch (err) {
          console.error(`billing: webhook ${event.type} ${event.id} failed`, err);
          return new Response("Handler failed", { status: 500 });
        }
      },
    },
  },
});
