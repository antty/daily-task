-- iPad 使用管理：在 Supabase SQL Editor 执行。
create table if not exists public.ipad_usage_types (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.household_members(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  counts_toward_limit boolean not null default true,
  color text not null default '#6750a4',
  created_at timestamptz not null default now()
);
create table if not exists public.ipad_daily_limits (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.household_members(id) on delete cascade,
  usage_date date not null,
  limit_minutes integer not null check (limit_minutes in (60, 120, 180)),
  created_at timestamptz not null default now(),
  unique (member_id, usage_date)
);
create table if not exists public.ipad_usage_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.household_members(id) on delete cascade,
  daily_limit_id uuid not null references public.ipad_daily_limits(id) on delete cascade,
  type_id uuid references public.ipad_usage_types(id) on delete set null,
  title text,
  note text not null default '',
  started_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.ipad_daily_limits drop constraint if exists ipad_daily_limits_limit_minutes_check;
alter table public.ipad_daily_limits add constraint ipad_daily_limits_limit_minutes_check check (limit_minutes >= 1);
alter table public.ipad_usage_entries alter column title drop not null;
alter table public.ipad_usage_entries drop constraint if exists ipad_usage_entries_title_check;
alter table public.ipad_usage_entries add column if not exists note text not null default '';
alter table public.ipad_usage_types enable row level security;
alter table public.ipad_daily_limits enable row level security;
alter table public.ipad_usage_entries enable row level security;
drop policy if exists "access ipad types" on public.ipad_usage_types;
drop policy if exists "access ipad limits" on public.ipad_daily_limits;
drop policy if exists "access ipad entries" on public.ipad_usage_entries;
create policy "access ipad types" on public.ipad_usage_types for all using (public.can_access_household(household_id)) with check (public.can_access_household(household_id));
create policy "access ipad limits" on public.ipad_daily_limits for all using (public.can_access_household(household_id)) with check (public.can_access_household(household_id));
create policy "access ipad entries" on public.ipad_usage_entries for all using (public.can_access_household(household_id)) with check (public.can_access_household(household_id));
