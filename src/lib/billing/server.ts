// Composition root for the billing routes: env → Stripe client, service-role
// store, price ids. Each route calls getBillingContext() once per request.

import type Stripe from "stripe";
import { readBillingEnv, type BillingEnv } from "./env.ts";
import { createStripeClient, stripeReader } from "./stripe.ts";
import { createServiceClient } from "./service-client.ts";
import { createSupabaseBillingStore } from "./supabase-store.ts";
import type { SyncDeps } from "./sync.ts";
import { jsonError } from "@/lib/api/public-route";

export interface BillingContext {
  env: BillingEnv;
  stripe: Stripe;
  sync: SyncDeps;
}

export type BillingContextResult =
  | { ok: true; ctx: BillingContext }
  | { ok: false; response: Response };

let cached: { key: string; ctx: BillingContext } | null = null;

export function getBillingContext(): BillingContextResult {
  const read = readBillingEnv();
  if (!read.ok) {
    console.error(`billing: missing configuration: ${read.missing.join(", ")}`);
    return { ok: false, response: jsonError("Billing is not available.", 503) };
  }
  const key = `${read.env.stripeSecretKey.slice(-6)}:${read.env.supabaseUrl}`;
  if (cached && cached.key === key) return { ok: true, ctx: cached.ctx };
  const stripe = createStripeClient(read.env.stripeSecretKey);
  const db = createServiceClient(read.env.supabaseUrl, read.env.supabaseServiceRoleKey);
  const ctx: BillingContext = {
    env: read.env,
    stripe,
    sync: {
      store: createSupabaseBillingStore(db),
      stripe: stripeReader(stripe),
      priceIds: read.env.priceIds,
      now: () => new Date(),
      log: (m) => console.warn(`billing: ${m}`),
    },
  };
  cached = { key, ctx };
  return { ok: true, ctx };
}

/** Public origin for Checkout/Portal return URLs (the request's own origin). */
export function requestOrigin(request: Request): string {
  return new URL(request.url).origin;
}
