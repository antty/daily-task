-- 日常任务系统：在 Supabase SQL Editor 中整段执行。
-- 适用于全新项目；若当前项目已运行旧版 schema，请先新建项目或手动迁移旧表。

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

create table public.households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '我的家庭',
  invite_code text not null unique check (invite_code ~ '^[A-Z2-9]{8}$'),
  created_at timestamptz not null default now()
);

create schema if not exists private;

create table private.household_management_secrets (
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

create trigger initialize_household_management_secret
after insert on public.households
for each row execute function private.initialize_household_management_secret();

create table public.household_access (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) > 0),
  color text not null default '#6750a4',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.task_types (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  color text not null default '#3f7cac',
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid references public.household_members(id) on delete set null,
  type_id uuid references public.task_types(id) on delete set null,
  title text not null check (char_length(trim(title)) > 0),
  description text not null default '',
  start_date date not null,
  end_date date,
  recurrence text not null default 'none' check (recurrence in ('none', 'daily', 'weekly')),
  weekdays jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.task_completions (
  household_id uuid not null references public.households(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  occurrence_date date not null,
  note text not null default '',
  image_url text,
  completed_at timestamptz not null default now(),
  primary key (task_id, occurrence_date)
);

alter table public.households enable row level security;
alter table public.household_access enable row level security;
alter table public.household_members enable row level security;
alter table public.task_types enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;

create or replace function public.can_access_household(target_household uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.households
    where id = target_household and owner_id = auth.uid()
  ) or exists (
    select 1 from public.household_access
    where household_id = target_household and user_id = auth.uid()
  );
$$;

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

create policy "owners create households" on public.households for insert with check (owner_id = auth.uid());
create policy "members read linked households" on public.households for select using (public.can_access_household(id));
create policy "owners update households" on public.households for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners delete households" on public.households for delete using (owner_id = auth.uid());
create policy "users read their household access" on public.household_access for select using (user_id = auth.uid());
create policy "owners manage members" on public.household_members
  for all using (public.can_access_household(household_id)) with check (public.can_access_household(household_id));
create policy "owners manage task types" on public.task_types
  for all using (public.can_access_household(household_id)) with check (public.can_access_household(household_id));
create policy "owners manage tasks" on public.tasks
  for all using (public.can_access_household(household_id)) with check (public.can_access_household(household_id));
create policy "owners manage completions" on public.task_completions
  for all using (public.can_access_household(household_id)) with check (public.can_access_household(household_id));

create or replace function public.join_household_by_invite(invite_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare target_household uuid;
begin
  if auth.uid() is null then raise exception '请先建立登录会话'; end if;
  select id into target_household from public.households where households.invite_code = upper(trim(join_household_by_invite.invite_code));
  if target_household is null then raise exception '邀请码无效'; end if;
  insert into public.household_access (household_id, user_id) values (target_household, auth.uid()) on conflict do nothing;
  return target_household;
end;
$$;
grant execute on function public.join_household_by_invite(text) to authenticated;

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
    raise exception '家庭创建者不能退出';
  end if;

  delete from public.household_access
  where household_id = target_household and user_id = auth.uid();

  return found;
end;
$$;

revoke execute on function public.leave_household(uuid) from public, anon;
grant execute on function public.leave_household(uuid) to authenticated;

insert into storage.buckets (id, name, public)
values ('task-media', 'task-media', true)
on conflict (id) do update set public = true;

create policy "owners upload task media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'task-media'
    and public.can_access_household((storage.foldername(name))[1]::uuid)
  );
create policy "owners read task media" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'task-media'
    and public.can_access_household((storage.foldername(name))[1]::uuid)
  );
create policy "owners update task media" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'task-media'
    and public.can_access_household((storage.foldername(name))[1]::uuid)
  );
create policy "owners delete task media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'task-media'
    and public.can_access_household((storage.foldername(name))[1]::uuid)
  );
