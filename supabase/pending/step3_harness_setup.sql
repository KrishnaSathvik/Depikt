-- Step 3 harness-only setup (isolated Postgres; never applied to production).
-- Mirrors production objects the harness schema predates.

create table if not exists public.generation_request_repairs(
  session_id uuid, user_id uuid, job_id uuid, state text not null,
  outcome text, started_at timestamptz not null default now(), completed_at timestamptz
);

-- Mirror production grants (20260918120000 / Supabase default privileges):
grant select on public.generation_request_repairs to authenticated;
grant update on public.generation_sessions to authenticated;

-- Mirror the session identity lock from 20260914120000 (the Step 3
-- migration replaces this function; the trigger must exist to fire it).
create or replace function public.prevent_generation_session_identity_change() returns trigger language plpgsql as $$
begin
  if new.user_id is distinct from old.user_id
     or new.plan_json is distinct from old.plan_json
     or new.create_idempotency_key is distinct from old.create_idempotency_key
  then raise exception 'generation_sessions: immutable'; end if;
  return new;
end $$;
drop trigger if exists generation_sessions_identity_lock on public.generation_sessions;
create trigger generation_sessions_identity_lock before update on public.generation_sessions
  for each row execute function public.prevent_generation_session_identity_change();
