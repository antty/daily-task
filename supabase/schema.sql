-- 在 Supabase SQL Editor 中执行。前端接入认证后，所有家庭成员只可读写自己的家庭数据。
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  color text not null default '#6750a4',
  primary key (household_id, user_id)
);

create table public.task_types (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  color text not null default '#3f7cac',
  unique (household_id, name)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text not null default '',
  type_id uuid references public.task_types(id) on delete set null,
  start_date date not null,
  recurrence text not null default 'none' check (recurrence in ('none', 'daily', 'weekly')),
  created_at timestamptz not null default now()
);

create table public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (task_id, user_id)
);

create table public.task_completions (
  task_id uuid not null references public.tasks(id) on delete cascade,
  occurrence_date date not null,
  completed_by uuid not null references auth.users(id),
  completed_at timestamptz not null default now(),
  primary key (task_id, occurrence_date)
);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.task_types enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_completions enable row level security;

create function public.is_household_member(target_household uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_members where household_id = target_household and user_id = auth.uid());
$$;

create policy "members access household" on public.households for all using (public.is_household_member(id));
create policy "members access memberships" on public.household_members for all using (public.is_household_member(household_id));
create policy "members access types" on public.task_types for all using (public.is_household_member(household_id));
create policy "members access tasks" on public.tasks for all using (public.is_household_member(household_id));
create policy "members access assignees" on public.task_assignees for all using (exists (select 1 from public.tasks where tasks.id = task_id and public.is_household_member(tasks.household_id)));
create policy "members access completions" on public.task_completions for all using (exists (select 1 from public.tasks where tasks.id = task_id and public.is_household_member(tasks.household_id)));
