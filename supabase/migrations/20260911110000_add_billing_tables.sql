-- Phase 6 (commercial launch), part 2: billing state, Stripe webhook
-- idempotency, purchase records, deletion audit, and the annual monthly-grant
-- RPC.
--
-- APPLIED TO PRODUCTION (confirmed 2026-09-11 via a live account audit:
-- Account → Plan & Credits reads a real billing_accounts row). Tested with
-- scripts/test-credit-migration.sh. Idempotent.

-- ==========================================================================
-- billing_accounts — one row per user, written only by the server
-- (service role, from Stripe webhooks / checkout). Users may read their own.
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.billing_accounts (
  user_id                   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id        text UNIQUE,
  plan_key                  text NOT NULL DEFAULT 'free',
  stripe_subscription_id    text UNIQUE,
  stripe_price_id           text,
  subscription_status       text,            -- Stripe's own status string
  billing_interval          text,            -- 'month' | 'year'
  current_period_start      timestamptz,
  current_period_end        timestamptz,
  cancel_at_period_end      boolean NOT NULL DEFAULT false,
  monthly_credit_allocation integer NOT NULL DEFAULT 0,
  next_credit_grant_at      timestamptz,     -- annual plans: next monthly slice
  last_grant_period_key     text,
  last_payment_failed_at    timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'billing_accounts_plan_key_check') THEN
    ALTER TABLE public.billing_accounts ADD CONSTRAINT billing_accounts_plan_key_check
      CHECK (plan_key IN ('free', 'pro', 'max'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'billing_accounts_interval_check') THEN
    ALTER TABLE public.billing_accounts ADD CONSTRAINT billing_accounts_interval_check
      CHECK (billing_interval IS NULL OR billing_interval IN ('month', 'year'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'billing_accounts_allocation_nonneg') THEN
    ALTER TABLE public.billing_accounts ADD CONSTRAINT billing_accounts_allocation_nonneg
      CHECK (monthly_credit_allocation >= 0);
  END IF;
END $$;

ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "billing_accounts_owner_read" ON public.billing_accounts;
CREATE POLICY "billing_accounts_owner_read" ON public.billing_accounts
  FOR SELECT USING (auth.uid() = user_id);
-- No client write policy.

-- ==========================================================================
-- stripe_events — processed webhook event ids (replay protection).
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id           text PRIMARY KEY,
  type         text NOT NULL,
  created      timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error        text
);
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
-- No policies at all: service role only.

-- ==========================================================================
-- credit_purchases — one row per one-time pack Checkout. Financial audit
-- trail: survives account deletion with user_id nulled.
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  checkout_session_id text PRIMARY KEY,
  user_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_customer_id  text,
  pack_key            text NOT NULL,
  credits             integer NOT NULL CHECK (credits > 0),
  amount_cents        integer NOT NULL CHECK (amount_cents >= 0),
  currency            text NOT NULL DEFAULT 'usd',
  status              text NOT NULL DEFAULT 'pending',
  created_at          timestamptz NOT NULL DEFAULT now(),
  fulfilled_at        timestamptz
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_purchases_status_check') THEN
    ALTER TABLE public.credit_purchases ADD CONSTRAINT credit_purchases_status_check
      CHECK (status IN ('pending', 'paid', 'fulfilled', 'refunded', 'failed'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS credit_purchases_user_id_idx ON public.credit_purchases (user_id, created_at DESC);
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "credit_purchases_owner_read" ON public.credit_purchases;
CREATE POLICY "credit_purchases_owner_read" ON public.credit_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- ==========================================================================
-- deleted_accounts — minimal record kept after account deletion so refund /
-- chargeback questions can still be answered. No personal data beyond a
-- salted email hash and the Stripe customer id.
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.deleted_accounts (
  user_id            uuid PRIMARY KEY,
  email_hash         text,
  stripe_customer_id text,
  had_subscription   boolean NOT NULL DEFAULT false,
  deleted_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deleted_accounts ENABLE ROW LEVEL SECURITY;
-- Service role only.

-- ==========================================================================
-- grant_due_subscription_credits — annual plans receive credits monthly.
-- Callable by the authenticated user for THEIR OWN account only; the server
-- calls it on credit reads and job creation so a returning user is caught
-- up without a scheduler. Eligibility: status active AND now() inside the
-- paid period. cancel_at_period_end does NOT stop grants (the term is paid).
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.grant_due_subscription_credits()
RETURNS TABLE (grants integer, available_credits integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_b public.billing_accounts;
  v_count integer := 0;
  v_key text;
  v_available integer;
BEGIN
  IF v_user IS NULL THEN
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;

  SELECT * INTO v_b FROM public.billing_accounts WHERE user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN
    SELECT ca.available_credits INTO v_available FROM public.credit_accounts ca WHERE ca.user_id = v_user;
    RETURN QUERY SELECT 0, COALESCE(v_available, 0);
    RETURN;
  END IF;

  WHILE v_b.next_credit_grant_at IS NOT NULL
    AND v_b.next_credit_grant_at <= now()
    AND v_b.subscription_status = 'active'
    AND v_b.current_period_end IS NOT NULL
    AND v_b.next_credit_grant_at < v_b.current_period_end
    AND v_b.monthly_credit_allocation > 0
    AND v_count < 24
  LOOP
    v_key := v_b.stripe_subscription_id || ':' || to_char(v_b.next_credit_grant_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
    PERFORM public.grant_subscription_credits(v_user, v_b.monthly_credit_allocation, v_key, v_b.stripe_subscription_id);
    v_b.next_credit_grant_at := v_b.next_credit_grant_at + interval '1 month';
    v_b.last_grant_period_key := v_key;
    v_count := v_count + 1;
  END LOOP;

  IF v_count > 0 THEN
    UPDATE public.billing_accounts
       SET next_credit_grant_at = v_b.next_credit_grant_at,
           last_grant_period_key = v_b.last_grant_period_key,
           updated_at = now()
     WHERE user_id = v_user;
  END IF;

  SELECT ca.available_credits INTO v_available FROM public.credit_accounts ca WHERE ca.user_id = v_user;
  RETURN QUERY SELECT v_count, COALESCE(v_available, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_due_subscription_credits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_due_subscription_credits() TO authenticated, service_role;

COMMENT ON TABLE public.billing_accounts IS 'Stripe customer/subscription state per user. Written by webhooks (service role) only.';
COMMENT ON TABLE public.stripe_events IS 'Processed Stripe event ids; insert-before-handle makes every webhook replay-safe.';
COMMENT ON TABLE public.credit_purchases IS 'One-time credit pack purchases keyed by Checkout Session; kept after account deletion.';
