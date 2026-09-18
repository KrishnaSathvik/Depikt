-- Private reusable reference packs. Safe to reapply.
create table if not exists public.reference_entities (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(btrim(name)) between 1 and 60),
 type text not null check(type in ('character','product','brand')),
 description text not null default '' check(length(description)<=600),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,user_id)
);
create unique index if not exists reference_entities_owner_name on public.reference_entities(user_id,lower(name),type);
create table if not exists public.reference_entity_assets (
 id uuid primary key default gen_random_uuid(), entity_id uuid not null, user_id uuid not null,
 storage_path text not null unique, role text not null check(role in ('primary','front','three_quarter','profile','full_body','back','side','detail','logo','product_shot','style_reference')),
 sort_order integer not null default 0, width integer, height integer, mime_type text not null,
 created_at timestamptz not null default now(),
 foreign key(entity_id,user_id) references public.reference_entities(id,user_id) on delete cascade,
 check(storage_path ~ ('^users/' || user_id::text || '/entities/' || entity_id::text || '/' || id::text || '\.(png|jpg|webp)$'))
);
create unique index if not exists reference_entity_primary on public.reference_entity_assets(entity_id) where role in ('primary','logo');
alter table public.reference_entities enable row level security;
alter table public.reference_entity_assets enable row level security;
drop policy if exists reference_entities_owner on public.reference_entities;
create policy reference_entities_owner on public.reference_entities for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists reference_entity_assets_owner on public.reference_entity_assets;
create policy reference_entity_assets_owner on public.reference_entity_assets for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists generation_entity_assets_delete on storage.objects;
create policy generation_entity_assets_delete on storage.objects for delete to authenticated using (
 bucket_id='generation-assets' and (storage.foldername(name))[1]='users' and (storage.foldername(name))[2]=auth.uid()::text and (storage.foldername(name))[3]='entities'
);
-- Serialize limits with transaction advisory locks, including direct authenticated DB writes.
create or replace function public.enforce_reference_pack_limits() returns trigger language plpgsql set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
 if tg_table_name='reference_entities' then
  if (select count(*) from reference_entities where user_id=new.user_id)>=50 then raise exception 'Reference pack limit reached'; end if;
 else
  if (select count(*) from reference_entity_assets where entity_id=new.entity_id)>=8 then raise exception 'Reference asset limit reached'; end if;
 end if;
 return new;
end $$;
drop trigger if exists reference_pack_limit on public.reference_entities;
create trigger reference_pack_limit before insert on public.reference_entities for each row execute function public.enforce_reference_pack_limits();
drop trigger if exists reference_asset_limit on public.reference_entity_assets;
create trigger reference_asset_limit before insert on public.reference_entity_assets for each row execute function public.enforce_reference_pack_limits();
