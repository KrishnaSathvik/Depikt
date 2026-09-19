-- Launch economics: one included repair across an entire request/series.
create table public.generation_request_repairs (
 session_id uuid primary key references public.generation_sessions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 job_id uuid references public.generation_jobs(id),
 state text not null check(state in ('running','complete')),
 outcome text,
 started_at timestamptz not null default now(),
 completed_at timestamptz
);
alter table public.generation_request_repairs enable row level security;
create policy generation_request_repairs_owner_read on public.generation_request_repairs
 for select to authenticated using(user_id=auth.uid());
revoke all on public.generation_request_repairs from public,anon,authenticated;
grant select on public.generation_request_repairs to authenticated;

-- Preserve already-consumed allowances when upgrading from the per-image implementation.
insert into public.generation_request_repairs(session_id,user_id,job_id,state,outcome,completed_at)
select distinct on (j.session_id) j.session_id,j.user_id,j.id,'complete','interrupted',now()
from public.generation_jobs j join public.generation_sessions s on s.id=j.session_id
where j.repair_attempts>0 order by j.session_id,j.id;

-- Retire the old per-image claim; deployed callers cannot multiply a series allowance.
create or replace function public.claim_generation_repair(p_job_id uuid)
returns boolean language sql security definer set search_path=public as $$select false$$;

create function public.claim_generation_request_repair(p_session_id uuid,p_job_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare owned uuid; inserted uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select id into owned from generation_sessions where id=p_session_id and user_id=auth.uid() for update;
 if owned is null then return false; end if;
 if not exists(select 1 from generation_jobs where session_id=owned) or
    exists(select 1 from generation_jobs where session_id=owned and status not in ('succeeded','failed','cancelled')) then return false; end if;
 if p_job_id is not null and not exists(select 1 from generation_jobs where id=p_job_id and session_id=owned and user_id=auth.uid() and status='succeeded' and repair_attempts=0) then return false; end if;
 insert into generation_request_repairs(session_id,user_id,job_id,state,outcome,completed_at)
 values(owned,auth.uid(),p_job_id,case when p_job_id is null then 'complete' else 'running' end,case when p_job_id is null then 'not_needed' end,case when p_job_id is null then now() end)
 on conflict(session_id) do nothing returning session_id into inserted;
 if inserted is null then return false; end if;
 if p_job_id is not null then update generation_jobs set repair_attempts=1 where id=p_job_id; end if;
 return true;
end;
$$;
create function public.finish_generation_request_repair(p_session_id uuid,p_outcome text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_outcome not in ('improved','not_improved','provider_failed','interrupted') then raise exception 'Invalid outcome'; end if;
 update generation_request_repairs set state='complete',outcome=p_outcome,completed_at=now()
 where session_id=p_session_id and user_id=auth.uid() and state='running';
end;
$$;
revoke all on function public.claim_generation_request_repair(uuid,uuid) from public,anon;
revoke all on function public.finish_generation_request_repair(uuid,text) from public,anon;
grant execute on function public.claim_generation_request_repair(uuid,uuid) to authenticated;
grant execute on function public.finish_generation_request_repair(uuid,text) to authenticated;
