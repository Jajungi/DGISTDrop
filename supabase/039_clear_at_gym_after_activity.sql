-- ============================================================
-- 039: 활동 종료 후 체육관(is_at_gym) 일괄 해제
-- 실행: Supabase SQL Editor에 붙여넣고 Run
-- ============================================================

create or replace function public.rpc_clear_at_gym_after_activity()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  perform set_config('app.allow_sensitive_profile_write', 'on', true);

  update public.profiles
  set is_at_gym = false, updated_at = now()
  where is_at_gym = true;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

grant execute on function public.rpc_clear_at_gym_after_activity() to authenticated;
