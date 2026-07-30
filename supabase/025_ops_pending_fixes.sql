-- ============================================================
-- 025: 운영 대기 SQL 한 번에 적용 (023 + 024)
-- Supabase SQL Editor에 붙여넣고 Run
-- ============================================================

-- ---------- team_rooms_public 403 수정 ----------
create or replace function public.team_room_has_password(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select password is not null and length(password) > 0 from public.team_rooms where id = p_room_id),
    false
  );
$$;

revoke all on function public.team_room_has_password(uuid) from public;
grant execute on function public.team_room_has_password(uuid) to authenticated;

create or replace view public.team_rooms_public
with (security_invoker = true) as
select
  id,
  host_id,
  host_name,
  title,
  min_rank,
  max_rank,
  members,
  min_members,
  max_members,
  status,
  created_at,
  public.team_room_has_password(id) as has_password
from public.team_rooms;

grant select on public.team_rooms_public to authenticated;
grant select on public.team_rooms to authenticated;
revoke select (password) on public.team_rooms from authenticated;
revoke select on public.team_rooms from anon;
revoke select (password) on public.team_rooms from anon;

-- ---------- 활동 시간 컬럼 ----------
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
