-- Owner applies this migration in the Supabase SQL Editor before VNext 1E ships.

ALTER TABLE public.generation_jobs
  ADD COLUMN IF NOT EXISTS series_index integer,
  ADD COLUMN IF NOT EXISTS series_label text;

ALTER TABLE public.generation_sessions
  ADD COLUMN IF NOT EXISTS plan_json jsonb;

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
  v_account public.credit_accounts;
  v_reservation RECORD;
  v_job_ids uuid[] := ARRAY[]::uuid[];
  v_job_id uuid;
  v_available integer;
  i integer;
BEGIN
  IF v_count < 1 THEN
    RAISE EXCEPTION 'create_generation_jobs: at least one prompt is required';
  END IF;

  IF COALESCE(array_length(p_labels, 1), 0) <> v_count THEN
    RAISE EXCEPTION 'create_generation_jobs: prompts and labels must have equal lengths';
  END IF;

  SELECT count(*), array_agg(gj.id ORDER BY child.i)
    INTO v_existing_count, v_existing_job_ids
    FROM generate_series(1, v_count) AS child(i)
    JOIN public.generation_jobs gj
      ON gj.user_id = p_user_id
     AND gj.idempotency_key = p_idempotency_prefix || ':' || child.i;

  IF v_existing_count = v_count THEN
    SELECT ca.available_credits
      INTO v_available
      FROM public.credit_accounts ca
     WHERE ca.user_id = p_user_id;
    RETURN QUERY SELECT v_existing_job_ids, true, COALESCE(v_available, 0);
    RETURN;
  ELSIF v_existing_count > 0 THEN
    RAISE EXCEPTION 'create_generation_jobs: partial series exists for prefix %',
      p_idempotency_prefix;
  END IF;

  v_account := public.lock_credit_account(p_user_id);

  -- Recheck after taking the account lock so concurrent calls with the same
  -- prefix cannot both reserve and insert the series.
  SELECT count(*), array_agg(gj.id ORDER BY child.i)
    INTO v_existing_count, v_existing_job_ids
    FROM generate_series(1, v_count) AS child(i)
    JOIN public.generation_jobs gj
      ON gj.user_id = p_user_id
     AND gj.idempotency_key = p_idempotency_prefix || ':' || child.i;

  IF v_existing_count = v_count THEN
    RETURN QUERY
      SELECT v_existing_job_ids, true, v_account.available_credits;
    RETURN;
  ELSIF v_existing_count > 0 THEN
    RAISE EXCEPTION 'create_generation_jobs: partial series exists for prefix %',
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
