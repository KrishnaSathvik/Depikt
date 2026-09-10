import { createFileRoute } from "@tanstack/react-router";
import { jsonError } from "@/lib/api/public-route";
import { authenticateGenerationRequest } from "@/lib/generation/auth";
import { getBillingContext } from "@/lib/billing/server";
import { fulfillCheckoutSession } from "@/lib/billing/sync";

/**
 * POST /api/billing/confirm { sessionId }
 *
 * Landing-page fulfillment (Stripe's recommended fast path alongside the
 * webhook). The session is re-fetched from Stripe and must belong to the
 * caller; fulfillment is idempotent, so running it here and in the webhook
 * yields exactly one grant.
 */
export const Route = createFileRoute("/api/billing/confirm")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authResult = await authenticateGenerationRequest(request);
        if (!authResult.ok) return jsonError(authResult.error, authResult.status);
        const { userId } = authResult.auth;

        let body: { sessionId?: unknown } = {};
        try {
          body = (await request.json()) as { sessionId?: unknown };
        } catch {
          return jsonError("Invalid JSON body", 400);
        }
        const sessionId = body.sessionId;
        if (typeof sessionId !== "string" || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
          return jsonError("Invalid session", 400);
        }

        const billing = getBillingContext();
        if (!billing.ok) return billing.response;
        const { sync } = billing.ctx;

        try {
          const session = await sync.stripe.retrieveCheckoutSession(sessionId);
          const owner = session.client_reference_id ?? session.metadata?.supabase_user_id ?? null;
          if (owner !== userId) return jsonError("Session does not belong to this account", 403);
          const result = await fulfillCheckoutSession(session, sync);
          return Response.json({
            result,
            mode: session.mode,
            paymentStatus: session.payment_status,
            productKey: session.metadata?.product_key ?? null,
          });
        } catch (err) {
          console.error("billing: confirm failed", err);
          return jsonError("Could not confirm checkout", 502);
        }
      },
    },
  },
});
