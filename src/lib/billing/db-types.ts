// Row shapes for the Phase 6 billing tables (supabase/migrations/20260911*).
// src/integrations/supabase/types.ts is generated from the live schema and
// does not know these tables until the migrations are applied and types are
// regenerated; the billing server modules use the same loosely-typed client
// escape hatch as generation (see src/lib/generation/db-types.ts) with these
// explicit row types at each call site.

export type { UntypedSupabaseClient } from "@/lib/generation/db-types";
export { asGenerationClient as asBillingClient } from "@/lib/generation/db-types";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export interface BillingAccountRow {
  user_id: string;
  stripe_customer_id: string | null;
  plan_key: "free" | "pro" | "max";
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  subscription_status: SubscriptionStatus | null;
  billing_interval: "month" | "year" | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  monthly_credit_allocation: number;
  next_credit_grant_at: string | null;
  last_grant_period_key: string | null;
  last_payment_failed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditAccountRow {
  user_id: string;
  available_credits: number;
  reserved_credits: number;
  plan_credits: number;
  extra_credits: number;
}

export interface CreditPurchaseRow {
  checkout_session_id: string;
  user_id: string | null;
  stripe_customer_id: string | null;
  pack_key: string;
  credits: number;
  amount_cents: number;
  currency: string;
  status: "pending" | "paid" | "fulfilled" | "refunded" | "failed";
  created_at: string;
  fulfilled_at: string | null;
}

export interface StripeEventRow {
  id: string;
  type: string;
  created: string;
  processed_at: string | null;
  error: string | null;
}
