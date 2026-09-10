// Locked commercial catalog: one source of truth for plans, packs, prices,
// allocations, and Stripe price-id resolution (server env only).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CATALOG,
  PLAN_CREDITS,
  STARTER_CREDITS,
  CREDIT_PACKS,
  PLAN_PRODUCTS,
  formatUsd,
  isProductKey,
  monthlyEquivalent,
  planForPriceId,
  productForKey,
  resolvePriceIds,
  yearlySavingsLabel,
  type ProductKey,
} from "../../src/lib/billing/plans.ts";

test("locked plan prices and allocations", () => {
  assert.equal(STARTER_CREDITS, 5);
  assert.equal(PLAN_CREDITS.pro, 40);
  assert.equal(PLAN_CREDITS.max, 100);
  assert.equal(CATALOG.pro_monthly.priceCents, 1999);
  assert.equal(CATALOG.pro_yearly.priceCents, 19900);
  assert.equal(CATALOG.max_monthly.priceCents, 3999);
  assert.equal(CATALOG.max_yearly.priceCents, 39900);
  for (const key of ["pro_monthly", "pro_yearly", "max_monthly", "max_yearly"] as const) {
    assert.equal(CATALOG[key].kind, "plan");
    assert.equal(CATALOG[key].creditsPerMonth, PLAN_CREDITS[CATALOG[key].plan]);
  }
  assert.equal(CATALOG.pro_yearly.interval, "year");
  assert.equal(CATALOG.pro_monthly.interval, "month");
});

test("locked credit packs", () => {
  assert.deepEqual(
    CREDIT_PACKS.map((p) => [p.key, p.credits, p.priceCents]),
    [
      ["pack_10", 10, 600],
      ["pack_25", 25, 1200],
      ["pack_50", 50, 2200],
    ],
  );
  for (const p of CREDIT_PACKS) assert.equal(p.kind, "pack");
  assert.equal(PLAN_PRODUCTS.length, 4);
});

test("product keys are the only thing the browser may send", () => {
  assert.ok(isProductKey("pro_monthly"));
  assert.ok(isProductKey("pack_50"));
  assert.equal(isProductKey("price_123"), false);
  assert.equal(isProductKey(""), false);
  assert.equal(isProductKey(42), false);
  assert.equal(productForKey("max_yearly").plan, "max");
});

test("Stripe price ids come from server env, never the client", () => {
  const env = {
    STRIPE_PRICE_PRO_MONTHLY: "price_pm",
    STRIPE_PRICE_PRO_YEARLY: "price_py",
    STRIPE_PRICE_MAX_MONTHLY: "price_mm",
    STRIPE_PRICE_MAX_YEARLY: "price_my",
    STRIPE_PRICE_PACK_10: "price_p10",
    STRIPE_PRICE_PACK_25: "price_p25",
    STRIPE_PRICE_PACK_50: "price_p50",
  };
  const ids = resolvePriceIds(env);
  assert.equal(ids.pro_monthly, "price_pm");
  assert.equal(ids.pack_50, "price_p50");
  assert.deepEqual(planForPriceId("price_my", ids), {
    key: "max_yearly",
    plan: "max",
    interval: "year",
    creditsPerMonth: 100,
  });
  assert.equal(planForPriceId("price_unknown", ids), null);
  assert.equal(planForPriceId("price_p10", ids), null, "packs are not plans");
  assert.throws(() => resolvePriceIds({}), /STRIPE_PRICE_PRO_MONTHLY/);
});

test("display helpers", () => {
  assert.equal(formatUsd(1999), "$19.99");
  assert.equal(formatUsd(19900), "$199");
  assert.equal(formatUsd(600), "$6");
  assert.equal(monthlyEquivalent(19900), "$16.58");
  assert.equal(monthlyEquivalent(39900), "$33.25");
  // $199 vs 12 × $19.99 = $239.88 → saves $40.88 ≈ 2 months; wording stays honest.
  assert.match(yearlySavingsLabel("pro"), /Save \$40/);
  assert.match(yearlySavingsLabel("max"), /Save \$80/);
  const keys: ProductKey[] = ["pro_monthly", "pack_10"];
  assert.equal(keys.length, 2);
});
