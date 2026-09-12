// Stripe SDK wiring for Cloudflare Workers / Node: fetch HTTP client and the
// async SubtleCrypto signature verifier (the sync `constructEvent` needs
// Node crypto, which Workers do not have). Server only.

import Stripe from "stripe";
import type { CheckoutSessionLike, StripeReader, SubscriptionLike } from "./sync.ts";
import type { CustomerCreator } from "./customer.ts";
import { SITE_URL } from "@/lib/site";

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
    appInfo: { name: "Depikt", url: SITE_URL },
  });
}

export function stripeCustomerCreator(stripe: Stripe): CustomerCreator {
  return {
    async createCustomer(input) {
      const customer = await stripe.customers.create({
        email: input.email ?? undefined,
        metadata: input.metadata,
      });
      return { id: customer.id };
    },
    async retrieveCustomer(id) {
      const customer = await stripe.customers.retrieve(id);
      if ("deleted" in customer && customer.deleted) {
        return { id: customer.id, deleted: true };
      }
      return { id: customer.id };
    },
  };
}

/**
 * Verifies the Stripe-Signature header over the RAW request body. Throws on
 * a bad signature or a stale timestamp (default 5-minute tolerance).
 */
export async function verifyStripeEvent(
  stripe: Stripe,
  rawBody: string,
  signature: string,
  webhookSecret: string,
): Promise<Stripe.Event> {
  return stripe.webhooks.constructEventAsync(
    rawBody,
    signature,
    webhookSecret,
    undefined,
    Stripe.createSubtleCryptoProvider(),
  );
}

/** Narrow reader used by the sync handlers; re-fetches authoritative objects by id. */
export function stripeReader(stripe: Stripe): StripeReader {
  return {
    async retrieveSubscription(id) {
      return (await stripe.subscriptions.retrieve(id)) as unknown as SubscriptionLike;
    },
    async retrieveCheckoutSession(id) {
      return (await stripe.checkout.sessions.retrieve(id)) as unknown as CheckoutSessionLike;
    },
  };
}
