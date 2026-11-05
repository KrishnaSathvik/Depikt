-- PREPARED ONLY. Step 4D — trusted server-only execution-token boundary.
-- Apply after Step 3 and Step 4 (step4_media_metadata.sql), at the approved release.
--
-- Root cause fixed here: Step 3 returned execution tokens from
-- create_generation_job(s), which signed-in users can call directly through
-- the Data API (including idempotent replay), so an owner could read their
-- own job's token and force execution transitions/refund outcomes.
--
-- Resolution:
--   * job creation no longer returns tokens (new and replayed calls);
--   * the only reader is get_generation_execution_token, EXECUTE granted to
--     service_role only; the server calls it after authenticating the user;
--   * plan_json is fully immutable again; the encrypted token map and its
--     merge RPC are removed (tokens are never copied out of the job row);
--   * execution_token stays column-revoked from anon/authenticated.

-- 1. Job creation without token disclosure (return type changes => drop first).
DROP FUNCTION IF EXISTS public.create_generation_job(uuid, uuid, text, text, text, integer, integer, uuid, text);
CREATE FUNCTION public.create_generation_job(
  p_user_id           uuid,
  p_session_id        uuid,
  p_operation         text,
  p_model             text,
  p_prompt            text,
  p_width             integer,
  p_height            integer,
  p_source_version_id uuid,
  p_idempotency_key   text
)
RETURNS TABLE (
  job_id             uuid,
  reserved           boolean,
  available_credits  integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_reservation RECORD;
  v_new_job_id uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'create_generation_job: authenticated user does not match p_user_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.generation_sessions gs
     WHERE gs.id = p_session_id
       AND gs.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'create_generation_job: session does not belong to user';
  END IF;

  IF p_source_version_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM public.image_versions iv
     WHERE iv.id = p_source_version_id
       AND iv.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'create_generation_job: source version does not belong to user';
  END IF;

  -- Idempotent replay: a job already exists for this key, return it as-is
  -- rather than reserving/creating again.
  SELECT gj.id INTO v_existing
    FROM public.generation_jobs gj
   WHERE gj.user_id = p_user_id AND gj.idempotency_key = p_idempotency_key;

  IF v_existing.id IS NOT NULL THEN
    RETURN QUERY
      SELECT v_existing.id, true,
             (SELECT ca.available_credits FROM public.credit_accounts ca WHERE ca.user_id = p_user_id);
    RETURN;
  END IF;

  SELECT * INTO v_reservation
    FROM public.reserve_generation_credits(p_user_id, 1, p_idempotency_key, p_operation || ':' || p_model);

  IF NOT v_reservation.reserved THEN
    RETURN QUERY SELECT NULL::uuid, false, v_reservation.available_credits;
    RETURN;
  END IF;

  INSERT INTO public.generation_jobs (
    user_id, session_id, operation, model, quality, status,
    prompt, source_version_id, width, height, credit_cost, idempotency_key
  ) VALUES (
    p_user_id, p_session_id, p_operation, p_model, 'max', 'queued',
    p_prompt, p_source_version_id, p_width, p_height, 1, p_idempotency_key
  )
  RETURNING id INTO v_new_job_id;

  RETURN QUERY SELECT v_new_job_id, true, v_reservation.available_credits;
END;
$$;

REVOKE ALL ON FUNCTION public.create_generation_job(uuid, uuid, text, text, text, integer, integer, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_generation_job(uuid, uuid, text, text, text, integer, integer, uuid, text) TO authenticated;

DROP FUNCTION IF EXISTS public.create_generation_jobs(uuid, uuid, text, text, text[], text[], integer, integer, uuid, text);
CREATE FUNCTION public.create_generation_jobs(
  p_user_id           uuid,
  p_session_id        uuid,
  p_operation         text,
  p_model             text,
  p_prompts           text[],
  p_labels            text[],
  p_width             integer,
  p_height            integer,
  p_source_version_id uuid,
  p_idempotency_prefix text
)
RETURNS TABLE (
  job_ids            uuid[],
  reserved           boolean,
  available_credits  integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := COALESCE(array_length(p_prompts, 1), 0);
  v_existing_count integer;
  v_existing_job_ids uuid[];
  v_existing_mismatch boolean;
  v_extra_child_exists boolean;
  v_account public.credit_accounts;
  v_reservation RECORD;
  v_job_ids uuid[] := ARRAY[]::uuid[];
  v_job_id uuid;
  v_available integer;
  i integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'create_generation_jobs: authenticated user does not match p_user_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.generation_sessions gs
     WHERE gs.id = p_session_id
       AND gs.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'create_generation_jobs: session does not belong to user';
  END IF;

  IF p_source_version_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM public.image_versions iv
     WHERE iv.id = p_source_version_id
       AND iv.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'create_generation_jobs: source version does not belong to user';
  END IF;

  IF v_count < 1 THEN
    RAISE EXCEPTION 'create_generation_jobs: at least one prompt is required';
  END IF;

  -- Keep in sync with HARD_SERIES_CAP in src/lib/generation/plan.ts.
  IF v_count > 20 THEN
    RAISE EXCEPTION 'create_generation_jobs: series exceeds the maximum of 20 images';
  END IF;

  IF COALESCE(array_length(p_labels, 1), 0) <> v_count THEN
    RAISE EXCEPTION 'create_generation_jobs: prompts and labels must have equal lengths';
  END IF;

  SELECT
    count(*),
    array_agg(gj.id ORDER BY child.i),
    COALESCE(bool_or(
      gj.session_id IS DISTINCT FROM p_session_id
      OR gj.operation IS DISTINCT FROM p_operation
      OR gj.model IS DISTINCT FROM p_model
      OR gj.prompt IS DISTINCT FROM p_prompts[child.i]
      OR gj.source_version_id IS DISTINCT FROM p_source_version_id
      OR gj.width IS DISTINCT FROM p_width
      OR gj.height IS DISTINCT FROM p_height
      OR gj.series_label IS DISTINCT FROM p_labels[child.i]
    ), false)
    INTO v_existing_count, v_existing_job_ids, v_existing_mismatch
    FROM generate_series(1, v_count) AS child(i)
    JOIN public.generation_jobs gj
      ON gj.user_id = p_user_id
     AND gj.idempotency_key = p_idempotency_prefix || ':' || child.i;

  SELECT EXISTS (
    SELECT 1
      FROM public.generation_jobs gj
     WHERE gj.user_id = p_user_id
       AND gj.idempotency_key = p_idempotency_prefix || ':' || (v_count + 1)
  ) INTO v_extra_child_exists;

  IF v_existing_count = v_count
     AND NOT v_extra_child_exists
     AND NOT v_existing_mismatch THEN
    SELECT ca.available_credits
      INTO v_available
      FROM public.credit_accounts ca
     WHERE ca.user_id = p_user_id;
    RETURN QUERY SELECT v_existing_job_ids, true, COALESCE(v_available, 0);
    RETURN;
  ELSIF v_existing_count > 0 OR v_extra_child_exists THEN
    RAISE EXCEPTION 'create_generation_jobs: existing series does not match requested batch for prefix %',
      p_idempotency_prefix;
  END IF;

  v_account := public.lock_credit_account(p_user_id);

  -- Recheck after taking the account lock so concurrent calls with the same
  -- prefix cannot both reserve and insert the series.
  SELECT
    count(*),
    array_agg(gj.id ORDER BY child.i),
    COALESCE(bool_or(
      gj.session_id IS DISTINCT FROM p_session_id
      OR gj.operation IS DISTINCT FROM p_operation
      OR gj.model IS DISTINCT FROM p_model
      OR gj.prompt IS DISTINCT FROM p_prompts[child.i]
      OR gj.source_version_id IS DISTINCT FROM p_source_version_id
      OR gj.width IS DISTINCT FROM p_width
      OR gj.height IS DISTINCT FROM p_height
      OR gj.series_label IS DISTINCT FROM p_labels[child.i]
    ), false)
    INTO v_existing_count, v_existing_job_ids, v_existing_mismatch
    FROM generate_series(1, v_count) AS child(i)
    JOIN public.generation_jobs gj
      ON gj.user_id = p_user_id
     AND gj.idempotency_key = p_idempotency_prefix || ':' || child.i;

  SELECT EXISTS (
    SELECT 1
      FROM public.generation_jobs gj
     WHERE gj.user_id = p_user_id
       AND gj.idempotency_key = p_idempotency_prefix || ':' || (v_count + 1)
  ) INTO v_extra_child_exists;

  IF v_existing_count = v_count
     AND NOT v_extra_child_exists
     AND NOT v_existing_mismatch THEN
    RETURN QUERY
      SELECT v_existing_job_ids, true, v_account.available_credits;
    RETURN;
  ELSIF v_existing_count > 0 OR v_extra_child_exists THEN
    RAISE EXCEPTION 'create_generation_jobs: existing series does not match requested batch for prefix %',
      p_idempotency_prefix;
  END IF;

  IF v_account.available_credits < v_count THEN
    RETURN QUERY SELECT ARRAY[]::uuid[], false, v_account.available_credits, ARRAY[]::text[];
    RETURN;
  END IF;

  FOR i IN 1..v_count LOOP
    SELECT *
      INTO v_reservation
      FROM public.reserve_generation_credits(
        p_user_id,
        1,
        p_idempotency_prefix || ':' || i,
        p_operation || ':' || p_model
      );

    IF NOT v_reservation.reserved THEN
      RAISE EXCEPTION 'create_generation_jobs: child % reservation failed after balance check', i;
    END IF;

    INSERT INTO public.generation_jobs (
      user_id,
      session_id,
      operation,
      model,
      quality,
      status,
      prompt,
      source_version_id,
      width,
      height,
      credit_cost,
      idempotency_key,
      series_index,
      series_label
    ) VALUES (
      p_user_id,
      p_session_id,
      p_operation,
      p_model,
      'max',
      'queued',
      p_prompts[i],
      p_source_version_id,
      p_width,
      p_height,
      1,
      p_idempotency_prefix || ':' || i,
      i - 1,
      p_labels[i]
    )
    RETURNING id INTO v_job_id;

    v_job_ids := array_append(v_job_ids, v_job_id);
    v_available := v_reservation.available_credits;
  END LOOP;

  RETURN QUERY SELECT v_job_ids, true, v_available;
END;
$$;

REVOKE ALL ON FUNCTION public.create_generation_jobs(uuid, uuid, text, text, text[], text[], integer, integer, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_generation_jobs(uuid, uuid, text, text, text[], text[], integer, integer, uuid, text) TO authenticated;

-- 2. Service-role-only token reader. Ownership is re-checked so a server bug
--    passing the wrong user id cannot authorize another account's job.
CREATE OR REPLACE FUNCTION public.get_generation_execution_token(p_job_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gj.execution_token FROM public.generation_jobs gj
   WHERE gj.id = p_job_id AND gj.user_id = p_user_id
$$;
REVOKE ALL ON FUNCTION public.get_generation_execution_token(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_generation_execution_token(uuid, uuid) TO service_role;

-- 3. Retire the encrypted session copy of tokens.
DROP FUNCTION IF EXISTS public.merge_generation_execution_tokens(uuid, jsonb);
UPDATE public.generation_sessions SET plan_json = plan_json - 'executionTokensEnc'
 WHERE plan_json ? 'executionTokensEnc';

CREATE OR REPLACE FUNCTION public.prevent_generation_session_identity_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.plan_json IS DISTINCT FROM OLD.plan_json
     OR NEW.create_idempotency_key IS DISTINCT FROM OLD.create_idempotency_key
  THEN
    RAISE EXCEPTION 'generation_sessions: user_id, plan_json, and create_idempotency_key are immutable after creation';
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Keep the token column hidden from client roles (idempotent re-assertion).
REVOKE SELECT (execution_token) ON public.generation_jobs FROM anon, authenticated;
REVOKE UPDATE (execution_token) ON public.generation_jobs FROM anon, authenticated;

-- 5. Repair RPCs are signed-in only (they already reject a null auth.uid()).
REVOKE EXECUTE ON FUNCTION public.claim_generation_repair(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_generation_request_repair(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.finish_generation_request_repair(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_generation_request_repair(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finish_generation_request_repair(uuid, text) TO authenticated, service_role;
