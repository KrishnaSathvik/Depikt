CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
\i tables.sql
ALTER TABLE public.credit_accounts ADD PRIMARY KEY (user_id);
CREATE UNIQUE INDEX ON public.credit_ledger(user_id, idempotency_key);
ALTER TABLE public.generation_jobs ADD PRIMARY KEY (id);
CREATE UNIQUE INDEX ON public.generation_jobs(user_id, idempotency_key);
CREATE TABLE public.profiles(user_id uuid);
CREATE FUNCTION public.ensure_profile(uuid, text) RETURNS void LANGUAGE sql AS $$ select $$;
\i funcs.sql
CREATE TRIGGER generation_repair_budget_monotonic BEFORE UPDATE ON public.generation_jobs FOR EACH ROW EXECUTE FUNCTION public.prevent_generation_repair_reset();
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, UPDATE ON public.generation_jobs TO authenticated;
GRANT SELECT ON public.credit_accounts, public.credit_ledger TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
-- Reproduce the LIVE grants (anon=X, authenticated=X on every function).
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
