-- 日常任务系统：在 Supabase SQL Editor 中整段执行。
-- 适用于全新项目；若当前项目已运行旧版 schema，请先新建项目或手动迁移旧表。

create extension if not exists pgcrypto;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '我的家庭',
  created_at timestamptz not null default now()
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
alter table public.household_members enable row level security;
alter table public.task_types enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;

create or replace function public.owns_household(target_household uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.households
    where id = target_household and owner_id = auth.uid()
  );
$$;

create policy "owners manage their household" on public.households
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners manage members" on public.household_members
  for all using (public.owns_household(household_id)) with check (public.owns_household(household_id));
create policy "owners manage task types" on public.task_types
  for all using (public.owns_household(household_id)) with check (public.owns_household(household_id));
create policy "owners manage tasks" on public.tasks
  for all using (public.owns_household(household_id)) with check (public.owns_household(household_id));
create policy "owners manage completions" on public.task_completions
  for all using (public.owns_household(household_id)) with check (public.owns_household(household_id));

insert into storage.buckets (id, name, public)
values ('task-media', 'task-media', true)
on conflict (id) do update set public = true;

create policy "owners upload task media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'task-media'
    and public.owns_household((storage.foldername(name))[1]::uuid)
  );
create policy "owners read task media" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'task-media'
    and public.owns_household((storage.foldername(name))[1]::uuid)
  );
create policy "owners update task media" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'task-media'
    and public.owns_household((storage.foldername(name))[1]::uuid)
  );
create policy "owners delete task media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'task-media'
    and public.owns_household((storage.foldername(name))[1]::uuid)
  );
