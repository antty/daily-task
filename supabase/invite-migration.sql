-- 已运行旧版 schema 的项目：在 Supabase SQL Editor 执行此迁移。
alter table public.households add column if not exists invite_code text;
update public.households set invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) where invite_code is null;
alter table public.households alter column invite_code set not null;
create unique index if not exists households_invite_code_key on public.households (invite_code);

create table if not exists public.household_access (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
alter table public.household_access enable row level security;

drop policy if exists "owners manage their household" on public.households;
drop policy if exists "owners create households" on public.households;
drop policy if exists "members read linked households" on public.households;
drop policy if exists "owners update households" on public.households;
drop policy if exists "owners delete households" on public.households;
drop policy if exists "users read their household access" on public.household_access;
drop policy if exists "owners manage members" on public.household_members;
drop policy if exists "owners manage task types" on public.task_types;
drop policy if exists "owners manage tasks" on public.tasks;
drop policy if exists "owners manage completions" on public.task_completions;

create or replace function public.can_access_household(target_household uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.households where id = target_household and owner_id = auth.uid())
  or exists (select 1 from public.household_access where household_id = target_household and user_id = auth.uid());
$$;

create policy "owners create households" on public.households for insert with check (owner_id = auth.uid());
create policy "members read linked households" on public.households for select using (public.can_access_household(id));
create policy "owners update households" on public.households for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners delete households" on public.households for delete using (owner_id = auth.uid());
create policy "users read their household access" on public.household_access for select using (user_id = auth.uid());
create policy "owners manage members" on public.household_members for all using (public.can_access_household(household_id)) with check (public.can_access_household(household_id));
create policy "owners manage task types" on public.task_types for all using (public.can_access_household(household_id)) with check (public.can_access_household(household_id));
create policy "owners manage tasks" on public.tasks for all using (public.can_access_household(household_id)) with check (public.can_access_household(household_id));
create policy "owners manage completions" on public.task_completions for all using (public.can_access_household(household_id)) with check (public.can_access_household(household_id));

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

drop policy if exists "owners upload task media" on storage.objects;
drop policy if exists "owners read task media" on storage.objects;
drop policy if exists "owners update task media" on storage.objects;
drop policy if exists "owners delete task media" on storage.objects;
create policy "owners upload task media" on storage.objects for insert to authenticated with check (bucket_id = 'task-media' and public.can_access_household((storage.foldername(name))[1]::uuid));
create policy "owners read task media" on storage.objects for select to authenticated using (bucket_id = 'task-media' and public.can_access_household((storage.foldername(name))[1]::uuid));
create policy "owners update task media" on storage.objects for update to authenticated using (bucket_id = 'task-media' and public.can_access_household((storage.foldername(name))[1]::uuid));
create policy "owners delete task media" on storage.objects for delete to authenticated using (bucket_id = 'task-media' and public.can_access_household((storage.foldername(name))[1]::uuid));
