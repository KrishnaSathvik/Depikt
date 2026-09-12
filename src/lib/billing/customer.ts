// Canonical mapping: auth.users.id ↔ billing_accounts.stripe_customer_id.
// A Stripe customer is created lazily at the first Checkout / Portal call
// and reused after. Email is a billing detail on the customer, never the
// lookup key.
//
// Switching Stripe from test to live leaves a test-mode customer id in
// billing_accounts. Live Checkout then fails with "No such customer".
// Retrieve first; if that id is missing or deleted, create a live one.

import type { BillingStore } from "./sync.ts";
import { isMissingStripeCustomer } from "./stripe-errors.ts";

export interface CustomerCreator {
  createCustomer(input: {
    email: string | null;
    metadata: Record<string, string>;
  }): Promise<{ id: string }>;
  retrieveCustomer(id: string): Promise<{ id: string; deleted?: boolean }>;
}

export async function ensureStripeCustomer(
  deps: { store: BillingStore; stripe: CustomerCreator },
  user: { id: string; email: string | null },
): Promise<string> {
  const existing = await deps.store.getBillingAccountByUser(user.id);
  const storedId = existing?.stripe_customer_id;
  if (storedId) {
    try {
      const found = await deps.stripe.retrieveCustomer(storedId);
      if (!found.deleted) return found.id;
    } catch (err) {
      if (!isMissingStripeCustomer(err)) throw err;
    }
  }
  const customer = await deps.stripe.createCustomer({
    email: user.email,
    metadata: { supabase_user_id: user.id },
  });
  await deps.store.upsertBillingAccount(user.id, { stripe_customer_id: customer.id });
  return customer.id;
}
