-- Step 3: job-execution lockdown — per-job execution tokens.
-- Apply AFTER step2_job_security.sql. Not yet applied to production.
--
-- Problem (carried into Step 3 from the Step 2 report): transition_generation_job
-- runs as the job's owner (the server executes with the user-JWT client), so
-- nothing distinguished "the server executor failing a job after a provider
-- error" from "the user calling the RPC directly through PostgREST to force
-- their own running job into a failed state" — wasting the in-flight
-- provider call and gaming the refund path.
--
-- Fix: every job gets a database-minted random execution_token. The column
-- is revoked from anon/authenticated SELECT, so the token only ever appears
-- in the create_generation_job(s) return value — visible to the server
-- route, never to the browser. The server persists it encrypted inside the
-- session's plan_json (executionTokensEnc; see src/lib/generation/
-- execution-token.ts) and presents it on every execution transition.
--
--   - running / succeeded / failed  → require the job's execution token
--   - cancelled                     → token-free (legitimate user cancellation)
--   - claim_generation_job          → token-gated queued → running claim that
--                                     also distinguishes "already running"
--                                     (the old direct-UPDATE claim is gone
--                                     with Step 2's REVOKE UPDATE)
--
-- Also closes two Step 2 follow-ups discovered while wiring this:
--   - session repair wrote usage_json / cleared refinementPending with direct
--     UPDATEs that Step 2's REVOKE would break → clear_generation_repair_pending
--     and write_generation_repair_result RPCs, gated on the repair claim.
--   - the image_versions non-terminal-job gate blocked legitimate repair
--     output (a new version on a *succeeded* job) → the policy now also
--     allows inserts while a repair claim for that job is running.

-- ==========================================================================
-- 1. The token column. Hidden from user reads; minted by default at insert.
-- ==========================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.generation_jobs
  ADD COLUMN IF NOT EXISTS execution_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex');

-- Postgres column-level REVOKE cannot carve an exception out of a
-- table-level GRANT, so hide the token by replacing the table-level SELECT
-- with an explicit per-column grant (every column except execution_token).
-- Row-level security is unchanged: the owner-read policy still applies.
REVOKE SELECT ON public.generation_jobs FROM anon, authenticated;
GRANT SELECT (
  id, user_id, session_id, operation, model, quality, status, prompt,
  source_version_id, width, height, credit_cost, idempotency_key,
  openai_request_id, usage_json, estimated_api_cost_usd, error_code,
  safe_error_message, series_index, series_label, validation_result,
  repair_attempts, created_at, started_at, completed_at
) ON public.generation_jobs TO authenticated;

-- ==========================================================================
-- 2. plan_json stays immutable EXCEPT for the executionTokensEnc key, which
--    the server writes once right after job creation (jobs are created after
--    their session, so the tokens cannot be known at session insert time).
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.prevent_generation_session_identity_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR (NEW.plan_json - 'executionTokensEnc') IS DISTINCT FROM (OLD.plan_json - 'executionTokensEnc')
     OR NEW.create_idempotency_key IS DISTINCT FROM OLD.create_idempotency_key
  THEN
    RAISE EXCEPTION 'generation_sessions: user_id, plan_json, and create_idempotency_key are immutable after creation';
  END IF;
  RETURN NEW;
END;
$$;

-- ==========================================================================
-- 3. Job creation returns the minted token(s) to the caller. The return type
--    changes, so the old functions must be dropped first. Ownership, session
--    and source-version checks are unchanged from
--    20260914220000_generation_job_auth_and_series_cap.sql.
-- ==========================================================================
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
  available_credits  integer,
  execution_token    text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_reservation RECORD;
  v_new_job_id uuid;
  v_new_token text;
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
  -- rather than reserving/creating again. The token is returned here too so
  -- a server that lost its in-memory copy (retry, second tab) can re-persist
  -- it; only the owner can reach this branch.
  SELECT gj.id, gj.execution_token INTO v_existing
    FROM public.generation_jobs gj
   WHERE gj.user_id = p_user_id AND gj.idempotency_key = p_idempotency_key;

  IF v_existing.id IS NOT NULL THEN
    RETURN QUERY
      SELECT v_existing.id, true,
             (SELECT ca.available_credits FROM public.credit_accounts ca WHERE ca.user_id = p_user_id),
             v_existing.execution_token;
    RETURN;
  END IF;

  SELECT * INTO v_reservation
    FROM public.reserve_generation_credits(p_user_id, 1, p_idempotency_key, p_operation || ':' || p_model);

  IF NOT v_reservation.reserved THEN
    RETURN QUERY SELECT NULL::uuid, false, v_reservation.available_credits, NULL::text;
    RETURN;
  END IF;

  INSERT INTO public.generation_jobs (
    user_id, session_id, operation, model, quality, status,
    prompt, source_version_id, width, height, credit_cost, idempotency_key
  ) VALUES (
    p_user_id, p_session_id, p_operation, p_model, 'max', 'queued',
    p_prompt, p_source_version_id, p_width, p_height, 1, p_idempotency_key
  )
  RETURNING id, generation_jobs.execution_token INTO v_new_job_id, v_new_token;

  RETURN QUERY SELECT v_new_job_id, true, v_reservation.available_credits, v_new_token;
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
  available_credits  integer,
  execution_tokens   text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := COALESCE(array_length(p_prompts, 1), 0);
  v_existing_count integer;
  v_existing_job_ids uuid[];
  v_existing_tokens text[];
  v_existing_mismatch boolean;
  v_extra_child_exists boolean;
  v_account public.credit_accounts;
  v_reservation RECORD;
  v_job_ids uuid[] := ARRAY[]::uuid[];
  v_tokens text[] := ARRAY[]::text[];
  v_job_id uuid;
  v_token text;
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
    array_agg(gj.execution_token ORDER BY child.i),
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
    INTO v_existing_count, v_existing_job_ids, v_existing_tokens, v_existing_mismatch
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
    RETURN QUERY SELECT v_existing_job_ids, true, COALESCE(v_available, 0), v_existing_tokens;
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
    array_agg(gj.execution_token ORDER BY child.i),
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
    INTO v_existing_count, v_existing_job_ids, v_existing_tokens, v_existing_mismatch
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
      SELECT v_existing_job_ids, true, v_account.available_credits, v_existing_tokens;
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
    RETURNING id, generation_jobs.execution_token INTO v_job_id, v_token;

    v_job_ids := array_append(v_job_ids, v_job_id);
    v_tokens := array_append(v_tokens, v_token);
    v_available := v_reservation.available_credits;
  END LOOP;

  RETURN QUERY SELECT v_job_ids, true, v_available, v_tokens;
END;
$$;

REVOKE ALL ON FUNCTION public.create_generation_jobs(uuid, uuid, text, text, text[], text[], integer, integer, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_generation_jobs(uuid, uuid, text, text, text[], text[], integer, integer, uuid, text) TO authenticated;

-- ==========================================================================
-- 4. transition_generation_job: execution transitions require the token.
--    The 3-arg Step 2 version is dropped (a defaulted 4th parameter would
--    leave an ambiguous overload). Cancellation stays token-free.
-- ==========================================================================
DROP FUNCTION IF EXISTS public.transition_generation_job(uuid, text, jsonb);
CREATE FUNCTION public.transition_generation_job(p_job_id uuid, p_to_status text, p_patch jsonb DEFAULT '{}'::jsonb, p_execution_token text DEFAULT NULL)
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

  -- Terminal/execution status decisions belong to the trusted server-side
  -- executor, which proves itself with the per-job token minted at job
  -- creation. Cancellation is the user's own legitimate action and stays
  -- token-free.
  IF p_to_status IN ('running', 'succeeded', 'failed')
     AND (p_execution_token IS NULL OR p_execution_token <> v_job.execution_token) THEN
    RAISE EXCEPTION 'transition_generation_job: valid execution token required for status %', p_to_status
      USING ERRCODE = '42501';
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

REVOKE ALL ON FUNCTION public.transition_generation_job(uuid, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_generation_job(uuid, text, jsonb, text) TO authenticated, service_role;

-- ==========================================================================
-- 5. claim_generation_job: the /run route's atomic queued -> running claim.
--    Returns 'claimed' | 'already_running' | 'terminal' | 'not_found' so the
--    route can tell a successful claim from a duplicate start — the
--    distinction the old direct-UPDATE claim had and transition's re-entry
--    safety deliberately does not provide.
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.claim_generation_job(p_job_id uuid, p_execution_token text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_job public.generation_jobs;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'claim_generation_job: authentication required';
  END IF;

  SELECT * INTO v_job FROM public.generation_jobs WHERE id = p_job_id;
  IF NOT FOUND OR v_job.user_id IS DISTINCT FROM auth.uid() THEN
    RETURN 'not_found';
  END IF;

  IF p_execution_token IS NULL OR p_execution_token <> v_job.execution_token THEN
    RAISE EXCEPTION 'claim_generation_job: valid execution token required'
      USING ERRCODE = '42501';
  END IF;

  IF v_job.status IN ('succeeded', 'failed', 'cancelled') THEN
    RETURN 'terminal';
  END IF;
  IF v_job.status = 'running' THEN
    RETURN 'already_running';
  END IF;

  UPDATE public.generation_jobs
     SET status = 'running', started_at = COALESCE(started_at, now())
   WHERE id = p_job_id AND status = 'queued';

  RETURN CASE WHEN FOUND THEN 'claimed' ELSE 'already_running' END;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_generation_job(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_generation_job(uuid, text) TO authenticated, service_role;

-- ==========================================================================
-- 6. save_generation_job_validation: validation snapshots are execution
--    evidence written mid-run, so they require the token too.
-- ==========================================================================
DROP FUNCTION IF EXISTS public.save_generation_job_validation(uuid, jsonb, jsonb);
CREATE FUNCTION public.save_generation_job_validation(p_job_id uuid, p_validation_result jsonb, p_usage_validation jsonb, p_execution_token text DEFAULT NULL)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_job public.generation_jobs;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'save_generation_job_validation: authentication required';
  END IF;

  SELECT * INTO v_job FROM public.generation_jobs WHERE id = p_job_id;
  IF NOT FOUND OR v_job.user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  IF p_execution_token IS NULL OR p_execution_token <> v_job.execution_token THEN
    RAISE EXCEPTION 'save_generation_job_validation: valid execution token required'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.generation_jobs
     SET validation_result = p_validation_result,
         usage_json = COALESCE(usage_json, '{}'::jsonb)
                      || jsonb_build_object('validation', p_usage_validation)
   WHERE id = p_job_id
     AND status = 'running';

  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.save_generation_job_validation(uuid, jsonb, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_generation_job_validation(uuid, jsonb, jsonb, text) TO authenticated, service_role;

-- ==========================================================================
-- 7. Repair writes, gated on the repair claim (generation_request_repairs).
--    These replace the direct UPDATEs session-repair used before Step 2's
--    REVOKE UPDATE on generation_jobs.
-- ==========================================================================

-- Clears usage_json->validation->refinementPending on every job of a
-- session. Requires a repair row for the session, so it cannot be used to
-- touch arbitrary jobs' usage_json.
CREATE OR REPLACE FUNCTION public.clear_generation_repair_pending(p_session_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'clear_generation_repair_pending: authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.generation_request_repairs rr
     WHERE rr.session_id = p_session_id AND rr.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'clear_generation_repair_pending: no repair claim for this session'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.generation_jobs
     SET usage_json = jsonb_set(
           COALESCE(usage_json, '{}'::jsonb),
           '{validation,refinementPending}',
           'false'::jsonb,
           true
         )
   WHERE session_id = p_session_id
     AND user_id = auth.uid()
     AND COALESCE((usage_json->'validation'->>'refinementPending')::boolean, false);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$function$;

REVOKE ALL ON FUNCTION public.clear_generation_repair_pending(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_generation_repair_pending(uuid) TO authenticated, service_role;

-- Writes the completed repair's telemetry (cost + usage) onto the repaired
-- job. Requires an active (state='running') repair claim for exactly this
-- job, so a user can never rewrite cost/usage fields at will.
CREATE OR REPLACE FUNCTION public.write_generation_repair_result(p_job_id uuid, p_estimated_api_cost_usd numeric, p_usage_json jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'write_generation_repair_result: authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.generation_request_repairs rr
     WHERE rr.job_id = p_job_id AND rr.user_id = auth.uid() AND rr.state = 'running'
  ) THEN
    RAISE EXCEPTION 'write_generation_repair_result: no active repair claim for this job'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.generation_jobs
     SET estimated_api_cost_usd = p_estimated_api_cost_usd,
         usage_json = p_usage_json
   WHERE id = p_job_id
     AND user_id = auth.uid()
     AND status = 'succeeded';

  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.write_generation_repair_result(uuid, numeric, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.write_generation_repair_result(uuid, numeric, jsonb) TO authenticated, service_role;

-- ==========================================================================
-- 8. image_versions: repair output attaches to a *succeeded* job, which the
--    Step 2 non-terminal gate blocked. Allow inserts while a repair claim
--    for that job is actively running; the fake-failure exploit stays closed
--    (a user-forced failed/cancelled job still cannot receive images).
-- ==========================================================================
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
        AND (
          gj.status IN ('queued', 'running')
          OR EXISTS (
            SELECT 1 FROM generation_request_repairs rr
             WHERE rr.job_id = image_versions.job_id
               AND rr.user_id = image_versions.user_id
               AND rr.state = 'running'
          )
        )
    ))
  );
