-- Phase 6 (commercial launch), part 1: credit buckets, starter grant,
-- subscription/top-up grant RPCs.
--
-- APPLIED TO PRODUCTION (confirmed 2026-09-11 via a live account audit:
-- Account → Plan & Credits reads real credit_accounts rows). Tested on a
-- scratch Postgres via scripts/test-credit-migration.sh (tests/sql/
-- commercial-credits.test.sql holds the invariants).
--
-- Model (locked):
--   1 credit = 1 successful image operation, regardless of model.
--   plan_credits  — monthly allocation from Pro/Max; reset (not accumulated)
--                   at each grant; spent FIRST.
--   extra_credits — starter grant, purchased packs, promotions, manual
--                   adjustments; never expire while the account exists; spent
--                   SECOND; untouched by resets and cancellation.
--   available_credits stays the maintained total (plan + extra) so the
--   existing generation API/UI keep working unchanged.
--
-- Idempotent: safe to re-run.

-- ==========================================================================
-- credit_accounts: buckets
-- ==========================================================================
ALTER TABLE public.credit_accounts
  ADD COLUMN IF NOT EXISTS plan_credits  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_credits integer NOT NULL DEFAULT 0;

-- Backfill: any pre-existing balance is treated as non-expiring extra credit
-- (there were no subscriptions before this migration).
UPDATE public.credit_accounts
   SET extra_credits = available_credits, plan_credits = 0
 WHERE plan_credits + extra_credits <> available_credits;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_accounts_plan_nonneg') THEN
    ALTER TABLE public.credit_accounts ADD CONSTRAINT credit_accounts_plan_nonneg CHECK (plan_credits >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_accounts_extra_nonneg') THEN
    ALTER TABLE public.credit_accounts ADD CONSTRAINT credit_accounts_extra_nonneg CHECK (extra_credits >= 0);
  END IF;
  -- The three values can never drift: the total is derived by the database.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_accounts_total_consistent') THEN
    ALTER TABLE public.credit_accounts ADD CONSTRAINT credit_accounts_total_consistent
      CHECK (available_credits = plan_credits + extra_credits);
  END IF;
END $$;

-- ==========================================================================
-- credit_ledger: bucket, stripe_ref, metadata, new entry types
-- ==========================================================================
ALTER TABLE public.credit_ledger
  ADD COLUMN IF NOT EXISTS bucket     text,
  ADD COLUMN IF NOT EXISTS stripe_ref text,
  ADD COLUMN IF NOT EXISTS metadata   jsonb;

ALTER TABLE public.credit_ledger DROP CONSTRAINT IF EXISTS credit_ledger_entry_type_check;
ALTER TABLE public.credit_ledger ADD CONSTRAINT credit_ledger_entry_type_check
  CHECK (entry_type IN (
    'starter_grant', 'subscription_grant', 'subscription_reset', 'top_up',
    'generation_reservation', 'generation_charge', 'refund',
    'plan_change_adjustment', 'manual_adjustment'
  ));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_ledger_bucket_check') THEN
    ALTER TABLE public.credit_ledger ADD CONSTRAINT credit_ledger_bucket_check
      CHECK (bucket IS NULL OR bucket IN ('plan', 'extra', 'plan+extra'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS credit_ledger_stripe_ref_idx ON public.credit_ledger (stripe_ref) WHERE stripe_ref IS NOT NULL;

-- ==========================================================================
-- Internal helper: lock (or create) the caller's account row.
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.lock_credit_account(p_user_id uuid)
RETURNS public.credit_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.credit_accounts;
BEGIN
  INSERT INTO public.credit_accounts (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_row FROM public.credit_accounts WHERE user_id = p_user_id FOR UPDATE;
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.lock_credit_account(uuid) FROM PUBLIC;

-- ==========================================================================
-- reserve_generation_credits — plan first, then extra. Records the split.
-- Same signature as before so the app keeps calling it unchanged.
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.reserve_generation_credits(
  p_user_id uuid,
  p_amount integer,
  p_idempotency_key text,
  p_reason text DEFAULT NULL
)
RETURNS TABLE (ledger_id uuid, reserved boolean, available_credits integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_acct public.credit_accounts;
  v_from_plan integer;
  v_from_extra integer;
  v_new_ledger_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'reserve_generation_credits: amount must be positive';
  END IF;

  SELECT id INTO v_existing_id
    FROM public.credit_ledger
   WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  IF v_existing_id IS NOT NULL THEN
    SELECT ca.available_credits INTO v_acct.available_credits FROM public.credit_accounts ca WHERE ca.user_id = p_user_id;
    RETURN QUERY SELECT v_existing_id, true, COALESCE(v_acct.available_credits, 0);
    RETURN;
  END IF;

  v_acct := public.lock_credit_account(p_user_id);

  IF v_acct.available_credits < p_amount THEN
    RETURN QUERY SELECT NULL::uuid, false, v_acct.available_credits;
    RETURN;
  END IF;

  v_from_plan := LEAST(v_acct.plan_credits, p_amount);
  v_from_extra := p_amount - v_from_plan;

  UPDATE public.credit_accounts ca
     SET plan_credits = ca.plan_credits - v_from_plan,
         extra_credits = ca.extra_credits - v_from_extra,
         available_credits = ca.available_credits - p_amount,
         reserved_credits = ca.reserved_credits + p_amount,
         updated_at = now()
   WHERE ca.user_id = p_user_id;

  INSERT INTO public.credit_ledger (user_id, entry_type, amount, idempotency_key, reason, bucket, metadata)
  VALUES (
    p_user_id, 'generation_reservation', -p_amount, p_idempotency_key, p_reason,
    CASE WHEN v_from_plan > 0 AND v_from_extra > 0 THEN 'plan+extra'
         WHEN v_from_plan > 0 THEN 'plan' ELSE 'extra' END,
    jsonb_build_object('plan', v_from_plan, 'extra', v_from_extra)
  )
  RETURNING id INTO v_new_ledger_id;

  SELECT ca.available_credits INTO v_acct.available_credits FROM public.credit_accounts ca WHERE ca.user_id = p_user_id;
  RETURN QUERY SELECT v_new_ledger_id, true, v_acct.available_credits;
END;
$$;

-- ==========================================================================
-- finalize_generation_credits — refund goes back to the SAME buckets the
-- reservation came from (read from the reservation row's metadata).
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.finalize_generation_credits(
  p_user_id uuid,
  p_amount integer,
  p_idempotency_key text,
  p_outcome text,
  p_job_id uuid DEFAULT NULL
)
RETURNS TABLE (ledger_id uuid, available_credits integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_final_key text := p_idempotency_key || ':' || p_outcome;
  v_existing_id uuid;
  v_new_ledger_id uuid;
  v_available integer;
  v_meta jsonb;
  v_to_plan integer := 0;
  v_to_extra integer;
  v_bucket text;
BEGIN
  IF p_outcome NOT IN ('charged', 'refunded') THEN
    RAISE EXCEPTION 'finalize_generation_credits: invalid outcome %', p_outcome;
  END IF;

  SELECT id INTO v_existing_id
    FROM public.credit_ledger
   WHERE user_id = p_user_id AND idempotency_key = v_final_key;
  IF v_existing_id IS NOT NULL THEN
    SELECT ca.available_credits INTO v_available FROM public.credit_accounts ca WHERE ca.user_id = p_user_id;
    RETURN QUERY SELECT v_existing_id, COALESCE(v_available, 0);
    RETURN;
  END IF;

  PERFORM public.lock_credit_account(p_user_id);

  IF p_outcome = 'charged' THEN
    UPDATE public.credit_accounts ca
       SET reserved_credits = GREATEST(ca.reserved_credits - p_amount, 0),
           updated_at = now()
     WHERE ca.user_id = p_user_id;
    INSERT INTO public.credit_ledger (user_id, entry_type, amount, job_id, idempotency_key, reason)
    VALUES (p_user_id, 'generation_charge', 0, p_job_id, v_final_key, 'reservation settled: job succeeded')
    RETURNING id INTO v_new_ledger_id;
  ELSE
    SELECT l.metadata, l.bucket INTO v_meta, v_bucket
      FROM public.credit_ledger l
     WHERE l.user_id = p_user_id AND l.idempotency_key = p_idempotency_key;
    -- Legacy reservations (before buckets) carry no split: restore to extra.
    v_to_plan := LEAST(COALESCE((v_meta->>'plan')::integer, 0), p_amount);
    v_to_extra := p_amount - v_to_plan;
    UPDATE public.credit_accounts ca
       SET reserved_credits = GREATEST(ca.reserved_credits - p_amount, 0),
           plan_credits = ca.plan_credits + v_to_plan,
           extra_credits = ca.extra_credits + v_to_extra,
           available_credits = ca.available_credits + p_amount,
           updated_at = now()
     WHERE ca.user_id = p_user_id;
    INSERT INTO public.credit_ledger (user_id, entry_type, amount, job_id, idempotency_key, reason, bucket, metadata)
    VALUES (p_user_id, 'refund', p_amount, p_job_id, v_final_key, 'reservation released: job failed',
            COALESCE(v_bucket, 'extra'), jsonb_build_object('plan', v_to_plan, 'extra', v_to_extra))
    RETURNING id INTO v_new_ledger_id;
  END IF;

  SELECT ca.available_credits INTO v_available FROM public.credit_accounts ca WHERE ca.user_id = p_user_id;
  RETURN QUERY SELECT v_new_ledger_id, v_available;
END;
$$;

-- ==========================================================================
-- grant_starter_credits — exactly once per auth.users row (key starter:<uid>).
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.starter_credit_amount() RETURNS integer
LANGUAGE sql IMMUTABLE AS $$ SELECT 5 $$;

CREATE OR REPLACE FUNCTION public.grant_starter_credits(p_user_id uuid)
RETURNS TABLE (ledger_id uuid, granted boolean, available_credits integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := 'starter:' || p_user_id::text;
  v_existing_id uuid;
  v_amount integer := public.starter_credit_amount();
  v_new_id uuid;
  v_available integer;
BEGIN
  SELECT id INTO v_existing_id FROM public.credit_ledger WHERE user_id = p_user_id AND idempotency_key = v_key;
  IF v_existing_id IS NOT NULL THEN
    SELECT ca.available_credits INTO v_available FROM public.credit_accounts ca WHERE ca.user_id = p_user_id;
    RETURN QUERY SELECT v_existing_id, false, COALESCE(v_available, 0);
    RETURN;
  END IF;

  PERFORM public.lock_credit_account(p_user_id);
  UPDATE public.credit_accounts ca
     SET extra_credits = ca.extra_credits + v_amount,
         available_credits = ca.available_credits + v_amount,
         updated_at = now()
   WHERE ca.user_id = p_user_id;
  INSERT INTO public.credit_ledger (user_id, entry_type, amount, idempotency_key, reason, bucket)
  VALUES (p_user_id, 'starter_grant', v_amount, v_key, 'welcome credits', 'extra')
  RETURNING id INTO v_new_id;
  SELECT ca.available_credits INTO v_available FROM public.credit_accounts ca WHERE ca.user_id = p_user_id;
  RETURN QUERY SELECT v_new_id, true, v_available;
END;
$$;

-- Trigger on auth.users. Kept minimal; a failure is logged and never blocks
-- account creation (the grant can be replayed later with the same key).
CREATE OR REPLACE FUNCTION public.handle_new_depikt_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM public.grant_starter_credits(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_depikt_user: starter grant failed for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_depikt ON auth.users;
CREATE TRIGGER on_auth_user_created_depikt
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_depikt_user();

-- ==========================================================================
-- reset_plan_credits — forfeit unused plan credits (monthly reset, cancel).
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.reset_plan_credits(p_user_id uuid, p_idempotency_key text, p_reason text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_acct public.credit_accounts; v_forfeited integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.credit_ledger WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key) THEN
    RETURN 0;
  END IF;
  v_acct := public.lock_credit_account(p_user_id);
  v_forfeited := v_acct.plan_credits;
  IF v_forfeited > 0 THEN
    UPDATE public.credit_accounts ca
       SET plan_credits = 0,
           available_credits = ca.available_credits - v_forfeited,
           updated_at = now()
     WHERE ca.user_id = p_user_id;
    INSERT INTO public.credit_ledger (user_id, entry_type, amount, idempotency_key, reason, bucket)
    VALUES (p_user_id, 'subscription_reset', -v_forfeited, p_idempotency_key, p_reason, 'plan');
  END IF;
  RETURN v_forfeited;
END;
$$;

-- ==========================================================================
-- grant_subscription_credits — reset unused plan credits, then grant the
-- period's allocation. Idempotent by period key.
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.grant_subscription_credits(
  p_user_id uuid,
  p_allocation integer,
  p_period_key text,
  p_stripe_ref text DEFAULT NULL
)
RETURNS TABLE (ledger_id uuid, granted boolean, available_credits integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := 'sub_grant:' || p_period_key;
  v_existing_id uuid;
  v_new_id uuid;
  v_available integer;
BEGIN
  IF p_allocation < 0 THEN RAISE EXCEPTION 'grant_subscription_credits: negative allocation'; END IF;
  SELECT id INTO v_existing_id FROM public.credit_ledger WHERE user_id = p_user_id AND idempotency_key = v_key;
  IF v_existing_id IS NOT NULL THEN
    SELECT ca.available_credits INTO v_available FROM public.credit_accounts ca WHERE ca.user_id = p_user_id;
    RETURN QUERY SELECT v_existing_id, false, COALESCE(v_available, 0);
    RETURN;
  END IF;

  PERFORM public.reset_plan_credits(p_user_id, 'sub_reset:' || p_period_key, 'unused plan credits forfeited at grant');
  PERFORM public.lock_credit_account(p_user_id);
  UPDATE public.credit_accounts ca
     SET plan_credits = ca.plan_credits + p_allocation,
         available_credits = ca.available_credits + p_allocation,
         updated_at = now()
   WHERE ca.user_id = p_user_id;
  INSERT INTO public.credit_ledger (user_id, entry_type, amount, idempotency_key, reason, bucket, stripe_ref)
  VALUES (p_user_id, 'subscription_grant', p_allocation, v_key, 'monthly plan credits', 'plan', p_stripe_ref)
  RETURNING id INTO v_new_id;
  SELECT ca.available_credits INTO v_available FROM public.credit_accounts ca WHERE ca.user_id = p_user_id;
  RETURN QUERY SELECT v_new_id, true, v_available;
END;
$$;

-- ==========================================================================
-- apply_top_up — purchased pack → extra bucket. Idempotent by Checkout Session.
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.apply_top_up(
  p_user_id uuid,
  p_credits integer,
  p_checkout_session_id text,
  p_pack_key text DEFAULT NULL
)
RETURNS TABLE (ledger_id uuid, applied boolean, available_credits integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := 'top_up:' || p_checkout_session_id;
  v_existing_id uuid;
  v_new_id uuid;
  v_available integer;
BEGIN
  IF p_credits <= 0 THEN RAISE EXCEPTION 'apply_top_up: credits must be positive'; END IF;
  SELECT id INTO v_existing_id FROM public.credit_ledger WHERE user_id = p_user_id AND idempotency_key = v_key;
  IF v_existing_id IS NOT NULL THEN
    SELECT ca.available_credits INTO v_available FROM public.credit_accounts ca WHERE ca.user_id = p_user_id;
    RETURN QUERY SELECT v_existing_id, false, COALESCE(v_available, 0);
    RETURN;
  END IF;
  PERFORM public.lock_credit_account(p_user_id);
  UPDATE public.credit_accounts ca
     SET extra_credits = ca.extra_credits + p_credits,
         available_credits = ca.available_credits + p_credits,
         updated_at = now()
   WHERE ca.user_id = p_user_id;
  INSERT INTO public.credit_ledger (user_id, entry_type, amount, idempotency_key, reason, bucket, stripe_ref, metadata)
  VALUES (p_user_id, 'top_up', p_credits, v_key, 'purchased credits', 'extra', p_checkout_session_id,
          jsonb_build_object('pack_key', p_pack_key))
  RETURNING id INTO v_new_id;
  SELECT ca.available_credits INTO v_available FROM public.credit_accounts ca WHERE ca.user_id = p_user_id;
  RETURN QUERY SELECT v_new_id, true, v_available;
END;
$$;

-- ==========================================================================
-- adjust_credits — manual / plan-change adjustments on one bucket.
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.adjust_credits(
  p_user_id uuid,
  p_bucket text,
  p_delta integer,
  p_reason text,
  p_idempotency_key text,
  p_entry_type text DEFAULT 'manual_adjustment',
  p_stripe_ref text DEFAULT NULL
)
RETURNS TABLE (ledger_id uuid, applied boolean, available_credits integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_existing_id uuid; v_new_id uuid; v_available integer;
BEGIN
  IF p_bucket NOT IN ('plan', 'extra') THEN RAISE EXCEPTION 'adjust_credits: bucket must be plan or extra'; END IF;
  IF p_entry_type NOT IN ('manual_adjustment', 'plan_change_adjustment') THEN
    RAISE EXCEPTION 'adjust_credits: invalid entry type %', p_entry_type;
  END IF;
  SELECT id INTO v_existing_id FROM public.credit_ledger WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  IF v_existing_id IS NOT NULL THEN
    SELECT ca.available_credits INTO v_available FROM public.credit_accounts ca WHERE ca.user_id = p_user_id;
    RETURN QUERY SELECT v_existing_id, false, COALESCE(v_available, 0);
    RETURN;
  END IF;
  PERFORM public.lock_credit_account(p_user_id);
  IF p_bucket = 'plan' THEN
    UPDATE public.credit_accounts ca
       SET plan_credits = ca.plan_credits + p_delta, available_credits = ca.available_credits + p_delta, updated_at = now()
     WHERE ca.user_id = p_user_id;
  ELSE
    UPDATE public.credit_accounts ca
       SET extra_credits = ca.extra_credits + p_delta, available_credits = ca.available_credits + p_delta, updated_at = now()
     WHERE ca.user_id = p_user_id;
  END IF;
  INSERT INTO public.credit_ledger (user_id, entry_type, amount, idempotency_key, reason, bucket, stripe_ref)
  VALUES (p_user_id, p_entry_type, p_delta, p_idempotency_key, p_reason, p_bucket, p_stripe_ref)
  RETURNING id INTO v_new_id;
  SELECT ca.available_credits INTO v_available FROM public.credit_accounts ca WHERE ca.user_id = p_user_id;
  RETURN QUERY SELECT v_new_id, true, v_available;
END;
$$;

-- ==========================================================================
-- Grants. Reservation/finalize keep running as the authenticated user (the
-- generation routes use the user's JWT). Every grant/adjust path is
-- server-only: service_role, never the browser.
-- ==========================================================================
REVOKE ALL ON FUNCTION public.reserve_generation_credits(uuid, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_generation_credits(uuid, integer, text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.finalize_generation_credits(uuid, integer, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_generation_credits(uuid, integer, text, text, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.grant_starter_credits(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_starter_credits(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.reset_plan_credits(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_plan_credits(uuid, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.grant_subscription_credits(uuid, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_subscription_credits(uuid, integer, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.apply_top_up(uuid, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_top_up(uuid, integer, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.adjust_credits(uuid, text, integer, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_credits(uuid, text, integer, text, text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.handle_new_depikt_user() FROM PUBLIC;

COMMENT ON COLUMN public.credit_accounts.plan_credits IS 'Monthly Pro/Max allocation; reset at each grant; spent first.';
COMMENT ON COLUMN public.credit_accounts.extra_credits IS 'Starter, purchased, promotional, manual credits; never expire while the account exists; spent second.';
COMMENT ON COLUMN public.credit_ledger.bucket IS 'plan | extra | plan+extra — which bucket(s) the row moved.';
COMMENT ON COLUMN public.credit_ledger.metadata IS 'For reservations/refunds: {"plan": n, "extra": m} split. For top-ups: pack_key.';
