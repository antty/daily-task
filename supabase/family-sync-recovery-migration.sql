-- 修复新家庭邀请码同步和退出家庭依赖。
-- 可在 Supabase SQL Editor 中整段重复执行，不会删除家庭、成员或任务数据。

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
declare pgcrypto_schema text;
begin
  select n.nspname into pgcrypto_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pgcrypto';

  if pgcrypto_schema is distinct from 'extensions' then
    execute 'alter extension pgcrypto set schema extensions';
  end if;
end;
$$;

create schema if not exists private;

create table if not exists private.household_management_secrets (
  household_id uuid primary key references public.households(id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

revoke all on schema private from public, anon, authenticated;
revoke all on table private.household_management_secrets from public, anon, authenticated;

insert into private.household_management_secrets (household_id, password_hash)
select id, extensions.crypt('123456', extensions.gen_salt('bf'))
from public.households
on conflict (household_id) do nothing;

create or replace function private.initialize_household_management_secret()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into private.household_management_secrets (household_id, password_hash)
  values (new.id, extensions.crypt('123456', extensions.gen_salt('bf')))
  on conflict (household_id) do nothing;
  return new;
end;
$$;

revoke execute on function private.initialize_household_management_secret() from public, anon, authenticated;

drop trigger if exists initialize_household_management_secret on public.households;
create trigger initialize_household_management_secret
after insert on public.households
for each row execute function private.initialize_household_management_secret();

create or replace function public.create_household_with_invite(requested_invite_code text)
returns table(id uuid, invite_code text)
language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  normalized_code text := upper(btrim(coalesce(requested_invite_code, '')));
begin
  if current_user_id is null then
    raise exception '需要登录后创建家庭' using errcode = '42501';
  end if;

  if normalized_code !~ '^[A-HJ-NP-Z2-9]{8}$' then
    raise exception '邀请码格式无效' using errcode = '22023';
  end if;

  return query
  insert into public.households as created (id, owner_id, invite_code)
  values (gen_random_uuid(), current_user_id, normalized_code)
  returning created.id, created.invite_code;
end;
$$;

revoke execute on function public.create_household_with_invite(text) from public, anon;
grant execute on function public.create_household_with_invite(text) to authenticated;

create or replace function public.verify_household_management_password(
  target_household uuid,
  candidate_password text
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare stored_hash text;
begin
  if auth.uid() is null
     or target_household is null
     or nullif(candidate_password, '') is null
     or not public.can_access_household(target_household) then
    return false;
  end if;

  select password_hash into stored_hash
  from private.household_management_secrets
  where household_id = target_household;

  return stored_hash is not null
    and stored_hash = extensions.crypt(candidate_password, stored_hash);
end;
$$;

create or replace function public.change_household_management_password(
  target_household uuid,
  current_password text,
  new_password text
)
returns text language plpgsql security definer set search_path = '' as $$
declare
  stored_hash text;
  normalized_password text := btrim(coalesce(new_password, ''));
begin
  if auth.uid() is null
     or target_household is null
     or not public.can_access_household(target_household) then
    return 'not_authorized';
  end if;

  select password_hash into stored_hash
  from private.household_management_secrets
  where household_id = target_household
  for update;

  if stored_hash is null
     or stored_hash <> extensions.crypt(coalesce(current_password, ''), stored_hash) then
    return 'invalid_current';
  end if;

  if normalized_password !~ '^[0-9]{6,12}$'
     or normalized_password = '123456'
     or normalized_password = repeat(substr(normalized_password, 1, 1), length(normalized_password))
     or strpos('012345678901234567890', normalized_password) > 0
     or strpos('987654321098765432109', normalized_password) > 0 then
    return 'invalid_new';
  end if;

  update private.household_management_secrets
  set password_hash = extensions.crypt(normalized_password, extensions.gen_salt('bf')),
      updated_at = now()
  where household_id = target_household;

  return 'ok';
end;
$$;

revoke execute on function public.verify_household_management_password(uuid, text) from public, anon;
revoke execute on function public.change_household_management_password(uuid, text, text) from public, anon;
grant execute on function public.verify_household_management_password(uuid, text) to authenticated;
grant execute on function public.change_household_management_password(uuid, text, text) to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;

drop policy if exists "owners create households" on public.households;
create policy "owners create households" on public.households
for insert with check (owner_id = auth.uid());

drop policy if exists "owners manage members" on public.household_members;
create policy "owners manage members" on public.household_members
for all using (public.can_access_household(household_id))
with check (public.can_access_household(household_id));

create or replace function public.leave_household(target_household uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or target_household is null then
    return false;
  end if;

  if exists (
    select 1 from public.households
    where id = target_household and owner_id = auth.uid()
  ) then
    raise exception '家庭创建者不能撤销自己的云端所有权';
  end if;

  delete from public.household_access
  where household_id = target_household and user_id = auth.uid();

  return found;
end;
$$;

revoke execute on function public.leave_household(uuid) from public, anon;
grant execute on function public.leave_household(uuid) to authenticated;
