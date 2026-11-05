-- Critical fix: credit functions were executable by anon/authenticated in the
-- live database (REVOKE ... FROM PUBLIC does not remove the platform's direct
-- role grants). Callers could mint, refund or reset credits for any account.
--
-- 1. settle_generation_job: the only settlement entry point for signed-in
--    users. Amount, key and owner are read from the job row, never from the
--    caller; the outcome must match the job's terminal status; a reservation
--    must exist; and a reservation gets exactly one outcome (charged XOR
--    refunded).
-- 2. Every raw credit function becomes service_role-only.

CREATE OR REPLACE FUNCTION public.settle_generation_job(p_job_id uuid, p_outcome text)
 RETURNS TABLE(ledger_id uuid, applied boolean, available_credits integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_job public.generation_jobs;
  v_other text;
  v_existing_id uuid;
  v_result RECORD;
  v_available integer;
BEGIN
  IF p_outcome NOT IN ('charged', 'refunded') THEN
    RAISE EXCEPTION 'settle_generation_job: invalid outcome %', p_outcome;
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'settle_generation_job: authentication required';
  END IF;

  SELECT * INTO v_job FROM public.generation_jobs WHERE id = p_job_id;
  IF NOT FOUND OR v_job.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'settle_generation_job: job not found';
  END IF;

  IF p_outcome = 'charged' AND v_job.status <> 'succeeded' THEN
    RAISE EXCEPTION 'settle_generation_job: only a succeeded job can be charged';
  END IF;
  IF p_outcome = 'refunded' AND v_job.status NOT IN ('failed', 'cancelled') THEN
    RAISE EXCEPTION 'settle_generation_job: only a failed or cancelled job can be refunded';
  END IF;

  -- Serialize all settlement for this account before the checks below.
  PERFORM public.lock_credit_account(v_job.user_id);

  IF NOT EXISTS (
    SELECT 1 FROM public.credit_ledger
     WHERE user_id = v_job.user_id
       AND idempotency_key = v_job.idempotency_key
       AND entry_type = 'generation_reservation'
  ) THEN
    RAISE EXCEPTION 'settle_generation_job: no reservation for job';
  END IF;

  -- Same outcome already recorded: idempotent replay.
  SELECT id INTO v_existing_id FROM public.credit_ledger
   WHERE user_id = v_job.user_id AND idempotency_key = v_job.idempotency_key || ':' || p_outcome;
  IF v_existing_id IS NOT NULL THEN
    SELECT ca.available_credits INTO v_available FROM public.credit_accounts ca WHERE ca.user_id = v_job.user_id;
    RETURN QUERY SELECT v_existing_id, false, COALESCE(v_available, 0);
    RETURN;
  END IF;

  -- Opposite outcome already recorded: a reservation settles exactly once.
  v_other := CASE WHEN p_outcome = 'charged' THEN 'refunded' ELSE 'charged' END;
  IF EXISTS (
    SELECT 1 FROM public.credit_ledger
     WHERE user_id = v_job.user_id AND idempotency_key = v_job.idempotency_key || ':' || v_other
  ) THEN
    RAISE EXCEPTION 'settle_generation_job: reservation already %', v_other;
  END IF;

  SELECT * INTO v_result FROM public.finalize_generation_credits(
    v_job.user_id, v_job.credit_cost, v_job.idempotency_key, p_outcome, v_job.id);
  RETURN QUERY SELECT v_result.ledger_id, true, v_result.available_credits;
END;
$function$;

-- Raw credit functions: trusted server (service_role) only. SECURITY DEFINER
-- wrappers that stay user-callable (create_generation_job[s],
-- grant_due_subscription_credits, settle_generation_job) run as the owner,
-- so they keep working; each binds to auth.uid() itself.
REVOKE ALL ON FUNCTION public.adjust_credits(uuid, text, integer, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_top_up(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_generation_credits(uuid, integer, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_generation_credits(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_subscription_credits(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_starter_credits(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_plan_credits(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lock_credit_account(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_depikt_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_depikt_profile() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.adjust_credits(uuid, text, integer, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_top_up(uuid, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_generation_credits(uuid, integer, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_generation_credits(uuid, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_subscription_credits(uuid, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_starter_credits(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_plan_credits(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.lock_credit_account(uuid) TO service_role;

-- User-callable wrappers: signed-in users only, never anon.
REVOKE ALL ON FUNCTION public.settle_generation_job(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_generation_job(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_generation_job(uuid, uuid, text, text, text, integer, integer, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_generation_job(uuid, uuid, text, text, text, integer, integer, uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_generation_jobs(uuid, uuid, text, text, text[], text[], integer, integer, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_generation_jobs(uuid, uuid, text, text, text[], text[], integer, integer, uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.grant_due_subscription_credits() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_due_subscription_credits() TO authenticated, service_role;
