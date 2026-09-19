alter table public.generation_jobs
  add column if not exists validation_result jsonb,
  add column if not exists repair_attempts integer not null default 0 check(repair_attempts between 0 and 1);

-- Atomic persisted budget, bound to the authenticated owner and running job.
-- Repeated /run requests are already guarded by the queued->running claim.
create or replace function public.claim_generation_repair(p_job_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare claimed uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update generation_jobs set repair_attempts=1
  where id=p_job_id and user_id=auth.uid() and status='running' and repair_attempts=0
  returning id into claimed;
  return claimed is not null;
end;
$$;
revoke all on function public.claim_generation_repair(uuid) from public,anon;
grant execute on function public.claim_generation_repair(uuid) to authenticated;

-- Even an owner with direct job UPDATE access cannot reset the spent budget.
create or replace function public.prevent_generation_repair_reset()
returns trigger language plpgsql set search_path=public as $$
begin
  -- Owner-scoped direct updates must not turn a spent job back into a fresh API claim.
  if (old.status <> 'queued' and new.status = 'queued') or
     (old.status in ('succeeded','failed') and new.status <> old.status) then
    raise exception 'A started generation job cannot be restarted';
  end if;
  if new.repair_attempts < old.repair_attempts then
    raise exception 'Repair attempt budget cannot be reset';
  end if;
  return new;
end;
$$;
drop trigger if exists generation_repair_budget_monotonic on public.generation_jobs;
create trigger generation_repair_budget_monotonic before update on public.generation_jobs
for each row execute function public.prevent_generation_repair_reset();
