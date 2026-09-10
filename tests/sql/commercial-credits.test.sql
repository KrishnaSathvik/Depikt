-- Commercial credit invariants, run by scripts/test-credit-migration.sh
-- after the migrations. Every block raises on failure (ON_ERROR_STOP).

-- 1. New auth user → exactly 5 starter credits in the extra bucket, once.
DO $$
DECLARE u uuid := gen_random_uuid(); a record; n int;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u, 'starter@test.local');
  SELECT * INTO a FROM public.credit_accounts WHERE user_id = u;
  ASSERT a.plan_credits = 0, 'plan should be 0';
  ASSERT a.extra_credits = 5, format('extra should be 5, got %s', a.extra_credits);
  ASSERT a.available_credits = 5, 'available should be 5';
  SELECT count(*) INTO n FROM public.credit_ledger WHERE user_id = u AND entry_type = 'starter_grant' AND amount = 5 AND bucket = 'extra' AND idempotency_key = 'starter:' || u::text;
  ASSERT n = 1, 'one starter_grant row';
  PERFORM public.grant_starter_credits(u);
  PERFORM public.grant_starter_credits(u);
  SELECT * INTO a FROM public.credit_accounts WHERE user_id = u;
  ASSERT a.extra_credits = 5, 'double grant impossible';
  SELECT count(*) INTO n FROM public.credit_ledger WHERE user_id = u AND entry_type = 'starter_grant';
  ASSERT n = 1, 'still one starter row';
END $$;

-- 2. Spend order and refund-to-source.
DO $$
DECLARE u uuid := gen_random_uuid(); a record; r record; l record;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u, 'spend@test.local');
  -- extra only: reservation funded from extra
  SELECT * INTO r FROM public.reserve_generation_credits(u, 1, 'k1', 'generate:flare');
  ASSERT r.reserved, 'reserved from extra';
  SELECT * INTO a FROM public.credit_accounts WHERE user_id = u;
  ASSERT a.extra_credits = 4 AND a.plan_credits = 0 AND a.reserved_credits = 1 AND a.available_credits = 4, 'extra debited';
  SELECT * INTO l FROM public.credit_ledger WHERE user_id = u AND idempotency_key = 'k1';
  ASSERT l.bucket = 'extra' AND (l.metadata->>'extra')::int = 1 AND (l.metadata->>'plan')::int = 0, 'ledger records extra funding';
  -- failed job → refund to extra
  PERFORM public.finalize_generation_credits(u, 1, 'k1', 'refunded', NULL);
  SELECT * INTO a FROM public.credit_accounts WHERE user_id = u;
  ASSERT a.extra_credits = 5 AND a.reserved_credits = 0 AND a.available_credits = 5, 'refund restored extra';
  -- grant plan credits, then plan is spent first
  PERFORM public.grant_subscription_credits(u, 40, 'sub_t:p1', 'in_1');
  SELECT * INTO a FROM public.credit_accounts WHERE user_id = u;
  ASSERT a.plan_credits = 40 AND a.extra_credits = 5 AND a.available_credits = 45, 'plan granted';
  PERFORM public.grant_subscription_credits(u, 40, 'sub_t:p1', 'in_1');
  SELECT * INTO a FROM public.credit_accounts WHERE user_id = u;
  ASSERT a.plan_credits = 40 AND a.available_credits = 45, 'same period key is a no-op';
  SELECT * INTO r FROM public.reserve_generation_credits(u, 1, 'k2', 'generate:flare');
  SELECT * INTO a FROM public.credit_accounts WHERE user_id = u;
  ASSERT a.plan_credits = 39 AND a.extra_credits = 5, 'plan spent first';
  SELECT * INTO l FROM public.credit_ledger WHERE user_id = u AND idempotency_key = 'k2';
  ASSERT l.bucket = 'plan', 'ledger says plan';
  PERFORM public.finalize_generation_credits(u, 1, 'k2', 'charged', NULL);
  SELECT * INTO a FROM public.credit_accounts WHERE user_id = u;
  ASSERT a.plan_credits = 39 AND a.reserved_credits = 0 AND a.available_credits = 44, 'charge settles';
  -- plan-funded failure refunds plan, not extra
  SELECT * INTO r FROM public.reserve_generation_credits(u, 1, 'k3', 'generate:flare');
  PERFORM public.finalize_generation_credits(u, 1, 'k3', 'refunded', NULL);
  SELECT * INTO a FROM public.credit_accounts WHERE user_id = u;
  ASSERT a.plan_credits = 39 AND a.extra_credits = 5, 'refund went back to plan';
  -- top-up survives a monthly reset; reset writes an auditable pair
  PERFORM public.apply_top_up(u, 10, 'cs_test_1', 'pack_10');
  PERFORM public.apply_top_up(u, 10, 'cs_test_1', 'pack_10');
  SELECT * INTO a FROM public.credit_accounts WHERE user_id = u;
  ASSERT a.extra_credits = 15, format('top-up once, extra=%s', a.extra_credits);
  PERFORM public.grant_subscription_credits(u, 40, 'sub_t:p2', 'in_2');
  SELECT * INTO a FROM public.credit_accounts WHERE user_id = u;
  ASSERT a.plan_credits = 40 AND a.extra_credits = 15 AND a.available_credits = 55, 'reset then grant; extra untouched';
  SELECT * INTO l FROM public.credit_ledger WHERE user_id = u AND entry_type = 'subscription_reset' AND idempotency_key = 'sub_reset:sub_t:p2';
  ASSERT l.amount = -39 AND l.bucket = 'plan', 'reset row records the forfeited 39';
  -- split reservation across buckets, refunded to both
  PERFORM public.adjust_credits(u, 'plan', -39, 'test: leave 1 plan credit', 'adj_1', 'manual_adjustment');
  SELECT * INTO r FROM public.reserve_generation_credits(u, 2, 'k4', 'test:split');
  SELECT * INTO a FROM public.credit_accounts WHERE user_id = u;
  ASSERT a.plan_credits = 0 AND a.extra_credits = 14 AND a.reserved_credits = 2, 'split debit';
  SELECT * INTO l FROM public.credit_ledger WHERE user_id = u AND idempotency_key = 'k4';
  ASSERT l.bucket = 'plan+extra' AND (l.metadata->>'plan')::int = 1 AND (l.metadata->>'extra')::int = 1, 'split recorded';
  PERFORM public.finalize_generation_credits(u, 2, 'k4', 'refunded', NULL);
  SELECT * INTO a FROM public.credit_accounts WHERE user_id = u;
  ASSERT a.plan_credits = 1 AND a.extra_credits = 15 AND a.reserved_credits = 0, 'split refund to both buckets';
  -- insufficient
  SELECT * INTO r FROM public.reserve_generation_credits(u, 99, 'k5', 'test:too-many');
  ASSERT NOT r.reserved, 'cannot over-reserve';
END $$;

-- 3. Total consistency is enforced by the database, not the app.
DO $$
DECLARE u uuid := gen_random_uuid(); ok boolean := false;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u, 'consistency@test.local');
  BEGIN
    UPDATE public.credit_accounts SET available_credits = 99 WHERE user_id = u;
  EXCEPTION WHEN check_violation THEN ok := true;
  END;
  ASSERT ok, 'available must equal plan + extra';
END $$;

-- 4. Annual: monthly grants, catch-up, continue after cancel_at_period_end, stop when unpaid or past term.
DO $$
DECLARE u uuid := gen_random_uuid(); a record; n int; b record;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u, 'annual@test.local');
  INSERT INTO public.billing_accounts (user_id, stripe_customer_id, plan_key, stripe_subscription_id, subscription_status, billing_interval,
    current_period_start, current_period_end, monthly_credit_allocation, next_credit_grant_at)
  VALUES (u, 'cus_a', 'max', 'sub_a', 'active', 'year', now() - interval '3 months', now() + interval '9 months', 100, now() - interval '2 months');
  PERFORM set_config('request.jwt.claim.sub', u::text, false);
  PERFORM public.grant_due_subscription_credits();
  SELECT * INTO a FROM public.credit_accounts WHERE user_id = u;
  ASSERT a.plan_credits = 100, format('caught up to 100, got %s', a.plan_credits);
  SELECT count(*) INTO n FROM public.credit_ledger WHERE user_id = u AND entry_type = 'subscription_grant';
  ASSERT n = 3, format('three monthly grants caught up, got %s', n);
  SELECT * INTO b FROM public.billing_accounts WHERE user_id = u;
  ASSERT b.next_credit_grant_at > now() AND b.next_credit_grant_at <= now() + interval '1 month', 'next grant advanced';
  PERFORM public.grant_due_subscription_credits();
  SELECT count(*) INTO n FROM public.credit_ledger WHERE user_id = u AND entry_type = 'subscription_grant';
  ASSERT n = 3, 'idempotent when nothing is due';
  -- cancel renewal: still paid through the term, grants continue
  UPDATE public.billing_accounts SET cancel_at_period_end = true, next_credit_grant_at = now() - interval '1 day' WHERE user_id = u;
  PERFORM public.grant_due_subscription_credits();
  SELECT count(*) INTO n FROM public.credit_ledger WHERE user_id = u AND entry_type = 'subscription_grant';
  ASSERT n = 4, 'cancel_at_period_end does not stop grants inside the paid term';
  -- past_due: no grant
  UPDATE public.billing_accounts SET subscription_status = 'past_due', next_credit_grant_at = now() - interval '1 day' WHERE user_id = u;
  PERFORM public.grant_due_subscription_credits();
  SELECT count(*) INTO n FROM public.credit_ledger WHERE user_id = u AND entry_type = 'subscription_grant';
  ASSERT n = 4, 'past_due gets no grant';
  -- beyond the paid term: no grant
  UPDATE public.billing_accounts SET subscription_status = 'active', current_period_end = now() - interval '1 day' WHERE user_id = u;
  PERFORM public.grant_due_subscription_credits();
  SELECT count(*) INTO n FROM public.credit_ledger WHERE user_id = u AND entry_type = 'subscription_grant';
  ASSERT n = 4, 'no grant past current_period_end';
  -- another user cannot trigger grants for this account
  PERFORM set_config('request.jwt.claim.sub', gen_random_uuid()::text, false);
  UPDATE public.billing_accounts SET current_period_end = now() + interval '9 months', next_credit_grant_at = now() - interval '1 day' WHERE user_id = u;
  PERFORM public.grant_due_subscription_credits();
  SELECT count(*) INTO n FROM public.credit_ledger WHERE user_id = u AND entry_type = 'subscription_grant';
  ASSERT n = 4, 'grant_due only acts on auth.uid()';
END $$;

-- 5. Cancellation: plan credits go, extra stay.
DO $$
DECLARE u uuid := gen_random_uuid(); a record;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u, 'cancel@test.local');
  PERFORM public.grant_subscription_credits(u, 40, 'sub_c:p1', 'in_c');
  PERFORM public.apply_top_up(u, 25, 'cs_c', 'pack_25');
  PERFORM public.reset_plan_credits(u, 'sub_cancel:sub_c', 'subscription ended');
  SELECT * INTO a FROM public.credit_accounts WHERE user_id = u;
  ASSERT a.plan_credits = 0 AND a.extra_credits = 30 AND a.available_credits = 30, 'extra (5 starter + 25 pack) survives cancellation';
END $$;

-- 6. Billing tables: shape and idempotency helpers.
DO $$
DECLARE u uuid := gen_random_uuid(); n int;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u, 'tables@test.local');
  INSERT INTO public.stripe_events (id, type) VALUES ('evt_1', 'invoice.paid');
  INSERT INTO public.stripe_events (id, type) VALUES ('evt_1', 'invoice.paid') ON CONFLICT (id) DO NOTHING;
  SELECT count(*) INTO n FROM public.stripe_events WHERE id = 'evt_1';
  ASSERT n = 1, 'event ids unique';
  INSERT INTO public.credit_purchases (checkout_session_id, user_id, pack_key, credits, amount_cents, currency, status)
  VALUES ('cs_x', u, 'pack_10', 10, 600, 'usd', 'paid');
  DELETE FROM auth.users WHERE id = u;
  SELECT count(*) INTO n FROM public.credit_purchases WHERE checkout_session_id = 'cs_x' AND user_id IS NULL;
  ASSERT n = 1, 'purchase record survives account deletion with user_id nulled';
END $$;

SELECT 'ALL CREDIT INVARIANTS PASSED' AS result;
