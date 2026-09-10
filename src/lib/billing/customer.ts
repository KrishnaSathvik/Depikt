// Canonical mapping: auth.users.id ↔ billing_accounts.stripe_customer_id.
// A Stripe customer is created lazily at the first Checkout / Portal call
// and reused forever after. Email is a billing detail on the customer, never
// the lookup key.

import type { BillingStore } from "./sync.ts";

export interface CustomerCreator {
  createCustomer(input: {
    email: string | null;
    metadata: Record<string, string>;
  }): Promise<{ id: string }>;
}

export async function ensureStripeCustomer(
  deps: { store: BillingStore; stripe: CustomerCreator },
  user: { id: string; email: string | null },
): Promise<string> {
  const existing = await deps.store.getBillingAccountByUser(user.id);
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;
  const customer = await deps.stripe.createCustomer({
    email: user.email,
    metadata: { supabase_user_id: user.id },
  });
  await deps.store.upsertBillingAccount(user.id, { stripe_customer_id: customer.id });
  return customer.id;
}
