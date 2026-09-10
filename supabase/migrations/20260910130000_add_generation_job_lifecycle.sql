-- Phase 5 (native image generation), part 2: job lifecycle RPCs and the
-- write policies needed to run generation from a request-scoped background
-- continuation (see architecture note below) without a service role key.
--
-- NOT APPLIED TO PRODUCTION. Same review status as
-- 20260910120000_add_image_generation.sql.
--
-- ==========================================================================
-- Architecture note (async execution):
--
-- This session has no Cloudflare account access (wrangler is not logged in)
-- and wrangler.jsonc has no Queues/Workflows/Cron bindings configured. A
-- shared background worker that processes any user's job (a Cron Trigger or
-- Queue consumer sweeping across users) needs Supabase service-role
-- credentials to write rows it doesn't own via RLS — and CLAUDE.md is
-- explicit that no service role key lives in this project's env.
--
-- So V1 targets the mechanism that needs neither new Cloudflare product nor
-- a new secret: the route handler that creates the job keeps running after
-- the response via the request's own background-continuation primitive
-- (Cloudflare Workers' ctx.waitUntil), using the *same authenticated
-- Supabase client* (the requesting user's JWT) for every write in that
-- job's lifecycle. RLS then does the ownership enforcement for free — no
-- elevated role required — because every write is still "this user acting
-- on their own row."
--
-- Trade-off to flag to the owner before this ships: Workers bound
-- background execution by CPU/wall-clock limits that vary by plan, and the
-- benchmark measured Sunburst max edits up to ~139s. If the deployed plan's
-- limit is tighter than that, some Sunburst jobs will be killed mid-flight.
-- The fix if so is either raising the plan tier, or provisioning Cloudflare
-- Queues (owner's Cloudflare account access required) and adding a scoped
-- service-role secret for the consumer — a decision for the owner, not
-- something to silently choose here.
-- ==========================================================================

-- ==========================================================================
-- create_generation_job — atomically reserves 1 credit AND creates the job
-- row in one transaction. Two separate round trips (reserve, then insert)
-- would leave a window where a credit is reserved with no job, or a job
-- exists with no reservation, if the second call fails.
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.create_generation_job(
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
  v_existing_job_id uuid;
  v_reservation RECORD;
  v_new_job_id uuid;
BEGIN
  -- Idempotent replay: a job already exists for this key, return it as-is
  -- rather than reserving/creating again.
  SELECT gj.id INTO v_existing_job_id
    FROM public.generation_jobs gj
   WHERE gj.user_id = p_user_id AND gj.idempotency_key = p_idempotency_key;

  IF v_existing_job_id IS NOT NULL THEN
    RETURN QUERY
      SELECT v_existing_job_id, true,
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

REVOKE ALL ON FUNCTION public.create_generation_job(
  uuid, uuid, text, text, text, integer, integer, uuid, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_generation_job(
  uuid, uuid, text, text, text, integer, integer, uuid, text
) TO authenticated;

-- ==========================================================================
-- Status transitions and version creation happen as plain owner-scoped
-- writes from the request-scoped background continuation described above
-- (same user's authenticated client, not the browser). RLS enforces that a
-- user can only ever transition their own jobs and create versions under
-- their own sessions.
-- ==========================================================================
DROP POLICY IF EXISTS "generation_jobs_owner_update" ON public.generation_jobs;
CREATE POLICY "generation_jobs_owner_update" ON public.generation_jobs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- `auth.uid() = user_id` alone is not enough: it only proves the caller
-- owns the *new* row, not that session_id/job_id it references actually
-- belong to that same user. Verified experimentally against a real
-- non-superuser RLS role: without the EXISTS checks below, user B could
-- insert an image_versions row with user_id = B but session_id/job_id
-- pointing at user A's session and job, poisoning A's version lineage.
DROP POLICY IF EXISTS "image_versions_owner_insert" ON public.image_versions;
CREATE POLICY "image_versions_owner_insert" ON public.image_versions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.generation_sessions gs
       WHERE gs.id = image_versions.session_id AND gs.user_id = image_versions.user_id
    )
    AND EXISTS (
      SELECT 1 FROM public.generation_jobs gj
       WHERE gj.id = image_versions.job_id AND gj.user_id = image_versions.user_id
    )
  );

-- Defense in depth against the same class of bug on generation_jobs: RLS's
-- row-level WITH CHECK can't restrict which *columns* an UPDATE touches, so
-- a caller could otherwise repoint their own job's session_id at someone
-- else's session. Lock the identity-defining columns after creation; only
-- lifecycle fields (status, timestamps, usage, error info, request id) may
-- change.
CREATE OR REPLACE FUNCTION public.prevent_generation_job_identity_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.session_id IS DISTINCT FROM OLD.session_id
     OR NEW.operation IS DISTINCT FROM OLD.operation
     OR NEW.model IS DISTINCT FROM OLD.model
     OR NEW.prompt IS DISTINCT FROM OLD.prompt
     OR NEW.credit_cost IS DISTINCT FROM OLD.credit_cost
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
  THEN
    RAISE EXCEPTION 'generation_jobs: user_id, session_id, operation, model, prompt, credit_cost, and idempotency_key are immutable after creation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS generation_jobs_identity_lock ON public.generation_jobs;
CREATE TRIGGER generation_jobs_identity_lock
  BEFORE UPDATE ON public.generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_generation_job_identity_change();

COMMENT ON FUNCTION public.create_generation_job IS
  'Atomically reserves 1 credit and creates the generation_jobs row. Idempotent by (user_id, idempotency_key).';
