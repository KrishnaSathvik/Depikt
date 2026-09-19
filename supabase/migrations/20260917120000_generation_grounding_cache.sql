-- Per-owner persistent research; snapshots are HMAC authenticated in the application.
-- RLS prevents cross-owner access; direct owner writes cannot forge a trusted snapshot.
create table if not exists public.generation_grounding_cache (
  user_id uuid not null references auth.users(id) on delete cascade,
  query_hash text not null check (query_hash ~ '^[a-f0-9]{64}$'),
  snapshot text not null check (octet_length(snapshot) <= 32768),
  created_at timestamptz not null default now(),
  primary key (user_id, query_hash)
);
alter table public.generation_grounding_cache enable row level security;
create policy generation_grounding_cache_owner on public.generation_grounding_cache
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select,insert,update,delete on public.generation_grounding_cache to authenticated;
revoke all on public.generation_grounding_cache from anon;
