import { createFileRoute } from "@tanstack/react-router";
import { getBillingContext } from "@/lib/billing/server";
import { verifyStripeEvent } from "@/lib/billing/stripe";
import { processStripeEvent } from "@/lib/billing/sync";

/**
 * POST /api/billing/webhook — the authoritative source of billing truth.
 *
 * - Raw body + Stripe-Signature verified with the async SubtleCrypto
 *   provider (Workers-compatible).
 * - No user JWT, no CORS headers, no per-IP rate limiter: Stripe is the
 *   only caller and the signature is the authentication.
 * - Event id recorded before handling; duplicates return 200 immediately;
 *   a handler failure returns 500 so Stripe retries (up to 3 days).
 * - Every credit mutation downstream is idempotent by ledger key, so
 *   out-of-order and duplicate deliveries cannot double-grant.
 */
export const Route = createFileRoute("/api/billing/webhook")({
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
