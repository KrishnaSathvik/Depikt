-- Step 2: job security, refund integrity, credit reliability.
-- Apply AFTER lock_down_credit_functions.sql. Not yet applied to production.
--
-- 1. transition_generation_job: the only way a signed-in request can change a
--    job's state. Valid transitions only (queued->running/failed/cancelled,
--    running->succeeded/failed/cancelled), terminal states are final, fields
--    are allowlisted per target status, and the conditional UPDATE keeps it
--    concurrency-safe. Direct UPDATE on generation_jobs is revoked from
--    authenticated, so status, error codes, usage and validation results can
--    no longer be written by client-issued SQL.
-- 2. image_versions inserts are gated on the job still being non-terminal, so
--    a job a user forced into "failed" can no longer receive a result image
--    (closes the fake-failure refund exploit: refund yes, image no).
-- 3. finalize_generation_credits: a refund no longer restores plan credits
--    that a subscription renewal reset has already forfeited. Purchased
--    (extra) credits always restore. Documented behavior: plan credits are
--    use-it-or-lose-it per period; a refund landing after a renewal boundary
--    restores only the extra portion and records the expired plan portion in
--    the ledger entry's metadata.
-- 4. reap_stale_generation_jobs: scheduled reconciliation independent of
--    users reopening sessions. Fails jobs stuck queued/running past the
--    staleness window and settles every terminal job whose reservation has
--    no outcome yet. Idempotent via the ledger idempotency keys; bounded to
--    200 rows per pass per sweep.

CREATE OR REPLACE FUNCTION public.transition_generation_job(p_job_id uuid, p_to_status text, p_patch jsonb DEFAULT '{}'::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_job public.generation_jobs;
  v_error_code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'transition_generation_job: authentication required';
  END IF;

  SELECT * INTO v_job FROM public.generation_jobs WHERE id = p_job_id;
  IF NOT FOUND OR v_job.user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  -- Re-entry safety: the executor may confirm "running" twice.
  IF v_job.status = p_to_status AND p_to_status = 'running' THEN
    RETURN true;
  END IF;

  IF v_job.status IN ('succeeded', 'failed', 'cancelled') THEN
    RETURN false;
  END IF;

  IF NOT (
    (v_job.status = 'queued' AND p_to_status IN ('running', 'failed', 'cancelled'))
    OR (v_job.status = 'running' AND p_to_status IN ('succeeded', 'failed', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'transition_generation_job: invalid transition % -> %', v_job.status, p_to_status;
  END IF;

  IF p_to_status = 'running' THEN
    UPDATE public.generation_jobs
       SET status = 'running', started_at = COALESCE(started_at, now())
     WHERE id = p_job_id AND status = 'queued';
  ELSIF p_to_status = 'succeeded' THEN
    UPDATE public.generation_jobs
       SET status = 'succeeded',
           completed_at = now(),
           usage_json = p_patch->'usage_json',
           estimated_api_cost_usd = (p_patch->>'estimated_api_cost_usd')::numeric,
           openai_request_id = p_patch->>'openai_request_id'
     WHERE id = p_job_id AND status = 'running';
  ELSIF p_to_status = 'failed' THEN
    v_error_code := p_patch->>'error_code';
    IF v_error_code IS NULL OR v_error_code NOT IN
       ('rate_limited', 'rejected', 'provider_error', 'unknown', 'timed_out', 'unavailable') THEN
      RAISE EXCEPTION 'transition_generation_job: invalid error_code %', v_error_code;
    END IF;
    UPDATE public.generation_jobs
       SET status = 'failed',
           completed_at = now(),
           error_code = v_error_code,
           safe_error_message = left(COALESCE(p_patch->>'safe_error_message', 'Generation failed.'), 200)
     WHERE id = p_job_id AND status IN ('queued', 'running');
  ELSE
    UPDATE public.generation_jobs
       SET status = 'cancelled', completed_at = now()
     WHERE id = p_job_id AND status IN ('queued', 'running');
  END IF;

  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_generation_job_validation(p_job_id uuid, p_validation_result jsonb, p_usage_validation jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'save_generation_job_validation: authentication required';
  END IF;

  UPDATE public.generation_jobs
     SET validation_result = p_validation_result,
         usage_json = COALESCE(usage_json, '{}'::jsonb)
                      || jsonb_build_object('validation', p_usage_validation)
   WHERE id = p_job_id
     AND user_id = auth.uid()
     AND status = 'running';

  RETURN FOUND;
END;
$function$;

-- Result images only attach to a job that is still in flight.
DROP POLICY image_versions_owner_insert ON public.image_versions;
CREATE POLICY image_versions_owner_insert ON public.image_versions
  FOR INSERT TO public
  WITH CHECK (
    (auth.uid() = user_id)
    AND (EXISTS (
      SELECT 1 FROM generation_sessions gs
      WHERE gs.id = image_versions.session_id AND gs.user_id = image_versions.user_id
    ))
    AND (EXISTS (
      SELECT 1 FROM generation_jobs gj
      WHERE gj.id = image_versions.job_id
        AND gj.user_id = image_versions.user_id
        AND gj.status IN ('queued', 'running')
    ))
  );

-- Refunds must not resurrect expired plan credits.
CREATE OR REPLACE FUNCTION public.finalize_generation_credits(p_user_id uuid, p_amount integer, p_idempotency_key text, p_outcome text, p_job_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(ledger_id uuid, available_credits integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_final_key text := p_idempotency_key || ':' || p_outcome;
  v_existing_id uuid;
  v_new_ledger_id uuid;
  v_available integer;
  v_meta jsonb;
  v_reserved_at timestamptz;
  v_to_plan integer := 0;
  v_to_extra integer;
  v_expired_plan integer := 0;
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
    SELECT l.metadata, l.bucket, l.created_at INTO v_meta, v_bucket, v_reserved_at
      FROM public.credit_ledger l
     WHERE l.user_id = p_user_id AND l.idempotency_key = p_idempotency_key;
    -- Legacy reservations (before buckets) carry no split: restore to extra.
    v_to_plan := LEAST(COALESCE((v_meta->>'plan')::integer, 0), p_amount);
    -- Plan credits are use-it-or-lose-it per period: if a renewal reset
    -- landed after this reservation, the plan portion expired with the old
    -- period and is not restored. Purchased (extra) credits always restore.
    IF v_to_plan > 0 AND EXISTS (
      SELECT 1 FROM public.credit_ledger l
       WHERE l.user_id = p_user_id
         AND l.entry_type = 'subscription_reset'
         AND l.created_at > v_reserved_at
    ) THEN
      v_expired_plan := v_to_plan;
      v_to_plan := 0;
    END IF;
    v_to_extra := p_amount - v_to_plan - v_expired_plan;
    UPDATE public.credit_accounts ca
       SET reserved_credits = GREATEST(ca.reserved_credits - p_amount, 0),
           plan_credits = ca.plan_credits + v_to_plan,
           extra_credits = ca.extra_credits + v_to_extra,
           available_credits = ca.available_credits + p_amount - v_expired_plan,
           updated_at = now()
     WHERE ca.user_id = p_user_id;
    INSERT INTO public.credit_ledger (user_id, entry_type, amount, job_id, idempotency_key, reason, bucket, metadata)
    VALUES (p_user_id, 'refund', p_amount - v_expired_plan, p_job_id, v_final_key, 'reservation released: job failed',
            COALESCE(v_bucket, 'extra'),
            jsonb_build_object('plan', v_to_plan, 'extra', v_to_extra, 'expired_plan', v_expired_plan))
    RETURNING id INTO v_new_ledger_id;
  END IF;

  SELECT ca.available_credits INTO v_available FROM public.credit_accounts ca WHERE ca.user_id = p_user_id;
  RETURN QUERY SELECT v_new_ledger_id, v_available;
END;
$function$;

-- Scheduled reconciliation: settle abandoned jobs without a user reopening
-- the session. Service role / cron only — never callable by signed-in users.
CREATE OR REPLACE FUNCTION public.reap_stale_generation_jobs(p_stale interval DEFAULT '6 minutes'::interval)
 RETURNS TABLE(failed_count integer, settled_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_job RECORD;
  v_failed integer := 0;
  v_settled integer := 0;
BEGIN
  FOR v_job IN
    SELECT j.id, j.user_id, j.idempotency_key, j.credit_cost, j.status
      FROM public.generation_jobs j
     WHERE j.status IN ('queued', 'running')
       AND j.created_at < now() - p_stale
     ORDER BY j.created_at
     LIMIT 200
  LOOP
    UPDATE public.generation_jobs
       SET status = 'failed',
           completed_at = now(),
           error_code = 'timed_out',
           safe_error_message = 'Generation timed out. Your credit was returned.'
     WHERE id = v_job.id AND status IN ('queued', 'running');
    IF FOUND THEN v_failed := v_failed + 1; END IF;
  END LOOP;

  FOR v_job IN
    SELECT j.id, j.user_id, j.idempotency_key, j.credit_cost, j.status
      FROM public.generation_jobs j
     WHERE j.status IN ('succeeded', 'failed', 'cancelled')
       AND EXISTS (
         SELECT 1 FROM public.credit_ledger l
          WHERE l.user_id = j.user_id
            AND l.idempotency_key = j.idempotency_key
            AND l.entry_type = 'generation_reservation'
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.credit_ledger l
          WHERE l.user_id = j.user_id
            AND l.idempotency_key IN (j.idempotency_key || ':charged', j.idempotency_key || ':refunded')
       )
     ORDER BY j.created_at
     LIMIT 200
  LOOP
    PERFORM public.finalize_generation_credits(
      v_job.user_id,
      v_job.credit_cost,
      v_job.idempotency_key,
      CASE WHEN v_job.status = 'succeeded' THEN 'charged' ELSE 'refunded' END,
      v_job.id
    );
    v_settled := v_settled + 1;
  END LOOP;

  RETURN QUERY SELECT v_failed, v_settled;
END;
$function$;

-- Direct row edits to jobs are closed; state changes go through the
-- transition function above. SELECT stays for polling.
REVOKE UPDATE ON public.generation_jobs FROM authenticated;

REVOKE ALL ON FUNCTION public.transition_generation_job(uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_generation_job(uuid, text, jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.save_generation_job_validation(uuid, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_generation_job_validation(uuid, jsonb, jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.reap_stale_generation_jobs(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reap_stale_generation_jobs(interval) TO service_role;
