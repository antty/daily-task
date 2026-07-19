-- 允许通过邀请码加入家庭的设备主动退出。
-- 在 Supabase SQL Editor 中执行一次。

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
