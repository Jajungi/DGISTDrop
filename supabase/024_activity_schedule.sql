-- ============================================================
-- 024: 동아리 활동 시간 설정 (club_metadata.activity_schedule)
-- ============================================================

alter table public.club_metadata
  add column if not exists activity_schedule jsonb;

update public.club_metadata
set activity_schedule = coalesce(
  activity_schedule,
  '[
    {"day":2,"startHour":18,"startMinute":30,"endHour":21,"endMinute":50},
    {"day":4,"startHour":18,"startMinute":30,"endHour":21,"endMinute":50}
  ]'::jsonb
)
where id = 1;

create or replace function public.rpc_set_activity_schedule(p_schedule jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;
  if not (public.is_admin() or public.is_operator()) then
    raise exception 'admin or operator only';
  end if;
  if p_schedule is null or jsonb_typeof(p_schedule) <> 'array' or jsonb_array_length(p_schedule) < 1 then
    raise exception 'invalid schedule';
  end if;

  insert into public.club_metadata (id, activity_schedule, updated_at)
  values (1, p_schedule, now())
  on conflict (id) do update
    set activity_schedule = excluded.activity_schedule,
        updated_at = now();

  return p_schedule;
end;
$$;

grant execute on function public.rpc_set_activity_schedule(jsonb) to authenticated;
revoke all on function public.rpc_set_activity_schedule(jsonb) from anon;
revoke all on function public.rpc_set_activity_schedule(jsonb) from public;
