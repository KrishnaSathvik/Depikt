import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureStripeCustomer, type CustomerCreator } from "../../src/lib/billing/customer.ts";
import {
  isMissingStripeCustomer,
  publicCheckoutError,
} from "../../src/lib/billing/stripe-errors.ts";
import type { BillingStore } from "../../src/lib/billing/sync.ts";
import type { BillingAccountRow } from "../../src/lib/billing/db-types.ts";

function emptyRow(userId: string, customerId: string | null = null): BillingAccountRow {
  return {
    user_id: userId,
    stripe_customer_id: customerId,
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
}

function memoryStore(seed?: BillingAccountRow) {
  const accounts = new Map<string, BillingAccountRow>();
  if (seed) accounts.set(seed.user_id, seed);
  const store = {
    async getBillingAccountByUser(userId: string) {
      return accounts.get(userId) ?? null;
    },
    async upsertBillingAccount(userId: string, patch: Partial<BillingAccountRow>) {
      const next = { ...(accounts.get(userId) ?? emptyRow(userId)), ...patch, user_id: userId };
      accounts.set(userId, next);
      return next;
    },
  };
  return { store: store as unknown as BillingStore, accounts };
}

test("isMissingStripeCustomer detects test-mode leftover ids", () => {
  assert.equal(
    isMissingStripeCustomer({
      type: "invalid_request_error",
      code: "resource_missing",
      param: "id",
      message:
        "No such customer: 'cus_test'; a similar object exists in test mode, but a live mode key was used to make this request.",
    }),
    true,
  );
  assert.equal(
    isMissingStripeCustomer({
      code: "resource_missing",
      param: "price",
      message: "No such price: 'price_test'",
    }),
    false,
  );
});

test("publicCheckoutError names a live-key + test-price mix", () => {
  assert.match(
    publicCheckoutError({
      code: "resource_missing",
      param: "price",
      message:
        "No such price: 'price_test'; a similar object exists in test mode, but a live mode key was used to make this request.",
    }),
    /test-mode price/,
  );
});

test("ensureStripeCustomer reuses a live customer that still exists", async () => {
  const { store } = memoryStore(emptyRow("u1", "cus_live"));
  let created = 0;
  const stripe: CustomerCreator = {
    async retrieveCustomer(id) {
      return { id };
    },
    async createCustomer() {
      created += 1;
      return { id: "cus_new" };
    },
  };
  assert.equal(
    await ensureStripeCustomer({ store, stripe }, { id: "u1", email: null }),
    "cus_live",
  );
  assert.equal(created, 0);
});

test("ensureStripeCustomer replaces a test-mode customer after switching to live", async () => {
  const { store, accounts } = memoryStore(emptyRow("u1", "cus_test"));
  const stripe: CustomerCreator = {
    async retrieveCustomer() {
      throw {
        type: "invalid_request_error",
        code: "resource_missing",
        param: "id",
        message:
          "No such customer: 'cus_test'; a similar object exists in test mode, but a live mode key was used to make this request.",
      };
    },
    async createCustomer() {
      return { id: "cus_live" };
    },
  };
  assert.equal(
    await ensureStripeCustomer({ store, stripe }, { id: "u1", email: "a@b.c" }),
    "cus_live",
  );
  assert.equal(accounts.get("u1")?.stripe_customer_id, "cus_live");
});

test("ensureStripeCustomer replaces a deleted customer", async () => {
  const { store } = memoryStore(emptyRow("u1", "cus_old"));
  const stripe: CustomerCreator = {
    async retrieveCustomer() {
      return { id: "cus_old", deleted: true };
    },
    async createCustomer() {
      return { id: "cus_new" };
    },
  };
  assert.equal(await ensureStripeCustomer({ store, stripe }, { id: "u1", email: null }), "cus_new");
});
