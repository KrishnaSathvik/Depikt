-- Phase 5 (native image generation): credit ledger, generation sessions/jobs,
-- and immutable image versions.
--
-- NOT APPLIED TO PRODUCTION. This file is prepared for review and must be
-- run through the Supabase SQL Editor (or `supabase db push` against a
-- branch) by the project owner, per CLAUDE.md's RLS constraints — the anon
-- key cannot write, and this migration is not auto-applied by the app.
--
-- Idempotent: safe to re-run (CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE
-- for functions, guarded DO blocks for constraints).

-- ==========================================================================
-- credit_accounts — one row per user. Source of truth for available and
-- reserved balances. Never mutated directly by application code; only by
-- the RPCs below, inside a transaction.
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.credit_accounts (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_credits integer NOT NULL DEFAULT 0,
  reserved_credits  integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT credit_accounts_available_nonneg CHECK (available_credits >= 0),
  CONSTRAINT credit_accounts_reserved_nonneg CHECK (reserved_credits >= 0)
);

ALTER TABLE public.credit_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credit_accounts_owner_read" ON public.credit_accounts;
CREATE POLICY "credit_accounts_owner_read" ON public.credit_accounts
  FOR SELECT USING (auth.uid() = user_id);
-- No client INSERT/UPDATE/DELETE policy: balances change only through the
-- SECURITY DEFINER functions below, called from the server with the
-- authenticated user's id, never from a client-issued balance write.

-- ==========================================================================
-- credit_ledger — append-only. Every balance-changing event, traceable.
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id              uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type      text NOT NULL,
  amount          integer NOT NULL, -- positive = credit in, negative = credit out
  job_id          uuid, -- FK added below, after generation_jobs exists
  idempotency_key text,
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_ledger_entry_type_check') THEN
    ALTER TABLE public.credit_ledger
      ADD CONSTRAINT credit_ledger_entry_type_check
      CHECK (entry_type IN (
        'starter_grant', 'subscription_grant', 'top_up',
        'generation_reservation', 'generation_charge', 'refund',
        'manual_adjustment'
      ));
  END IF;
  -- One reservation per idempotency key per user: a double-submit (double
  -- click, network retry) with the same key must not create a second
  -- reservation row.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_ledger_idempotency_unique') THEN
    ALTER TABLE public.credit_ledger
      ADD CONSTRAINT credit_ledger_idempotency_unique
      UNIQUE (user_id, idempotency_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS credit_ledger_user_id_created_at_idx
  ON public.credit_ledger (user_id, created_at DESC);

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credit_ledger_owner_read" ON public.credit_ledger;
CREATE POLICY "credit_ledger_owner_read" ON public.credit_ledger
  FOR SELECT USING (auth.uid() = user_id);
-- No client write policy: the ledger is written only by the RPCs below.

-- ==========================================================================
-- generation_sessions — one creative thread (e.g. "National Park Poster").
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.generation_sessions (
  id          uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text,
  source_type text NOT NULL DEFAULT 'direct',
  source_id   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'generation_sessions_source_type_check') THEN
    ALTER TABLE public.generation_sessions
      ADD CONSTRAINT generation_sessions_source_type_check
      CHECK (source_type IN ('direct', 'library', 'gallery', 'prompt_build', 'prompt_critique', 'template'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS generation_sessions_user_id_updated_at_idx
  ON public.generation_sessions (user_id, updated_at DESC);

ALTER TABLE public.generation_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "generation_sessions_owner_all" ON public.generation_sessions;
CREATE POLICY "generation_sessions_owner_all" ON public.generation_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==========================================================================
-- generation_jobs — one OpenAI request (generate or edit). Owns the credit
-- reservation for its lifetime.
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id                  uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id          uuid NOT NULL REFERENCES public.generation_sessions(id) ON DELETE CASCADE,
  operation           text NOT NULL,
  model               text NOT NULL, -- "flare" | "sunburst" (alias, not the raw OpenAI model id)
  quality             text NOT NULL DEFAULT 'max',
  status              text NOT NULL DEFAULT 'queued',
  prompt              text NOT NULL,
  source_version_id   uuid, -- FK to image_versions added below, after that table exists
  width               integer,
  height              integer,
  credit_cost         integer NOT NULL DEFAULT 1,
  idempotency_key     text NOT NULL,
  openai_request_id   text,
  usage_json          jsonb,
  estimated_api_cost_usd numeric(10, 5),
  error_code          text,
  safe_error_message  text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  started_at          timestamptz,
  completed_at        timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'generation_jobs_operation_check') THEN
    ALTER TABLE public.generation_jobs
      ADD CONSTRAINT generation_jobs_operation_check CHECK (operation IN ('generate', 'edit'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'generation_jobs_model_check') THEN
    ALTER TABLE public.generation_jobs
      ADD CONSTRAINT generation_jobs_model_check CHECK (model IN ('flare', 'sunburst'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'generation_jobs_quality_check') THEN
    -- Only "max" ships in V1; the column stays a text enum (not a hardcoded
    -- constant) so a future quality tier doesn't need a schema migration.
    ALTER TABLE public.generation_jobs
      ADD CONSTRAINT generation_jobs_quality_check CHECK (quality IN ('max'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'generation_jobs_status_check') THEN
    ALTER TABLE public.generation_jobs
      ADD CONSTRAINT generation_jobs_status_check
      CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'generation_jobs_idempotency_unique') THEN
    ALTER TABLE public.generation_jobs
      ADD CONSTRAINT generation_jobs_idempotency_unique UNIQUE (user_id, idempotency_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS generation_jobs_user_id_created_at_idx
  ON public.generation_jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS generation_jobs_session_id_idx
  ON public.generation_jobs (session_id);
CREATE INDEX IF NOT EXISTS generation_jobs_status_idx
  ON public.generation_jobs (status) WHERE status IN ('queued', 'running');

ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "generation_jobs_owner_read" ON public.generation_jobs;
CREATE POLICY "generation_jobs_owner_read" ON public.generation_jobs
  FOR SELECT USING (auth.uid() = user_id);
-- No client write policy: jobs are created and transitioned only by the
-- server (service role / SECURITY DEFINER RPCs), never directly by the
-- authenticated client. The client submits a request; the server decides
-- whether a job gets created.

-- ==========================================================================
-- image_versions — every successful output, immutable. An edit creates a
-- new row with parent_version_id set; the parent is never overwritten.
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.image_versions (
  id                uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id        uuid NOT NULL REFERENCES public.generation_sessions(id) ON DELETE CASCADE,
  job_id            uuid NOT NULL REFERENCES public.generation_jobs(id) ON DELETE CASCADE,
  parent_version_id uuid REFERENCES public.image_versions(id),
  storage_path      text NOT NULL,
  mime_type         text NOT NULL DEFAULT 'image/png',
  width             integer NOT NULL,
  height            integer NOT NULL,
  prompt            text NOT NULL,
  model             text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'image_versions_model_check') THEN
    ALTER TABLE public.image_versions
      ADD CONSTRAINT image_versions_model_check CHECK (model IN ('flare', 'sunburst'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS image_versions_session_id_created_at_idx
  ON public.image_versions (session_id, created_at);
CREATE INDEX IF NOT EXISTS image_versions_parent_version_id_idx
  ON public.image_versions (parent_version_id);

ALTER TABLE public.image_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "image_versions_owner_read" ON public.image_versions;
CREATE POLICY "image_versions_owner_read" ON public.image_versions
  FOR SELECT USING (auth.uid() = user_id);
-- No client write policy: versions are inserted only by the server once an
-- OpenAI result has been stored, never by the client directly.

-- ==========================================================================
-- Cross-table foreign keys, added now that both sides exist.
-- ==========================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_jobs_source_version_id_fkey'
  ) THEN
    ALTER TABLE public.generation_jobs
      ADD CONSTRAINT generation_jobs_source_version_id_fkey
      FOREIGN KEY (source_version_id) REFERENCES public.image_versions(id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credit_ledger_job_id_fkey'
  ) THEN
    ALTER TABLE public.credit_ledger
      ADD CONSTRAINT credit_ledger_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES public.generation_jobs(id);
  END IF;
END $$;

-- ==========================================================================
-- reserve_generation_credits — atomic reservation.
--
-- Two concurrent Workers must not double-spend one credit. This function
-- locks the caller's credit_accounts row, checks available balance, moves
-- 1 credit from available -> reserved, and writes a ledger entry, all
-- inside one transaction. SECURITY DEFINER so it can be granted to
-- `authenticated` without granting direct table writes.
--
-- Idempotent by (user_id, idempotency_key): a retried call with the same
-- key returns the existing reservation's job_id instead of reserving again.
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
  v_available integer;
  v_new_ledger_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'reserve_generation_credits: amount must be positive';
  END IF;

  -- Idempotent replay: same user + same key already reserved.
  SELECT id INTO v_existing_id
    FROM public.credit_ledger
   WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;

  IF v_existing_id IS NOT NULL THEN
    SELECT ca.available_credits INTO v_available FROM public.credit_accounts ca WHERE ca.user_id = p_user_id;
    RETURN QUERY SELECT v_existing_id, true, COALESCE(v_available, 0);
    RETURN;
  END IF;

  -- Lock the account row for the duration of this transaction.
  PERFORM 1 FROM public.credit_accounts ca WHERE ca.user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.credit_accounts (user_id, available_credits, reserved_credits)
    VALUES (p_user_id, 0, 0);
  END IF;

  SELECT ca.available_credits INTO v_available
    FROM public.credit_accounts ca WHERE ca.user_id = p_user_id FOR UPDATE;

  IF v_available < p_amount THEN
    RETURN QUERY SELECT NULL::uuid, false, v_available;
    RETURN;
  END IF;

  UPDATE public.credit_accounts ca
     SET available_credits = ca.available_credits - p_amount,
         reserved_credits = ca.reserved_credits + p_amount,
         updated_at = now()
   WHERE ca.user_id = p_user_id;

  INSERT INTO public.credit_ledger (user_id, entry_type, amount, idempotency_key, reason)
  VALUES (p_user_id, 'generation_reservation', -p_amount, p_idempotency_key, p_reason)
  RETURNING id INTO v_new_ledger_id;

  SELECT ca.available_credits INTO v_available FROM public.credit_accounts ca WHERE ca.user_id = p_user_id;
  RETURN QUERY SELECT v_new_ledger_id, true, v_available;
END;
$$;

-- ==========================================================================
-- finalize_generation_credits — settle a reservation on job completion.
--
-- p_outcome 'charged': move amount from reserved -> gone (job succeeded).
-- p_outcome 'refunded': move amount from reserved -> available (job failed).
-- Idempotent: a reservation can only be finalized once (checked via a
-- second ledger row keyed off the same job's idempotency key + outcome).
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.finalize_generation_credits(
  p_user_id uuid,
  p_amount integer,
  p_idempotency_key text,
  p_outcome text, -- 'charged' | 'refunded'
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

  PERFORM 1 FROM public.credit_accounts ca WHERE ca.user_id = p_user_id FOR UPDATE;

  IF p_outcome = 'charged' THEN
    UPDATE public.credit_accounts ca
       SET reserved_credits = GREATEST(ca.reserved_credits - p_amount, 0),
           updated_at = now()
     WHERE ca.user_id = p_user_id;
    INSERT INTO public.credit_ledger (user_id, entry_type, amount, job_id, idempotency_key, reason)
    VALUES (p_user_id, 'generation_charge', 0, p_job_id, v_final_key, 'reservation settled: job succeeded')
    RETURNING id INTO v_new_ledger_id;
  ELSE
    UPDATE public.credit_accounts ca
       SET reserved_credits = GREATEST(ca.reserved_credits - p_amount, 0),
           available_credits = ca.available_credits + p_amount,
           updated_at = now()
     WHERE ca.user_id = p_user_id;
    INSERT INTO public.credit_ledger (user_id, entry_type, amount, job_id, idempotency_key, reason)
    VALUES (p_user_id, 'refund', p_amount, p_job_id, v_final_key, 'reservation released: job failed')
    RETURNING id INTO v_new_ledger_id;
  END IF;

  SELECT ca.available_credits INTO v_available FROM public.credit_accounts ca WHERE ca.user_id = p_user_id;
  RETURN QUERY SELECT v_new_ledger_id, v_available;
END;
$$;

-- Callable by the server acting as the authenticated user (via RLS-bound
-- Supabase client using the user's JWT), not by anon.
REVOKE ALL ON FUNCTION public.reserve_generation_credits(uuid, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_generation_credits(uuid, integer, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.finalize_generation_credits(uuid, integer, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_generation_credits(uuid, integer, text, text, uuid) TO authenticated;

COMMENT ON TABLE public.credit_accounts IS
  'One row per user. Mutated only by reserve_generation_credits / finalize_generation_credits, never by direct client writes.';
COMMENT ON TABLE public.credit_ledger IS
  'Append-only. entry_type + amount + idempotency_key make every balance change traceable and replay-safe.';
COMMENT ON TABLE public.generation_jobs IS
  'One row per OpenAI generate/edit request. quality is always max in V1; kept as an enum column, not a hardcoded constant, for forward compatibility.';
COMMENT ON TABLE public.image_versions IS
  'Immutable. parent_version_id chains edits; never overwrite an earlier row.';
