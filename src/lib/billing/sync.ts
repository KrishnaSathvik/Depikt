// Stripe → Depikt state synchronization.
//
// Pure handlers over a narrow BillingStore + StripeReader contract (same
// discipline as generation's job pipeline) so replay safety, out-of-order
// delivery, and grant invariants are unit-tested with an in-memory fake.
// The real store (supabase-store.ts) is thin glue over service-role RPCs.
//
// Invariants:
//   - Every event id is recorded before handling; a processed id is skipped.
//   - Every credit mutation is idempotent by ledger key (period, session, …).
//   - Subscription sync never guesses: an unknown price id is an error and
//     the plan stays as it was.
//   - Monthly grant happens on invoice.paid, keyed on the subscription's
//     current period start. Annual plans get month 1 here and the rest via
//     grant_due_subscription_credits() (billing_accounts.next_credit_grant_at).
//   - cancel_at_period_end changes nothing about entitlement; only
//     customer.subscription.deleted ends the plan and forfeits plan credits.

import type { BillingAccountRow, CreditPurchaseRow, SubscriptionStatus } from "./db-types.ts";
import { CATALOG, isProductKey, planForPriceId, type PlanKey, type PriceIdMap } from "./plans.ts";

// ---------- narrow Stripe shapes (subset of the SDK objects) ----------

export interface SubscriptionLike {
  id: string;
  customer: string | { id: string } | null;
  status: SubscriptionStatus | string;
  cancel_at_period_end: boolean;
  canceled_at?: number | null;
  ended_at?: number | null;
  metadata?: Record<string, string> | null;
  /** Older API versions put the period on the subscription itself. */
  current_period_start?: number;
  current_period_end?: number;
  items: {
    data: Array<{
      price: { id: string };
      current_period_start?: number;
      current_period_end?: number;
    }>;
  };
}

export interface InvoiceLike {
  id: string;
  customer: string | { id: string } | null;
  billing_reason?: string | null;
  status?: string | null;
  /** 2025+ API: parent.subscription_details.subscription; older: subscription. */
  parent?: {
    subscription_details?: { subscription?: string | { id: string } | null } | null;
  } | null;
  subscription?: string | { id: string } | null;
}

export interface CheckoutSessionLike {
  id: string;
  mode: "payment" | "subscription" | "setup" | string;
  payment_status: "paid" | "unpaid" | "no_payment_required" | string;
  client_reference_id: string | null;
  customer: string | { id: string } | null;
  subscription: string | { id: string } | null;
  amount_total?: number | null;
  currency?: string | null;
  metadata?: Record<string, string> | null;
}

export interface StripeEventLike {
  id: string;
  type: string;
  data: { object: unknown };
}

// ---------- store / reader contracts ----------

export type BeginEventResult = "new" | "retry" | "done";

export interface BillingStore {
  beginEvent(id: string, type: string): Promise<BeginEventResult>;
  finishEvent(id: string, error?: string): Promise<void>;
  getBillingAccountByUser(userId: string): Promise<BillingAccountRow | null>;
  getBillingAccountByCustomer(customerId: string): Promise<BillingAccountRow | null>;
  getBillingAccountBySubscription(subscriptionId: string): Promise<BillingAccountRow | null>;
  upsertBillingAccount(
    userId: string,
    patch: Partial<Omit<BillingAccountRow, "user_id">>,
  ): Promise<BillingAccountRow>;
  grantSubscriptionCredits(
    userId: string,
    allocation: number,
    periodKey: string,
    stripeRef: string,
  ): Promise<{ granted: boolean }>;
  resetPlanCredits(userId: string, idempotencyKey: string, reason: string): Promise<number>;
  applyTopUp(
    userId: string,
    credits: number,
    checkoutSessionId: string,
    packKey: string,
  ): Promise<{ applied: boolean }>;
  adjustCredits(
    userId: string,
    bucket: "plan" | "extra",
    delta: number,
    reason: string,
    idempotencyKey: string,
    entryType: "manual_adjustment" | "plan_change_adjustment",
    stripeRef?: string,
  ): Promise<{ applied: boolean }>;
  upsertPurchase(
    row: Omit<CreditPurchaseRow, "created_at" | "fulfilled_at"> & { fulfilled_at?: string | null },
  ): Promise<void>;
}

export interface StripeReader {
  retrieveSubscription(id: string): Promise<SubscriptionLike>;
  retrieveCheckoutSession(id: string): Promise<CheckoutSessionLike>;
}

export interface SyncDeps {
  store: BillingStore;
  stripe: StripeReader;
  priceIds: PriceIdMap;
  now: () => Date;
  log?: (message: string) => void;
}

// ---------- helpers ----------

function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

function iso(unixSeconds: number | undefined | null): string | null {
  return typeof unixSeconds === "number" ? new Date(unixSeconds * 1000).toISOString() : null;
}

function periodOf(sub: SubscriptionLike): { start: number | null; end: number | null } {
  const item = sub.items?.data?.[0];
  return {
    start: item?.current_period_start ?? sub.current_period_start ?? null,
    end: item?.current_period_end ?? sub.current_period_end ?? null,
  };
}

/** Same calendar day one month later (UTC), what Stripe would bill on a monthly cycle. */
export function addOneMonthUtc(d: Date): Date {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth() + 1,
      d.getUTCDate(),
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
    ),
  );
}

/**
 * Entitlement rule per Stripe status. past_due is a grace state (existing
 * credits usable, plan label kept, no new grant until invoice.paid).
 */
export function planKeyForStatus(status: string, plan: Exclude<PlanKey, "free">): PlanKey {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
      return plan;
    default:
      return "free";
  }
}

function periodKey(subId: string, periodStart: number | null): string {
  return `${subId}:${periodStart ?? "unknown"}`;
}

async function resolveUserId(sub: SubscriptionLike, deps: SyncDeps): Promise<string | null> {
  const fromMeta = sub.metadata?.supabase_user_id;
  if (fromMeta) return fromMeta;
  const customerId = idOf(sub.customer);
  if (customerId) {
    const byCustomer = await deps.store.getBillingAccountByCustomer(customerId);
    if (byCustomer) return byCustomer.user_id;
  }
  const bySub = await deps.store.getBillingAccountBySubscription(sub.id);
  return bySub?.user_id ?? null;
}

// ---------- subscription sync ----------

export interface SyncedSubscription {
  userId: string;
  row: BillingAccountRow;
  periodStart: number | null;
}

/**
 * Mirrors a Stripe subscription into billing_accounts. Grants nothing by
 * itself except the one-time upgrade delta when the price changes upward
 * inside an unchanged period.
 */
export async function syncSubscription(
  sub: SubscriptionLike,
  deps: SyncDeps,
): Promise<SyncedSubscription | null> {
  const userId = await resolveUserId(sub, deps);
  if (!userId) {
    deps.log?.(`syncSubscription: no Depikt user for subscription ${sub.id}`);
    return null;
  }
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const resolved = priceId ? planForPriceId(priceId, deps.priceIds) : null;
  if (!resolved) {
    throw new Error(`Unknown Stripe price ${priceId ?? "(none)"} on subscription ${sub.id}`);
  }
  const { start, end } = periodOf(sub);
  const existing = await deps.store.getBillingAccountByUser(userId);
  const status = String(sub.status);
  const entitled = status === "active" || status === "trialing" || status === "past_due";
  const allocation = entitled ? resolved.creditsPerMonth : 0;

  const patch: Partial<Omit<BillingAccountRow, "user_id">> = {
    stripe_customer_id: idOf(sub.customer) ?? existing?.stripe_customer_id ?? null,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    subscription_status: status as SubscriptionStatus,
    billing_interval: resolved.interval,
    current_period_start: iso(start),
    current_period_end: iso(end),
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    plan_key: planKeyForStatus(status, resolved.plan),
    monthly_credit_allocation: allocation,
  };
  if (resolved.interval === "month") patch.next_credit_grant_at = null;

  // Upgrade inside the same period: add only the delta, once.
  if (
    existing &&
    existing.stripe_subscription_id === sub.id &&
    existing.stripe_price_id &&
    existing.stripe_price_id !== priceId &&
    existing.monthly_credit_allocation > 0 &&
    allocation > existing.monthly_credit_allocation &&
    existing.current_period_start === iso(start)
  ) {
    const delta = allocation - existing.monthly_credit_allocation;
    await deps.store.adjustCredits(
      userId,
      "plan",
      delta,
      `upgrade ${existing.stripe_price_id} → ${priceId}`,
      `plan_change:${sub.id}:${start ?? "unknown"}:${priceId}`,
      "plan_change_adjustment",
      sub.id,
    );
  }

  const row = await deps.store.upsertBillingAccount(userId, patch);
  return { userId, row, periodStart: start };
}

/** Terminal: the subscription is gone. Plan credits are forfeited; extra credits stay. */
export async function endSubscription(sub: SubscriptionLike, deps: SyncDeps): Promise<void> {
  const userId = await resolveUserId(sub, deps);
  if (!userId) return;
  const existing = await deps.store.getBillingAccountByUser(userId);
  if (existing && existing.stripe_subscription_id && existing.stripe_subscription_id !== sub.id) {
    // A newer subscription replaced this one; do not downgrade the live plan.
    deps.log?.(`endSubscription: ${sub.id} is not the current subscription for ${userId}`);
    return;
  }
  await deps.store.upsertBillingAccount(userId, {
    plan_key: "free",
    subscription_status: "canceled",
    monthly_credit_allocation: 0,
    next_credit_grant_at: null,
    cancel_at_period_end: false,
  });
  await deps.store.resetPlanCredits(
    userId,
    `sub_cancel:${sub.id}:${sub.ended_at ?? sub.canceled_at ?? "end"}`,
    "subscription ended",
  );
}

// ---------- invoices ----------

function subscriptionIdOfInvoice(inv: InvoiceLike): string | null {
  return idOf(inv.parent?.subscription_details?.subscription) ?? idOf(inv.subscription);
}

/** invoice.paid: sync the subscription (authoritative) and grant the period once. */
export async function handleInvoicePaid(inv: InvoiceLike, deps: SyncDeps): Promise<void> {
  const subId = subscriptionIdOfInvoice(inv);
  if (!subId) return; // one-off invoice, not a subscription
  const sub = await deps.stripe.retrieveSubscription(subId);
  const synced = await syncSubscription(sub, deps);
  if (!synced) return;
  const status = String(sub.status);
  if (status !== "active" && status !== "trialing") return;
  const allocation = synced.row.monthly_credit_allocation;
  if (allocation <= 0) return;
  const key = periodKey(sub.id, synced.periodStart);
  await deps.store.grantSubscriptionCredits(synced.userId, allocation, key, sub.id);
  const patch: Partial<Omit<BillingAccountRow, "user_id">> = { last_grant_period_key: key };
  if (synced.row.billing_interval === "year" && synced.periodStart) {
    const next = addOneMonthUtc(new Date(synced.periodStart * 1000));
    const end = periodOf(sub).end;
    patch.next_credit_grant_at = end && next.getTime() >= end * 1000 ? null : next.toISOString();
  } else {
    patch.next_credit_grant_at = null;
  }
  await deps.store.upsertBillingAccount(synced.userId, patch);
}

export async function handleInvoicePaymentFailed(inv: InvoiceLike, deps: SyncDeps): Promise<void> {
  const subId = subscriptionIdOfInvoice(inv);
  let userId: string | null = null;
  if (subId) userId = (await deps.store.getBillingAccountBySubscription(subId))?.user_id ?? null;
  if (!userId) {
    const customerId = idOf(inv.customer);
    if (customerId) {
      userId = (await deps.store.getBillingAccountByCustomer(customerId))?.user_id ?? null;
    }
  }
  if (!userId) return;
  await deps.store.upsertBillingAccount(userId, {
    last_payment_failed_at: deps.now().toISOString(),
  });
}

// ---------- checkout ----------

export type FulfillResult =
  | { kind: "pack"; fulfilled: boolean }
  | { kind: "subscription"; synced: boolean }
  | { kind: "ignored"; reason: string };

/**
 * Idempotent fulfillment for a Checkout Session. Called from the webhook
 * AND from the Account landing page (Stripe's recommended belt-and-braces),
 * so it must be safe to run any number of times.
 */
export async function fulfillCheckoutSession(
  session: CheckoutSessionLike,
  deps: SyncDeps,
): Promise<FulfillResult> {
  const userId = session.client_reference_id ?? session.metadata?.supabase_user_id ?? null;
  if (!userId) return { kind: "ignored", reason: "no user reference" };
  const customerId = idOf(session.customer);

  if (session.mode === "payment") {
    const packKey = session.metadata?.pack_key;
    if (!isProductKey(packKey) || CATALOG[packKey].kind !== "pack") {
      return { kind: "ignored", reason: "not a credit pack" };
    }
    const pack = CATALOG[packKey];
    const paid = session.payment_status === "paid";
    await deps.store.upsertPurchase({
      checkout_session_id: session.id,
      user_id: userId,
      stripe_customer_id: customerId,
      pack_key: pack.key,
      credits: pack.credits, // catalog, never metadata
      amount_cents: session.amount_total ?? pack.priceCents,
      currency: session.currency ?? "usd",
      status: paid ? "fulfilled" : "pending",
      fulfilled_at: paid ? deps.now().toISOString() : null,
    });
    if (!paid) return { kind: "pack", fulfilled: false };
    if (customerId) {
      const existing = await deps.store.getBillingAccountByUser(userId);
      if (!existing?.stripe_customer_id) {
        await deps.store.upsertBillingAccount(userId, { stripe_customer_id: customerId });
      }
    }
    await deps.store.applyTopUp(userId, pack.credits, session.id, pack.key);
    return { kind: "pack", fulfilled: true };
  }

  if (session.mode === "subscription") {
    if (customerId) {
      const existing = await deps.store.getBillingAccountByUser(userId);
      if (!existing?.stripe_customer_id) {
        await deps.store.upsertBillingAccount(userId, { stripe_customer_id: customerId });
      }
    }
    const subId = idOf(session.subscription);
    if (!subId) return { kind: "subscription", synced: false };
    const sub = await deps.stripe.retrieveSubscription(subId);
    if (!sub.metadata?.supabase_user_id)
      sub.metadata = { ...(sub.metadata ?? {}), supabase_user_id: userId };
    const synced = await syncSubscription(sub, deps);
    if (synced && (sub.status === "active" || sub.status === "trialing")) {
      // invoice.paid will also try this; the period key makes it one grant.
      await handleInvoicePaid(
        {
          id: `session:${session.id}`,
          customer: customerId,
          parent: { subscription_details: { subscription: sub.id } },
        },
        deps,
      );
    }
    return { kind: "subscription", synced: Boolean(synced) };
  }

  return { kind: "ignored", reason: `mode ${session.mode}` };
}

// ---------- event dispatcher ----------

export const HANDLED_EVENT_TYPES = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
] as const;

export interface ProcessResult {
  handled: boolean;
  skipped?: "duplicate" | "unhandled";
}

export async function processStripeEvent(
  event: StripeEventLike,
  deps: SyncDeps,
): Promise<ProcessResult> {
  const begin = await deps.store.beginEvent(event.id, event.type);
  if (begin === "done") return { handled: false, skipped: "duplicate" };

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await fulfillCheckoutSession(event.data.object as CheckoutSessionLike, deps);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await syncSubscription(event.data.object as SubscriptionLike, deps);
        break;
      case "customer.subscription.deleted":
        await endSubscription(event.data.object as SubscriptionLike, deps);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as InvoiceLike, deps);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as InvoiceLike, deps);
        break;
      default:
        await deps.store.finishEvent(event.id);
        return { handled: false, skipped: "unhandled" };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await deps.store.finishEvent(event.id, message);
    throw err;
  }
  await deps.store.finishEvent(event.id);
  return { handled: true };
}
