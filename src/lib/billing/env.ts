// Server-only billing configuration. Every secret is read from the Worker /
// process environment; nothing here may be imported by client code.

import { resolvePriceIds, type PriceIdMap } from "./plans.ts";

export interface BillingEnv {
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  priceIds: PriceIdMap;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  /** Optional: enable Stripe Tax on Checkout (owner decision, off by default). */
  automaticTax: boolean;
}

export type BillingEnvResult = { ok: true; env: BillingEnv } | { ok: false; missing: string[] };

export function readBillingEnv(
  source: Record<string, string | undefined> = process.env,
): BillingEnvResult {
  const missing: string[] = [];
  const need = (key: string) => {
    const v = source[key];
    if (!v) missing.push(key);
    return v ?? "";
  };
  const stripeSecretKey = need("STRIPE_SECRET_KEY");
  const stripeWebhookSecret = need("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = need("SUPABASE_URL");
  const supabaseServiceRoleKey = need("SUPABASE_SERVICE_ROLE_KEY");
  let priceIds: PriceIdMap | null = null;
  try {
    priceIds = resolvePriceIds(source);
  } catch (err) {
    missing.push((err as Error).message.replace(/^Missing /, "").replace(/ in server.*$/, ""));
  }
  if (missing.length > 0 || !priceIds) return { ok: false, missing };
  return {
    ok: true,
    env: {
      stripeSecretKey,
      stripeWebhookSecret,
      priceIds,
      supabaseUrl,
      supabaseServiceRoleKey,
      automaticTax: source.STRIPE_AUTOMATIC_TAX === "true",
    },
  };
}

/** Live-mode keys must never be used while the launch is still in test mode. */
export function isLiveStripeKey(key: string): boolean {
  return key.startsWith("sk_live_") || key.startsWith("rk_live_");
}
