-- Owner applies this migration in the Supabase SQL Editor before VNext 1E ships.

ALTER TABLE public.generation_jobs
  ADD COLUMN IF NOT EXISTS series_index integer,
  ADD COLUMN IF NOT EXISTS series_label text;

ALTER TABLE public.generation_sessions
  ADD COLUMN IF NOT EXISTS plan_json jsonb,
  ADD COLUMN IF NOT EXISTS create_idempotency_key text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'generation_sessions_user_create_idempotency_key_key'
       AND conrelid = 'public.generation_sessions'::regclass
  ) THEN
    ALTER TABLE public.generation_sessions
      ADD CONSTRAINT generation_sessions_user_create_idempotency_key_key
      UNIQUE (user_id, create_idempotency_key);
  END IF;
END $$;

-- The owner policy permits UPDATE, but the signed plan's verified reference
-- assets are persisted in plan_json and later trusted by /run. Keep that
-- execution identity, its owner, and its submit key immutable after insert.
CREATE OR REPLACE FUNCTION public.prevent_generation_session_identity_change()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS generation_sessions_identity_lock ON public.generation_sessions;
CREATE TRIGGER generation_sessions_identity_lock
  BEFORE UPDATE ON public.generation_sessions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_generation_session_identity_change();

-- Atomically reserves one credit per child and creates the complete series.
-- A replay returns the existing jobs; a partial replay is rejected.
CREATE OR REPLACE FUNCTION public.create_generation_jobs(
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
    RETURN QUERY SELECT ARRAY[]::uuid[], false, v_account.available_credits;
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

REVOKE ALL ON FUNCTION public.create_generation_jobs(
  uuid, uuid, text, text, text[], text[], integer, integer, uuid, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_generation_jobs(
  uuid, uuid, text, text, text[], text[], integer, integer, uuid, text
) TO authenticated;

COMMENT ON FUNCTION public.create_generation_jobs(
  uuid, uuid, text, text, text[], text[], integer, integer, uuid, text
) IS 'Atomically reserves one credit per child and creates an all-or-nothing generation series.';
