-- 家庭管理密码迁移：在发布依赖新密码 RPC 的前端前执行。
-- 可重复执行；已有家庭会获得初始密码 123456 的独立带盐哈希。

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create table if not exists private.household_management_secrets (
  household_id uuid primary key references public.households(id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

revoke all on schema private from public, anon, authenticated;
revoke all on table private.household_management_secrets from public, anon, authenticated;

insert into private.household_management_secrets (household_id, password_hash)
select id, extensions.crypt('123456', extensions.gen_salt('bf', 8))
from public.households
on conflict (household_id) do nothing;

create or replace function private.initialize_household_management_secret()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into private.household_management_secrets (household_id, password_hash)
  values (new.id, extensions.crypt('123456', extensions.gen_salt('bf', 8)))
  on conflict (household_id) do nothing;
  return new;
end;
$$;

revoke execute on function private.initialize_household_management_secret() from public, anon, authenticated;

drop trigger if exists initialize_household_management_secret on public.households;
create trigger initialize_household_management_secret
after insert on public.households
for each row execute function private.initialize_household_management_secret();

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
  set password_hash = extensions.crypt(normalized_password, extensions.gen_salt('bf', 8)),
      updated_at = now()
  where household_id = target_household;

  return 'ok';
end;
$$;

revoke execute on function public.verify_household_management_password(uuid, text) from public, anon;
revoke execute on function public.change_household_management_password(uuid, text, text) from public, anon;
grant execute on function public.verify_household_management_password(uuid, text) to authenticated;
grant execute on function public.change_household_management_password(uuid, text, text) to authenticated;
