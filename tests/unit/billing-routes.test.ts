// Billing API routes: the security properties that must hold at the file
// level (no client-trusted money values, signed webhooks, service role only
// where required, no CORS/rate-limit plumbing on the webhook).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readBillingEnv, isLiveStripeKey } from "../../src/lib/billing/env.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

test("readBillingEnv reports every missing secret and never throws", () => {
  const r = readBillingEnv({});
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.ok(r.missing.includes("STRIPE_SECRET_KEY"));
    assert.ok(r.missing.includes("STRIPE_WEBHOOK_SECRET"));
    assert.ok(r.missing.includes("SUPABASE_SERVICE_ROLE_KEY"));
    assert.ok(r.missing.includes("STRIPE_PRICE_PRO_MONTHLY"));
  }
  const full = readBillingEnv({
    STRIPE_SECRET_KEY: "sk_test_x",
    STRIPE_WEBHOOK_SECRET: "whsec_x",
    SUPABASE_URL: "https://x.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "srk",
    STRIPE_PRICE_PRO_MONTHLY: "a",
    STRIPE_PRICE_PRO_YEARLY: "b",
    STRIPE_PRICE_MAX_MONTHLY: "c",
    STRIPE_PRICE_MAX_YEARLY: "d",
    STRIPE_PRICE_PACK_10: "e",
    STRIPE_PRICE_PACK_25: "f",
    STRIPE_PRICE_PACK_50: "g",
  });
  assert.equal(full.ok, true);
  if (full.ok)
    assert.equal(full.env.automaticTax, false, "Stripe Tax is off unless the owner opts in");
  assert.equal(isLiveStripeKey("sk_live_abc"), true);
  assert.equal(isLiveStripeKey("sk_test_abc"), false);
});

test("checkout route accepts only catalog keys and resolves prices server-side", () => {
  const src = read("src/routes/api/billing/checkout.ts");
  assert.match(src, /authenticateGenerationRequest\(request\)/);
  assert.match(src, /isProductKey\(body\.productKey\)/);
  assert.match(src, /env\.priceIds\[product\.key\]/);
  assert.match(src, /client_reference_id: userId/);
  assert.match(src, /checkout=success&session_id=\{CHECKOUT_SESSION_ID\}/);
  assert.match(src, /mode: "subscription"/);
  assert.match(src, /mode: "payment"/);
  assert.doesNotMatch(src, /body\.price/);
  assert.doesNotMatch(src, /body\.credits/);
});

test("webhook route verifies the raw body signature asynchronously and has no CORS / rate limiter", () => {
  const src = read("src/routes/api/billing/webhook.ts");
  assert.match(src, /request\.text\(\)/);
  assert.match(src, /verifyStripeEvent\(/);
  assert.match(src, /stripe-signature/);
  assert.doesNotMatch(src, /corsHeaders/);
  assert.doesNotMatch(src, /rateLimitExceeded/);
  assert.doesNotMatch(src, /authenticateGenerationRequest/);
  const stripe = read("src/lib/billing/stripe.ts");
  assert.match(stripe, /constructEventAsync/);
  assert.match(stripe, /createSubtleCryptoProvider\(\)/);
  assert.match(stripe, /createFetchHttpClient\(\)/);
});

test("service role is confined to server billing modules", () => {
  const server = read("src/lib/billing/server.ts");
  assert.match(server, /createServiceClient\(/);
  for (const file of [
    "src/lib/billing/client.ts",
    "src/lib/billing/use-account-summary.ts",
    "src/lib/billing/plans.ts",
    "src/components/auth/AccountMenu.tsx",
  ]) {
    assert.doesNotMatch(read(file), /SERVICE_ROLE|service-client|createServiceClient/, file);
  }
  assert.doesNotMatch(read("src/lib/billing/env.ts"), /VITE_/);
});

test("confirm route only fulfills sessions owned by the caller", () => {
  const src = read("src/routes/api/billing/confirm.ts");
  assert.match(src, /retrieveCheckoutSession\(sessionId\)/);
  assert.match(src, /owner !== userId/);
  assert.match(src, /fulfillCheckoutSession\(session, sync\)/);
});

test("credit reads settle due annual grants first and expose buckets", () => {
  for (const file of [
    "src/routes/api/generation/credits.ts",
    "src/routes/api/billing/account.ts",
  ]) {
    const src = read(file);
    assert.match(src, /grant_due_subscription_credits/, file);
    assert.match(src, /plan_credits/, file);
    assert.match(src, /extra_credits/, file);
  }
  const jobs = read("src/routes/api/generation/jobs.ts");
  assert.match(jobs, /grant_due_subscription_credits/, "job creation must also settle due grants");
});

test("portal route returns the customer to /account", () => {
  const src = read("src/routes/api/billing/portal.ts");
  assert.match(src, /billingPortal\.sessions\.create/);
  assert.match(src, /ROUTES\.account/);
});
