-- ============================================================
-- 042: 휴관·일정 변경 시 해당 날짜 참석 의사 일괄 삭제
-- ============================================================

create or replace function public.rpc_clear_attendance_intents_for_date(p_date date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_staff() then
    raise exception 'staff only';
  end if;

  update public.profiles
  set
    attendance_intent = null,
    attendance_intent_date = null,
    schedule_date = case when schedule_date = p_date then null else schedule_date end,
    scheduled_start = case when schedule_date = p_date then null else scheduled_start end,
    scheduled_end = case when schedule_date = p_date then null else scheduled_end end,
    updated_at = now()
  where attendance_intent_date = p_date
     or schedule_date = p_date;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.rpc_clear_attendance_intents_for_date(date) to authenticated;
revoke all on function public.rpc_clear_attendance_intents_for_date(date) from anon;
revoke all on function public.rpc_clear_attendance_intents_for_date(date) from public;
