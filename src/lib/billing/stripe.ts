// Stripe SDK wiring for Cloudflare Workers / Node: fetch HTTP client and the
// async SubtleCrypto signature verifier (the sync `constructEvent` needs
// Node crypto, which Workers do not have). Server only.

import Stripe from "stripe";
import type { CheckoutSessionLike, StripeReader, SubscriptionLike } from "./sync.ts";

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
    appInfo: { name: "Depikt", url: "https://depikt.app" },
  });
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
