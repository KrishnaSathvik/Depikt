// The one commercial catalog. Every price, allocation, and pack lives here;
// UI, Checkout, and webhook sync all read from it. Stripe Price IDs are
// resolved server-side from env — the browser only ever sends a ProductKey.
//
// Locked model:
//   1 credit = 1 successful Generate / Edit / Regenerate (model-independent).
//   Free  → 5 one-time starter credits (extra bucket).
//   Pro   → $19.99/mo or $199/yr, 40 plan credits every month.
//   Max   → $39.99/mo or $399/yr, 100 plan credits every month.
//   Packs → 10/$6, 25/$12, 50/$22, never expire while the account exists.

export type PlanKey = "free" | "pro" | "max";
export type PaidPlanKey = Exclude<PlanKey, "free">;
export type BillingInterval = "month" | "year";

export const STARTER_CREDITS = 5;

export const PLAN_CREDITS: Record<PaidPlanKey, number> = { pro: 40, max: 100 };

export const PLAN_LABEL: Record<PlanKey, string> = { free: "Free", pro: "Pro", max: "Max" };

export interface PlanProduct {
  kind: "plan";
  key: "pro_monthly" | "pro_yearly" | "max_monthly" | "max_yearly";
  plan: PaidPlanKey;
  interval: BillingInterval;
  priceCents: number;
  creditsPerMonth: number;
  envKey: string;
}

export interface PackProduct {
  kind: "pack";
  key: "pack_10" | "pack_25" | "pack_50";
  credits: number;
  priceCents: number;
  envKey: string;
  badge?: "Most popular" | "Best value";
}

export type Product = PlanProduct | PackProduct;
export type ProductKey = Product["key"];

export const CATALOG = {
  pro_monthly: {
    kind: "plan",
    key: "pro_monthly",
    plan: "pro",
    interval: "month",
    priceCents: 1999,
    creditsPerMonth: 40,
    envKey: "STRIPE_PRICE_PRO_MONTHLY",
  },
  pro_yearly: {
    kind: "plan",
    key: "pro_yearly",
    plan: "pro",
    interval: "year",
    priceCents: 19900,
    creditsPerMonth: 40,
    envKey: "STRIPE_PRICE_PRO_YEARLY",
  },
  max_monthly: {
    kind: "plan",
    key: "max_monthly",
    plan: "max",
    interval: "month",
    priceCents: 3999,
    creditsPerMonth: 100,
    envKey: "STRIPE_PRICE_MAX_MONTHLY",
  },
  max_yearly: {
    kind: "plan",
    key: "max_yearly",
    plan: "max",
    interval: "year",
    priceCents: 39900,
    creditsPerMonth: 100,
    envKey: "STRIPE_PRICE_MAX_YEARLY",
  },
  pack_10: {
    kind: "pack",
    key: "pack_10",
    credits: 10,
    priceCents: 600,
    envKey: "STRIPE_PRICE_PACK_10",
  },
  pack_25: {
    kind: "pack",
    key: "pack_25",
    credits: 25,
    priceCents: 1200,
    envKey: "STRIPE_PRICE_PACK_25",
    badge: "Most popular",
  },
  pack_50: {
    kind: "pack",
    key: "pack_50",
    credits: 50,
    priceCents: 2200,
    envKey: "STRIPE_PRICE_PACK_50",
    badge: "Best value",
  },
} as const satisfies Record<ProductKey, Product>;

export const PRODUCT_KEYS = Object.keys(CATALOG) as ProductKey[];
export const PLAN_PRODUCTS: ReadonlyArray<PlanProduct> = PRODUCT_KEYS.map(
  (k) => CATALOG[k] as Product,
).filter((p): p is PlanProduct => p.kind === "plan");
export const CREDIT_PACKS: ReadonlyArray<PackProduct> = PRODUCT_KEYS.map(
  (k) => CATALOG[k] as Product,
).filter((p): p is PackProduct => p.kind === "pack");

export function isProductKey(value: unknown): value is ProductKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(CATALOG, value);
}

export function productForKey<K extends ProductKey>(key: K): (typeof CATALOG)[K] {
  return CATALOG[key];
}

export function planProduct(plan: PaidPlanKey, interval: BillingInterval): PlanProduct {
  return CATALOG[`${plan}_${interval === "year" ? "yearly" : "monthly"}`];
}

// ---------- Stripe price ids (server only) ----------

export type PriceIdMap = Record<ProductKey, string>;

/** Reads STRIPE_PRICE_* from server env. Throws naming the first missing key. */
export function resolvePriceIds(env: Record<string, string | undefined>): PriceIdMap {
  const out = {} as PriceIdMap;
  for (const key of PRODUCT_KEYS) {
    const envKey = CATALOG[key].envKey;
    const value = env[envKey];
    if (!value) throw new Error(`Missing ${envKey} in server environment`);
    out[key] = value;
  }
  return out;
}

export interface ResolvedPlan {
  key: PlanProduct["key"];
  plan: PaidPlanKey;
  interval: BillingInterval;
  creditsPerMonth: number;
}

/** Maps a Stripe price id back to a plan; null for packs and unknown prices (never guess). */
export function planForPriceId(priceId: string, ids: PriceIdMap): ResolvedPlan | null {
  for (const p of PLAN_PRODUCTS) {
    if (ids[p.key] === priceId) {
      return { key: p.key, plan: p.plan, interval: p.interval, creditsPerMonth: p.creditsPerMonth };
    }
  }
  return null;
}

export function packForPriceId(priceId: string, ids: PriceIdMap): PackProduct | null {
  return CREDIT_PACKS.find((p) => ids[p.key] === priceId) ?? null;
}

// ---------- display ----------

export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

/** "$16.58" for $199/yr — shown next to the annual price, never as the charged amount. */
export function monthlyEquivalent(yearlyCents: number): string {
  return `$${(yearlyCents / 100 / 12).toFixed(2)}`;
}

/** Honest annual framing: the dollar difference vs 12 monthly payments. */
export function yearlySavingsLabel(plan: PaidPlanKey): string {
  const monthly = planProduct(plan, "month").priceCents * 12;
  const yearly = planProduct(plan, "year").priceCents;
  return `Save $${Math.floor((monthly - yearly) / 100)} a year`;
}
