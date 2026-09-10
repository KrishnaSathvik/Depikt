// BillingStore over a service-role Supabase client. Thin glue: every credit
// mutation is one of the SECURITY DEFINER RPCs from
// supabase/migrations/20260911100000_*; every billing_accounts write is an
// upsert. The logic that matters lives in sync.ts and is tested there.

import type { BillingAccountRow, UntypedSupabaseClient } from "./db-types.ts";
import type { BillingStore } from "./sync.ts";

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  return (data as T) ?? null;
}

export function createSupabaseBillingStore(db: UntypedSupabaseClient): BillingStore {
  async function getOne(column: string, value: string): Promise<BillingAccountRow | null> {
    const { data, error } = await db
      .from("billing_accounts")
      .select("*")
      .eq(column, value)
      .maybeSingle();
    if (error) throw error;
    return (data as BillingAccountRow | null) ?? null;
  }

  return {
    async beginEvent(id, type) {
      const { data: existing, error: readError } = await db
        .from("stripe_events")
        .select("id, processed_at")
        .eq("id", id)
        .maybeSingle();
      if (readError) throw readError;
      if (existing?.processed_at) return "done";
      if (existing) return "retry";
      const { error } = await db.from("stripe_events").insert({ id, type });
      if (error) {
        // Lost a race with a concurrent delivery of the same event.
        if ((error as { code?: string }).code === "23505") return "retry";
        throw error;
      }
      return "new";
    },
    async finishEvent(id, error) {
      const { error: e } = await db
        .from("stripe_events")
        .update({ processed_at: error ? null : new Date().toISOString(), error: error ?? null })
        .eq("id", id);
      if (e) throw e;
    },
    getBillingAccountByUser: (userId) => getOne("user_id", userId),
    getBillingAccountByCustomer: (customerId) => getOne("stripe_customer_id", customerId),
    getBillingAccountBySubscription: (subId) => getOne("stripe_subscription_id", subId),
    async upsertBillingAccount(userId, patch) {
      const { data, error } = await db
        .from("billing_accounts")
        .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() })
        .select("*")
        .single();
      if (error) throw error;
      return data as BillingAccountRow;
    },
    async grantSubscriptionCredits(userId, allocation, periodKey, stripeRef) {
      const { data, error } = await db.rpc("grant_subscription_credits", {
        p_user_id: userId,
        p_allocation: allocation,
        p_period_key: periodKey,
        p_stripe_ref: stripeRef,
      });
      if (error) throw error;
      return { granted: Boolean(firstRow<{ granted: boolean }>(data)?.granted) };
    },
    async resetPlanCredits(userId, idempotencyKey, reason) {
      const { data, error } = await db.rpc("reset_plan_credits", {
        p_user_id: userId,
        p_idempotency_key: idempotencyKey,
        p_reason: reason,
      });
      if (error) throw error;
      return typeof data === "number" ? data : 0;
    },
    async applyTopUp(userId, credits, checkoutSessionId, packKey) {
      const { data, error } = await db.rpc("apply_top_up", {
        p_user_id: userId,
        p_credits: credits,
        p_checkout_session_id: checkoutSessionId,
        p_pack_key: packKey,
      });
      if (error) throw error;
      return { applied: Boolean(firstRow<{ applied: boolean }>(data)?.applied) };
    },
    async adjustCredits(userId, bucket, delta, reason, idempotencyKey, entryType, stripeRef) {
      const { data, error } = await db.rpc("adjust_credits", {
        p_user_id: userId,
        p_bucket: bucket,
        p_delta: delta,
        p_reason: reason,
        p_idempotency_key: idempotencyKey,
        p_entry_type: entryType,
        p_stripe_ref: stripeRef ?? null,
      });
      if (error) throw error;
      return { applied: Boolean(firstRow<{ applied: boolean }>(data)?.applied) };
    },
    async upsertPurchase(row) {
      const { error } = await db.from("credit_purchases").upsert(row);
      if (error) throw error;
    },
  };
}
