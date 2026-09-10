// Stripe → Depikt state sync. Pure handlers over a narrow store interface
// (like generation's job pipeline) so replay, ordering, and grant invariants
// are verified with an in-memory fake — no Stripe or Supabase needed.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  processStripeEvent,
  fulfillCheckoutSession,
  planKeyForStatus,
  type BillingStore,
  type StripeReader,
  type StripeEventLike,
  type SubscriptionLike,
  type CheckoutSessionLike,
  type InvoiceLike,
} from "../../src/lib/billing/sync.ts";
import type { BillingAccountRow } from "../../src/lib/billing/db-types.ts";
import { resolvePriceIds } from "../../src/lib/billing/plans.ts";

const ids = resolvePriceIds({
  STRIPE_PRICE_PRO_MONTHLY: "price_pm",
  STRIPE_PRICE_PRO_YEARLY: "price_py",
  STRIPE_PRICE_MAX_MONTHLY: "price_mm",
  STRIPE_PRICE_MAX_YEARLY: "price_my",
  STRIPE_PRICE_PACK_10: "price_p10",
  STRIPE_PRICE_PACK_25: "price_p25",
  STRIPE_PRICE_PACK_50: "price_p50",
});

const T0 = 1_760_000_000; // period start (unix seconds)
const MONTH = 30 * 24 * 3600;

function makeStore() {
  const accounts = new Map<string, BillingAccountRow>();
  const events = new Map<string, { type: string; processed: boolean; error?: string }>();
  const ledgerKeys = new Set<string>();
  const plan = new Map<string, number>();
  const extra = new Map<string, number>();
  const purchases = new Map<string, Record<string, unknown>>();
  const log: string[] = [];

  const store: BillingStore = {
    async beginEvent(id, type) {
      const e = events.get(id);
      if (e?.processed) return "done";
      events.set(id, { type, processed: false });
      return e ? "retry" : "new";
    },
    async finishEvent(id, error) {
      const e = events.get(id)!;
      e.processed = !error;
      e.error = error;
    },
    async getBillingAccountByUser(userId) {
      return accounts.get(userId) ?? null;
    },
    async getBillingAccountByCustomer(customerId) {
      return [...accounts.values()].find((a) => a.stripe_customer_id === customerId) ?? null;
    },
    async getBillingAccountBySubscription(subId) {
      return [...accounts.values()].find((a) => a.stripe_subscription_id === subId) ?? null;
    },
    async upsertBillingAccount(userId, patch) {
      const base: BillingAccountRow = accounts.get(userId) ?? {
        user_id: userId,
        stripe_customer_id: null,
        plan_key: "free",
        stripe_subscription_id: null,
        stripe_price_id: null,
        subscription_status: null,
        billing_interval: null,
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
        monthly_credit_allocation: 0,
        next_credit_grant_at: null,
        last_grant_period_key: null,
        last_payment_failed_at: null,
        created_at: "",
        updated_at: "",
      };
      const row = { ...base, ...patch };
      accounts.set(userId, row);
      return row;
    },
    async grantSubscriptionCredits(userId, allocation, periodKey) {
      const k = `sub_grant:${periodKey}`;
      if (ledgerKeys.has(k)) return { granted: false };
      ledgerKeys.add(k);
      plan.set(userId, allocation);
      log.push(`grant:${userId}:${allocation}:${periodKey}`);
      return { granted: true };
    },
    async resetPlanCredits(userId, key) {
      if (ledgerKeys.has(key)) return 0;
      ledgerKeys.add(key);
      const forfeited = plan.get(userId) ?? 0;
      plan.set(userId, 0);
      log.push(`reset:${userId}:${forfeited}`);
      return forfeited;
    },
    async applyTopUp(userId, credits, sessionId) {
      const k = `top_up:${sessionId}`;
      if (ledgerKeys.has(k)) return { applied: false };
      ledgerKeys.add(k);
      extra.set(userId, (extra.get(userId) ?? 0) + credits);
      log.push(`topup:${userId}:${credits}`);
      return { applied: true };
    },
    async adjustCredits(userId, bucket, delta, _reason, key) {
      if (ledgerKeys.has(key)) return { applied: false };
      ledgerKeys.add(key);
      const m = bucket === "plan" ? plan : extra;
      m.set(userId, (m.get(userId) ?? 0) + delta);
      log.push(`adjust:${userId}:${bucket}:${delta}`);
      return { applied: true };
    },
    async upsertPurchase(row) {
      purchases.set(row.checkout_session_id, {
        ...(purchases.get(row.checkout_session_id) ?? {}),
        ...row,
      });
    },
  };
  return { store, accounts, events, plan, extra, purchases, log };
}

function sub(
  over: Partial<SubscriptionLike> & { price: string; status?: string },
): SubscriptionLike {
  const { price, status = "active", ...rest } = over;
  return {
    id: "sub_1",
    customer: "cus_1",
    status,
    cancel_at_period_end: false,
    metadata: { supabase_user_id: "user_1" },
    items: {
      data: [{ price: { id: price }, current_period_start: T0, current_period_end: T0 + MONTH }],
    },
    ...rest,
  } as SubscriptionLike;
}

function invoicePaid(subId = "sub_1", reason = "subscription_create"): InvoiceLike {
  return {
    id: "in_1",
    customer: "cus_1",
    billing_reason: reason,
    status: "paid",
    parent: { subscription_details: { subscription: subId } },
  };
}

function stripeReader(subscription: SubscriptionLike, session?: CheckoutSessionLike): StripeReader {
  return {
    async retrieveSubscription(id) {
      assert.equal(id, subscription.id);
      return subscription;
    },
    async retrieveCheckoutSession(id) {
      if (!session) throw new Error("no session");
      assert.equal(id, session.id);
      return session;
    },
  };
}

function evt(id: string, type: string, object: unknown): StripeEventLike {
  return { id, type, data: { object } } as StripeEventLike;
}

test("planKeyForStatus: grace for past_due, free for terminal/unpaid states", () => {
  assert.equal(planKeyForStatus("active", "pro"), "pro");
  assert.equal(planKeyForStatus("trialing", "max"), "max");
  assert.equal(planKeyForStatus("past_due", "pro"), "pro");
  for (const s of ["unpaid", "canceled", "incomplete", "incomplete_expired", "paused"] as const) {
    assert.equal(planKeyForStatus(s, "max"), "free", s);
  }
});

test("subscription.created syncs plan, period, interval, allocation from the catalog", async () => {
  const s = makeStore();
  const subscription = sub({ price: "price_pm" });
  await processStripeEvent(evt("evt_1", "customer.subscription.created", subscription), {
    store: s.store,
    stripe: stripeReader(subscription),
    priceIds: ids,
    now: () => new Date((T0 + 10) * 1000),
  });
  const row = s.accounts.get("user_1")!;
  assert.equal(row.plan_key, "pro");
  assert.equal(row.stripe_customer_id, "cus_1");
  assert.equal(row.stripe_subscription_id, "sub_1");
  assert.equal(row.stripe_price_id, "price_pm");
  assert.equal(row.billing_interval, "month");
  assert.equal(row.monthly_credit_allocation, 40);
  assert.equal(row.subscription_status, "active");
  assert.equal(row.current_period_start, new Date(T0 * 1000).toISOString());
  assert.equal(s.log.length, 0, "sync alone grants nothing; invoice.paid does");
});

test("unknown price id never guesses a plan and records the error", async () => {
  const s = makeStore();
  const subscription = sub({ price: "price_mystery" });
  await assert.rejects(
    processStripeEvent(evt("evt_x", "customer.subscription.updated", subscription), {
      store: s.store,
      stripe: stripeReader(subscription),
      priceIds: ids,
      now: () => new Date(),
    }),
    /Unknown Stripe price/,
  );
  assert.equal(s.accounts.get("user_1")?.plan_key ?? "free", "free");
  assert.match(s.events.get("evt_x")?.error ?? "", /Unknown Stripe price/);
  assert.equal(
    s.events.get("evt_x")?.processed,
    false,
    "left unprocessed so Stripe's retry re-runs it",
  );
});

test("invoice.paid grants the period once, keyed on the subscription period; replay is a no-op", async () => {
  const s = makeStore();
  const subscription = sub({ price: "price_mm" });
  const deps = {
    store: s.store,
    stripe: stripeReader(subscription),
    priceIds: ids,
    now: () => new Date((T0 + 5) * 1000),
  };
  await processStripeEvent(evt("evt_1", "customer.subscription.created", subscription), deps);
  await processStripeEvent(evt("evt_2", "invoice.paid", invoicePaid()), deps);
  assert.equal(s.plan.get("user_1"), 100);
  // Stripe redelivers the same event id
  const r = await processStripeEvent(evt("evt_2", "invoice.paid", invoicePaid()), deps);
  assert.equal(r.skipped, "duplicate");
  // A different event id for the same period (e.g. subscription_update invoice) still cannot double grant
  await processStripeEvent(
    evt("evt_3", "invoice.paid", invoicePaid("sub_1", "subscription_update")),
    deps,
  );
  assert.equal(s.log.filter((l) => l.startsWith("grant:")).length, 1);
  assert.equal(
    s.accounts.get("user_1")!.next_credit_grant_at,
    null,
    "monthly plans have no internal grant schedule",
  );
});

test("out-of-order: invoice.paid before subscription.created still syncs then grants", async () => {
  const s = makeStore();
  const subscription = sub({ price: "price_pm" });
  const deps = {
    store: s.store,
    stripe: stripeReader(subscription),
    priceIds: ids,
    now: () => new Date((T0 + 5) * 1000),
  };
  await processStripeEvent(evt("evt_a", "invoice.paid", invoicePaid()), deps);
  assert.equal(s.accounts.get("user_1")?.plan_key, "pro");
  assert.equal(s.plan.get("user_1"), 40);
  await processStripeEvent(evt("evt_b", "customer.subscription.created", subscription), deps);
  assert.equal(s.log.filter((l) => l.startsWith("grant:")).length, 1);
});

test("annual invoice.paid grants month 1 only and schedules the next monthly slice", async () => {
  const s = makeStore();
  const subscription = sub({
    price: "price_my",
    items: {
      data: [
        {
          price: { id: "price_my" },
          current_period_start: T0,
          current_period_end: T0 + 365 * 24 * 3600,
        },
      ],
    },
  } as Partial<SubscriptionLike> & { price: string });
  const deps = {
    store: s.store,
    stripe: stripeReader(subscription),
    priceIds: ids,
    now: () => new Date((T0 + 5) * 1000),
  };
  await processStripeEvent(evt("evt_1", "invoice.paid", invoicePaid()), deps);
  const row = s.accounts.get("user_1")!;
  assert.equal(row.billing_interval, "year");
  assert.equal(row.monthly_credit_allocation, 100);
  assert.equal(s.plan.get("user_1"), 100, "only the first month, never 1,200 upfront");
  const next = new Date(row.next_credit_grant_at!).getTime();
  const start = new Date(T0 * 1000);
  const expected = new Date(
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth() + 1,
      start.getUTCDate(),
      start.getUTCHours(),
      start.getUTCMinutes(),
      start.getUTCSeconds(),
    ),
  );
  assert.equal(next, expected.getTime());
});

test("upgrade Pro → Max mid-period adds the 60-credit delta exactly once", async () => {
  const s = makeStore();
  const pro = sub({ price: "price_pm" });
  const deps = {
    store: s.store,
    stripe: stripeReader(pro),
    priceIds: ids,
    now: () => new Date((T0 + 5) * 1000),
  };
  await processStripeEvent(evt("evt_1", "customer.subscription.created", pro), deps);
  await processStripeEvent(evt("evt_2", "invoice.paid", invoicePaid()), deps);
  const max = sub({ price: "price_mm" });
  const deps2 = { ...deps, stripe: stripeReader(max) };
  await processStripeEvent(evt("evt_3", "customer.subscription.updated", max), deps2);
  await processStripeEvent(evt("evt_4", "customer.subscription.updated", max), deps2);
  await processStripeEvent(
    evt("evt_5", "invoice.paid", invoicePaid("sub_1", "subscription_update")),
    deps2,
  );
  assert.equal(s.plan.get("user_1"), 100, "40 + 60, not 40 + 100");
  assert.equal(s.log.filter((l) => l.startsWith("adjust:")).length, 1);
  assert.equal(s.accounts.get("user_1")!.monthly_credit_allocation, 100);
});

test("downgrade Max → Pro mid-period does not remove paid capacity", async () => {
  const s = makeStore();
  const max = sub({ price: "price_mm" });
  const deps = {
    store: s.store,
    stripe: stripeReader(max),
    priceIds: ids,
    now: () => new Date((T0 + 5) * 1000),
  };
  await processStripeEvent(evt("evt_1", "customer.subscription.created", max), deps);
  await processStripeEvent(evt("evt_2", "invoice.paid", invoicePaid()), deps);
  const pro = sub({ price: "price_pm" });
  await processStripeEvent(evt("evt_3", "customer.subscription.updated", pro), {
    ...deps,
    stripe: stripeReader(pro),
  });
  assert.equal(s.plan.get("user_1"), 100);
  assert.equal(s.accounts.get("user_1")!.monthly_credit_allocation, 40, "next period grants 40");
});

test("cancel_at_period_end keeps the plan; subscription.deleted ends it and forfeits plan credits only", async () => {
  const s = makeStore();
  const active = sub({ price: "price_pm" });
  const deps = {
    store: s.store,
    stripe: stripeReader(active),
    priceIds: ids,
    now: () => new Date((T0 + 5) * 1000),
  };
  await processStripeEvent(evt("evt_1", "invoice.paid", invoicePaid()), deps);
  await s.store.applyTopUp("user_1", 10, "cs_pack", "pack_10");
  const cancelling = sub({ price: "price_pm", cancel_at_period_end: true });
  await processStripeEvent(evt("evt_2", "customer.subscription.updated", cancelling), {
    ...deps,
    stripe: stripeReader(cancelling),
  });
  assert.equal(s.accounts.get("user_1")!.plan_key, "pro");
  assert.equal(s.accounts.get("user_1")!.cancel_at_period_end, true);
  const deleted = sub({ price: "price_pm", status: "canceled" });
  await processStripeEvent(evt("evt_3", "customer.subscription.deleted", deleted), {
    ...deps,
    stripe: stripeReader(deleted),
  });
  const row = s.accounts.get("user_1")!;
  assert.equal(row.plan_key, "free");
  assert.equal(row.monthly_credit_allocation, 0);
  assert.equal(row.next_credit_grant_at, null);
  assert.equal(s.plan.get("user_1"), 0);
  assert.equal(s.extra.get("user_1"), 10, "purchased credits survive");
});

test("invoice.payment_failed records the failure without touching credits", async () => {
  const s = makeStore();
  const active = sub({ price: "price_pm" });
  const deps = {
    store: s.store,
    stripe: stripeReader(active),
    priceIds: ids,
    now: () => new Date((T0 + 5) * 1000),
  };
  await processStripeEvent(evt("evt_1", "invoice.paid", invoicePaid()), deps);
  await processStripeEvent(
    evt("evt_2", "invoice.payment_failed", { ...invoicePaid(), status: "open" }),
    deps,
  );
  assert.ok(s.accounts.get("user_1")!.last_payment_failed_at);
  assert.equal(s.plan.get("user_1"), 40);
});

test("pack checkout fulfills once from the catalog, never from client-supplied credits", async () => {
  const s = makeStore();
  const session: CheckoutSessionLike = {
    id: "cs_1",
    mode: "payment",
    payment_status: "paid",
    client_reference_id: "user_1",
    customer: "cus_1",
    subscription: null,
    amount_total: 600,
    currency: "usd",
    metadata: { supabase_user_id: "user_1", pack_key: "pack_10", credits: "9999" },
  };
  const deps = {
    store: s.store,
    stripe: stripeReader(sub({ price: "price_pm" }), session),
    priceIds: ids,
    now: () => new Date(),
  };
  await processStripeEvent(evt("evt_1", "checkout.session.completed", session), deps);
  assert.equal(s.extra.get("user_1"), 10);
  await processStripeEvent(evt("evt_2", "checkout.session.completed", session), deps);
  const again = await fulfillCheckoutSession(session, deps);
  assert.equal(again.kind, "pack");
  assert.equal(s.extra.get("user_1"), 10, "landing-page fulfillment + webhook = one top-up");
  assert.equal(s.purchases.get("cs_1")?.status, "fulfilled");
  assert.equal(s.purchases.get("cs_1")?.credits, 10);
});

test("unpaid pack checkout is recorded but not fulfilled", async () => {
  const s = makeStore();
  const session: CheckoutSessionLike = {
    id: "cs_2",
    mode: "payment",
    payment_status: "unpaid",
    client_reference_id: "user_1",
    customer: "cus_1",
    subscription: null,
    amount_total: 600,
    currency: "usd",
    metadata: { pack_key: "pack_10" },
  };
  await fulfillCheckoutSession(session, {
    store: s.store,
    stripe: stripeReader(sub({ price: "price_pm" })),
    priceIds: ids,
    now: () => new Date(),
  });
  assert.equal(s.extra.get("user_1") ?? 0, 0);
  assert.equal(s.purchases.get("cs_2")?.status, "pending");
});

test("subscription checkout maps the customer and syncs the subscription", async () => {
  const s = makeStore();
  const subscription = sub({ price: "price_py", metadata: {} } as Partial<SubscriptionLike> & {
    price: string;
  });
  const session: CheckoutSessionLike = {
    id: "cs_3",
    mode: "subscription",
    payment_status: "paid",
    client_reference_id: "user_1",
    customer: "cus_1",
    subscription: "sub_1",
    amount_total: 19900,
    currency: "usd",
    metadata: { supabase_user_id: "user_1" },
  };
  const deps = {
    store: s.store,
    stripe: stripeReader(subscription, session),
    priceIds: ids,
    now: () => new Date((T0 + 5) * 1000),
  };
  await processStripeEvent(evt("evt_1", "checkout.session.completed", session), deps);
  const row = s.accounts.get("user_1")!;
  assert.equal(row.stripe_customer_id, "cus_1");
  assert.equal(row.plan_key, "pro");
  assert.equal(row.billing_interval, "year");
});

test("unhandled event types are acknowledged, not processed", async () => {
  const s = makeStore();
  const r = await processStripeEvent(evt("evt_z", "charge.refunded", {}), {
    store: s.store,
    stripe: stripeReader(sub({ price: "price_pm" })),
    priceIds: ids,
    now: () => new Date(),
  });
  assert.equal(r.skipped, "unhandled");
  assert.equal(s.events.get("evt_z")?.processed, true);
});
