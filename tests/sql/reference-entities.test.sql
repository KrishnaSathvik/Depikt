\set ON_ERROR_STOP on
insert into auth.users(id) values('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002');
grant usage on schema public,auth,storage to authenticated;
grant select,insert,update,delete on public.reference_entities,public.reference_entity_assets,storage.objects to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
insert into reference_entities(id,user_id,name,type) values('20000000-0000-4000-8000-000000000001',auth.uid(),'Test Character','character');
insert into reference_entity_assets(id,entity_id,user_id,storage_path,role,mime_type) values('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',auth.uid(),'users/10000000-0000-4000-8000-000000000001/entities/20000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000001.webp','primary','image/webp');
do $$ begin
 begin
 insert into reference_entities(user_id,name,type) values(auth.uid(),'test character','character');
 raise exception 'duplicate name accepted';
 exception when unique_violation then null; end;
 begin
 insert into reference_entity_assets(entity_id,user_id,storage_path,role,mime_type) values('20000000-0000-4000-8000-000000000001',auth.uid(),'users/foreign/evil.webp','detail','image/webp');
 raise exception 'forged path accepted';
 exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
do $$ begin
 if (select count(*) from reference_entities)<>0 or (select count(*) from reference_entity_assets)<>0 then raise exception 'foreign rows exposed'; end if;
 begin
 insert into reference_entities(user_id,name,type) values('10000000-0000-4000-8000-000000000001','Evil','brand');
 raise exception 'foreign insert accepted';
 exception when insufficient_privilege then null; end;
 begin
 insert into reference_entity_assets(id,entity_id,user_id,storage_path,role,mime_type) values('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001',auth.uid(),'users/10000000-0000-4000-8000-000000000002/entities/20000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000002.webp','detail','image/webp');
 raise exception 'cross-owner attachment accepted';
 exception when foreign_key_violation then null; end;
end $$;
reset role;
insert into storage.objects(bucket_id,name) values('generation-assets','users/10000000-0000-4000-8000-000000000001/entities/e/a.webp'),('generation-assets','users/10000000-0000-4000-8000-000000000001/references/a.webp'),('generation-assets','users/10000000-0000-4000-8000-000000000002/entities/e/a.webp');
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
delete from storage.objects;
reset role;
do $$ begin
 if (select count(*) from storage.objects)<>2 then raise exception 'storage delete policy scope incorrect'; end if;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
insert into reference_entities(user_id,name,type) select auth.uid(),'Pack '||g,'brand' from generate_series(1,49) g;
do $$ begin
 begin
 insert into reference_entities(user_id,name,type) values(auth.uid(),'Overflow','brand');
 raise exception 'limit not enforced' using errcode='22000';
 exception when raise_exception then if sqlerrm<>'Reference pack limit reached' then raise; end if; end;
end $$;
reset role;
select 'reference entity RLS, ownership, path, uniqueness, limit and storage deletion checks passed' as result;
