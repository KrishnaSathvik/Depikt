\set ON_ERROR_STOP on
create role authenticated;
create role anon;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.generation_jobs(id uuid primary key,user_id uuid not null references auth.users(id),status text not null);
alter table public.generation_jobs enable row level security;
create policy owner_jobs on public.generation_jobs for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant usage on schema public,auth to authenticated,anon;
grant select,update on generation_jobs to authenticated;
\ir ../../supabase/migrations/20260917120000_generation_grounding_cache.sql
\ir ../../supabase/migrations/20260917130000_generation_validation_repair.sql
grant select,insert,update,delete on generation_grounding_cache to authenticated;
insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
insert into generation_jobs values ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','running',null,0),('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','running',null,0),('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','succeeded',null,0);
set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
insert into generation_grounding_cache(user_id,query_hash,snapshot) values(auth.uid(),repeat('a',64),'signed-fixture');
do $$begin
 if not claim_generation_repair('33333333-3333-4333-8333-333333333333') then raise exception 'First claim failed'; end if;
 if claim_generation_repair('33333333-3333-4333-8333-333333333333') then raise exception 'Second claim allowed'; end if;
 if claim_generation_repair('44444444-4444-4444-8444-444444444444') then raise exception 'Cross-owner claim allowed'; end if;
 if claim_generation_repair('55555555-5555-4555-8555-555555555555') then raise exception 'Terminal job claimed'; end if;
 begin
  update generation_jobs set status='queued' where id='33333333-3333-4333-8333-333333333333';
  raise exception 'Running job restarted';
 exception when raise_exception then if sqlerrm='Running job restarted' then raise; end if; end;
 begin
  update generation_jobs set status='running' where id='55555555-5555-4555-8555-555555555555';
  raise exception 'Terminal job restarted';
 exception when raise_exception then if sqlerrm='Terminal job restarted' then raise; end if; end;
 begin
  update generation_jobs set repair_attempts=0 where id='33333333-3333-4333-8333-333333333333';
  raise exception 'Budget reset allowed';
 exception when raise_exception then if sqlerrm='Budget reset allowed' then raise; end if; end;
 begin
  update generation_jobs set repair_attempts=2 where id='33333333-3333-4333-8333-333333333333';
  raise exception 'Budget exceeded';
 exception when check_violation then null; end;
end$$;
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
do $$begin
 if (select count(*) from generation_grounding_cache)<>0 then raise exception 'Cache leaked across owners'; end if;
 begin
  insert into generation_grounding_cache(user_id,query_hash,snapshot) values('11111111-1111-4111-8111-111111111111',repeat('b',64),'injected');
  raise exception 'Cross-owner write allowed';
 exception when insufficient_privilege then null; end;
end$$;
reset role;
do $$begin
 if has_function_privilege('anon','public.claim_generation_repair(uuid)','execute') then raise exception 'Anonymous repair granted'; end if;
end$$;
select 'VNext 4/5 migration and RLS checks passed' as result;

-- Upgrade economics with one previously spent session and two new series.
create table generation_sessions(id uuid primary key,user_id uuid not null references auth.users(id));
insert into generation_sessions values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111');
alter table generation_jobs add column session_id uuid references generation_sessions(id);
update generation_jobs set session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' where id='33333333-3333-4333-8333-333333333333';
insert into generation_jobs(id,user_id,status,session_id) values
 ('66666666-6666-4666-8666-666666666666','11111111-1111-4111-8111-111111111111','succeeded','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
 ('77777777-7777-4777-8777-777777777777','11111111-1111-4111-8111-111111111111','running','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
 ('88888888-8888-4888-8888-888888888888','11111111-1111-4111-8111-111111111111','succeeded','cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
 ('99999999-9999-4999-8999-999999999999','11111111-1111-4111-8111-111111111111','succeeded','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
\ir ../../supabase/migrations/20260918120000_request_repair_economics.sql
set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
do $$begin
 if (select count(*) from generation_request_repairs where session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>1 then raise exception 'Previously spent budget lost'; end if;
 if claim_generation_repair('77777777-7777-4777-8777-777777777777') then raise exception 'Legacy per-job spending remains active'; end if;
 if claim_generation_request_repair('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','66666666-6666-4666-8666-666666666666') then raise exception 'Claim before all children terminal'; end if;
 update generation_jobs set status='succeeded' where id='77777777-7777-4777-8777-777777777777';
 if not claim_generation_request_repair('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','66666666-6666-4666-8666-666666666666') then raise exception 'First session claim failed'; end if;
 if claim_generation_request_repair('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','77777777-7777-4777-8777-777777777777') then raise exception 'Second child spent another allowance'; end if;
 perform finish_generation_request_repair('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','provider_failed');
 if claim_generation_request_repair('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','77777777-7777-4777-8777-777777777777') then raise exception 'Failed repair reset allowance'; end if;
 begin
  delete from generation_request_repairs where session_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  raise exception 'Owner can delete repair ledger';
 exception when insufficient_privilege then null; end;
end$$;
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
do $$begin
 if (select count(*) from generation_request_repairs)<>0 then raise exception 'Ledger leaked across owners'; end if;
 if claim_generation_request_repair('cccccccc-cccc-4ccc-8ccc-cccccccccccc','88888888-8888-4888-8888-888888888888') then raise exception 'Cross-owner session claim allowed'; end if;
end$$;
reset role;
do $$begin
 if has_function_privilege('anon','public.claim_generation_request_repair(uuid,uuid)','execute') then raise exception 'Anonymous session claim granted'; end if;
end$$;
select 'Launch economics migration and RLS checks passed' as result;
