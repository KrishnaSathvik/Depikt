-- Disposable local test bootstrap only. Never run on the shared database.
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid primary key, email text, raw_user_meta_data jsonb);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
\i /dev-server/supabase/migrations/20260910120000_add_image_generation.sql
\i /dev-server/supabase/migrations/20260910130000_add_generation_job_lifecycle.sql
\i /dev-server/supabase/migrations/20260911100000_add_credit_buckets_and_starter_grant.sql
\i /dev-server/supabase/migrations/20260914120000_generation_series.sql
\i /dev-server/supabase/migrations/20260914220000_generation_job_auth_and_series_cap.sql
\i /dev-server/supabase/migrations/20260917130000_generation_validation_repair.sql
\i /dev-server/supabase/migrations/20260918120000_request_repair_economics.sql
DROP TRIGGER on_auth_user_created_depikt ON auth.users;
INSERT INTO auth.users(id) values ('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222');
GRANT SELECT,UPDATE ON generation_jobs TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON generation_sessions,image_versions TO authenticated;
GRANT SELECT ON credit_accounts,credit_ledger TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon,authenticated,service_role;
-- These unrelated lifecycle helpers are stubbed; their bodies are not tested here.
CREATE FUNCTION public.handle_new_depikt_profile() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$;
CREATE FUNCTION public.grant_due_subscription_credits() RETURNS void LANGUAGE sql AS $$ SELECT $$;