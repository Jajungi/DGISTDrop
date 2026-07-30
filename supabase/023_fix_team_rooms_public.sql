-- ============================================================
-- 023: team_rooms_public 403 수정
-- 원인: 019에서 view를 security_invoker=true 로 두고
--       team_rooms SELECT 를 revoke 해 뷰 조회가 항상 Forbidden.
-- 해결: 비밀번호 컬럼만 차단하고 테이블 SELECT 복구 + has_password 는
--       security definer 헬퍼로 계산.
-- ============================================================

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

-- 호출자 RLS가 적용되도록 invoker 유지. password 컬럼은 뷰에서 직접 읽지 않음.
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

-- 뷰·RLS용 테이블 읽기 복구 (비밀번호 컬럼만 차단)
grant select on public.team_rooms to authenticated;
revoke select (password) on public.team_rooms from authenticated;
revoke select on public.team_rooms from anon;
revoke select (password) on public.team_rooms from anon;
