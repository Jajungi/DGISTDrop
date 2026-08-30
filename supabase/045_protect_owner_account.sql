-- ============================================================
-- 045: 마스터 운영자 학번(202662024) 계정 삭제 방지
-- 실행: Supabase SQL Editor에 붙여넣고 Run
-- ============================================================

create or replace function public.rpc_delete_account(p_target_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_target uuid := coalesce(p_target_id, v_actor);
  v_tier public.membership_tier;
  v_student_id text;
  v_admin_count int;
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;

  if v_target <> v_actor and not public.is_admin() then
    raise exception 'forbidden';
  end if;

  select membership_tier, student_id into v_tier, v_student_id
  from public.profiles
  where id = v_target;

  if not found then
    raise exception 'user not found';
  end if;

  if v_student_id = '202662024' then
    raise exception 'cannot delete owner account';
  end if;

  if v_tier = 'admin' then
    select count(*)::int into v_admin_count
    from public.profiles
    where membership_tier = 'admin' and member_status = 'approved';
    if v_admin_count <= 1 then
      raise exception 'cannot delete last admin';
    end if;
  end if;

  perform public._admin_clear_user_refs(ARRAY[v_target]);
  delete from auth.users where id = v_target;
end;
$$;

grant execute on function public.rpc_delete_account(uuid) to authenticated;
