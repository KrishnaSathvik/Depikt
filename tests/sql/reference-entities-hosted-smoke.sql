-- Run against hosted Supabase using a database-owner connection.
-- Existing users are read only. Every canary row is rolled back.
begin;
do $$
declare a uuid; b uuid; e uuid:=gen_random_uuid(); asset uuid:=gen_random_uuid(); n integer;
begin
 select id into a from auth.users order by created_at,id limit 1;
 select id into b from auth.users order by created_at,id offset 1 limit 1;
 if a is null or b is null then raise exception 'Two existing test identities required'; end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 execute 'set local role authenticated';
 insert into public.reference_entities(id,user_id,name,type) values(e,a,'VNext hosted RLS '||e::text,'product');
 select count(*) into n from public.reference_entities where id=e;
 if n<>1 then raise exception 'Owner cannot read own entity'; end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 select count(*) into n from public.reference_entities where id=e;
 if n<>0 then raise exception 'Cross-user entity read exposed'; end if;
 update public.reference_entities set description='forbidden' where id=e;
 get diagnostics n = row_count;
 if n<>0 then raise exception 'Cross-user entity update accepted'; end if;
 begin
  insert into public.reference_entity_assets(id,entity_id,user_id,storage_path,role,mime_type)
  values(asset,e,b,'users/'||b::text||'/entities/'||e::text||'/'||asset::text||'.webp','primary','image/webp');
  raise exception 'Cross-owner foreign key accepted';
 exception when foreign_key_violation then null; end;
 execute 'reset role';
end $$;
select 'PASS: hosted owner read/create, foreign read/update isolation, invalid owner relationship' as result;
rollback;
