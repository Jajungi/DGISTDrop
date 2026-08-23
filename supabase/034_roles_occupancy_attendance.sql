-- ============================================================
-- 034: 관리자 역할 분리 · 코트 현황 모드 · 참석 의사 · 게스트 일일 삭제
-- 운영자 학번 202662024 은 운영자/관리자 권한이 빠지지 않음
--
-- 적용: Supabase SQL Editor에서 033_club_roster.sql 다음 이 파일을 실행
-- 코트 예약은 기본 꺼짐(현황만). 운영진이 가입·참고에서 예약을 켤 수 있음
-- ============================================================

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

alter table public.profiles
  add column if not exists attendance_intent text;

alter table public.profiles
  add column if not exists attendance_intent_date date;

alter table public.club_metadata
  add column if not exists reservation_enabled boolean not null default false;

alter table public.club_metadata
  alter column reservation_enabled set default false;

alter table public.club_metadata
  add column if not exists points_features_enabled boolean not null default true;

-- SQL Editor는 auth.uid()가 없어 is_staff()가 false. 보호 트리거를 우회한다.
select set_config('app.allow_sensitive_profile_write', 'on', true);

update public.profiles
set is_admin = true
where membership_tier = 'admin' or is_operator = true;

update public.profiles
set is_operator = true, is_admin = true
where student_id = '202662024';

update public.club_metadata
set activity_schedule = '[
  {"day":1,"startHour":18,"startMinute":30,"endHour":21,"endMinute":40},
  {"day":3,"startHour":18,"startMinute":30,"endHour":21,"endMinute":40}
]'::jsonb,
    reservation_enabled = false,
    updated_at = now()
where id = 1;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and member_status = 'approved'
      and (
        coalesce(is_admin, false)
        or membership_tier = 'admin'
        or coalesce(is_operator, false)
      )
  );
$$;

create or replace function public.guard_owner_operator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.student_id = '202662024' then
    new.is_operator := true;
    new.is_admin := true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_owner_operator on public.profiles;
create trigger trg_guard_owner_operator
  before update on public.profiles
  for each row execute function public.guard_owner_operator();

-- is_admin 도 보호 컬럼. 클라이언트 직접 수정 불가
create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('app.allow_sensitive_profile_write', true), '') = 'on' then
    return new;
  end if;

  if (new.membership_tier is distinct from old.membership_tier)
     and (new.membership_tier = 'admin' or old.membership_tier = 'admin')
     and not public.is_admin() then
    raise exception 'only admins can grant or revoke admin membership';
  end if;

  if public.is_staff() then
    return new;
  end if;

  if new.points is distinct from old.points
     or new.elo is distinct from old.elo
     or new.rank is distinct from old.rank
     or new.wins is distinct from old.wins
     or new.losses is distinct from old.losses
     or new.total_games is distinct from old.total_games
     or new.cleaning_contributions is distinct from old.cleaning_contributions
     or new.membership_tier is distinct from old.membership_tier
     or new.member_status is distinct from old.member_status
     or new.lesson_status is distinct from old.lesson_status
     or new.is_coach is distinct from old.is_coach
     or new.is_operator is distinct from old.is_operator
     or new.is_admin is distinct from old.is_admin
     or new.peak_time_reservations is distinct from old.peak_time_reservations
     or new.is_at_gym is distinct from old.is_at_gym
     or new.club_fee_verified_at is distinct from old.club_fee_verified_at
     or new.club_fee_verified_by is distinct from old.club_fee_verified_by
     or new.suspended_at is distinct from old.suspended_at
     or new.suspended_reason is distinct from old.suspended_reason then
    raise exception 'protected profile columns require staff or server RPC';
  end if;
  return new;
end;
$$;

create or replace function public.rpc_set_reservation_enabled(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.is_staff() then raise exception 'staff only'; end if;
  insert into public.club_metadata (id, reservation_enabled, updated_at)
  values (1, coalesce(p_enabled, false), now())
  on conflict (id) do update
    set reservation_enabled = coalesce(p_enabled, false),
        updated_at = now();
  return coalesce(p_enabled, false);
end;
$$;

create or replace function public.rpc_set_points_features_enabled(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.is_staff() then raise exception 'staff only'; end if;
  insert into public.club_metadata (id, points_features_enabled, updated_at)
  values (1, coalesce(p_enabled, true), now())
  on conflict (id) do update
    set points_features_enabled = coalesce(p_enabled, true),
        updated_at = now();
  return coalesce(p_enabled, true);
end;
$$;

-- 코트 사용중/비움 (현황 모드). 이름 없이 점유만. 운영진이 여러 코트를 표시할 수 있음.
create or replace function public.rpc_set_court_occupancy(p_court_id int, p_occupied boolean)
returns public.courts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_court public.courts;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  if not public.is_staff() then raise exception 'staff only'; end if;

  select * into v_court from public.courts where id = p_court_id for update;
  if not found then raise exception 'court not found'; end if;

  if p_occupied then
    if v_court.status <> 'empty' then
      raise exception 'court already in use';
    end if;
    perform set_config('app.allow_court_write', 'on', true);
    update public.courts set
      status = 'playing',
      reserved_by = null,
      reserved_at = now(),
      started_at = now(),
      players = '[]'::jsonb,
      join_requests = '[]'::jsonb,
      wait_queue = '[]'::jsonb,
      games_completed = 0,
      max_games = 0,
      game_mode = null,
      nanta_half = null,
      updated_at = now()
    where id = p_court_id
    returning * into v_court;
  else
    perform set_config('app.allow_court_write', 'on', true);
    update public.courts set
      status = 'empty',
      reserved_by = null,
      reserved_at = null,
      started_at = null,
      finished_at = null,
      players = '[]'::jsonb,
      join_requests = '[]'::jsonb,
      wait_queue = '[]'::jsonb,
      games_completed = 0,
      max_games = 0,
      game_mode = null,
      nanta_half = null,
      updated_at = now()
    where id = p_court_id
    returning * into v_court;
  end if;

  return v_court;
end;
$$;

-- 날짜가 바뀐 게스트는 전원 삭제 (운영자 보호 없음)
create or replace function public.rpc_purge_stale_guests()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_ids uuid[];
  v_deleted int := 0;
  v_today date := (timezone('Asia/Seoul', now()))::date;
begin
  select array_agg(id) into v_ids
  from public.profiles
  where membership_tier = 'guest'
    and coalesce((timezone('Asia/Seoul', created_at))::date, v_today) < v_today;

  if v_ids is null then
    return jsonb_build_object('deleted', 0, 'ok', true);
  end if;

  perform public._admin_clear_user_refs(v_ids);
  delete from auth.users where id = any(v_ids);
  get diagnostics v_deleted = row_count;
  return jsonb_build_object('deleted', v_deleted, 'ok', true);
end;
$$;

grant execute on function public.rpc_set_reservation_enabled(boolean) to authenticated;
grant execute on function public.rpc_set_points_features_enabled(boolean) to authenticated;
grant execute on function public.rpc_set_court_occupancy(int, boolean) to authenticated;
grant execute on function public.rpc_purge_stale_guests() to authenticated;

revoke all on function public.rpc_set_reservation_enabled(boolean) from anon, public;
revoke all on function public.rpc_set_points_features_enabled(boolean) from anon, public;
revoke all on function public.rpc_set_court_occupancy(int, boolean) from anon, public;
revoke all on function public.rpc_purge_stale_guests() from anon, public;

do $$
begin
  alter publication supabase_realtime add table public.club_metadata;
exception when duplicate_object then null;
end $$;

-- 예약 RPC: 현황 모드면 거부, 포인트 기능 OFF면 차감 없음, 1인 1코트
create or replace function public.rpc_reserve_court(
  p_court_id int,
  p_game_count int,
  p_game_mode text,
  p_nanta_half text,
  p_players jsonb,
  p_lat double precision default null,
  p_lng double precision default null
)
returns public.courts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_is_staff boolean := public.is_staff();
  v_profile public.profiles;
  v_court public.courts;
  v_cost int;
  v_base int;
  v_discount numeric;
  v_peak boolean;
  v_hour int;
  v_dist double precision;
  v_reservation_on boolean := false;
  v_points_on boolean := true;
  v_gym_lat constant double precision := 35.6972;
  v_gym_lng constant double precision := 128.4611;
  v_radius constant double precision := 500;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;

  select coalesce(reservation_enabled, false), coalesce(points_features_enabled, true)
    into v_reservation_on, v_points_on
  from public.club_metadata where id = 1;
  if v_reservation_on is false then
    raise exception 'reservation disabled';
  end if;

  select * into v_profile from public.profiles where id = v_actor for update;
  if not found then raise exception 'profile not found'; end if;
  if v_profile.member_status <> 'approved' then raise exception 'not an approved member'; end if;

  if p_game_count is null or p_game_count < 2 or p_game_count > 6 then
    raise exception 'invalid game count';
  end if;

  if not v_is_staff then
    if p_lat is null or p_lng is null then raise exception 'location required'; end if;
    v_dist := 2 * 6371000 * asin(sqrt(
      power(sin(radians(p_lat - v_gym_lat) / 2), 2) +
      cos(radians(v_gym_lat)) * cos(radians(p_lat)) *
      power(sin(radians(p_lng - v_gym_lng) / 2), 2)
    ));
    if v_dist > v_radius then raise exception 'outside gym fence'; end if;
  end if;

  select * into v_court from public.courts where id = p_court_id for update;
  if not found then raise exception 'court not found'; end if;
  if v_court.status <> 'empty' then raise exception 'court not available'; end if;

  if exists (
    select 1 from public.courts c
    where c.status <> 'empty'
      and (
        c.reserved_by = v_actor
        or exists (
          select 1 from jsonb_array_elements(coalesce(c.players, '[]'::jsonb)) e
          where e->>'userId' = v_actor::text
        )
      )
  ) then
    raise exception 'already has an active court';
  end if;

  if exists (
    select 1 from jsonb_array_elements(coalesce(p_players, '[]'::jsonb)) e
    where (e->>'userId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and exists (
      select 1 from public.courts c
      where c.status <> 'empty'
        and (
          c.reserved_by::text = e->>'userId'
          or exists (
            select 1 from jsonb_array_elements(coalesce(c.players, '[]'::jsonb)) p
            where p->>'userId' = e->>'userId'
          )
        )
    )
  ) then
    raise exception 'already has an active court';
  end if;

  if v_court.is_coach_court and not v_is_staff then
    if v_profile.lesson_status <> 'approved' then
      raise exception 'coach court requires approved lesson access';
    end if;
    if not exists (
      select 1 from public.lesson_queue q
      where q.user_id = v_actor and q.status in ('next', 'active')
    ) then
      raise exception 'not your lesson turn';
    end if;
  end if;

  v_hour := extract(hour from (now() at time zone 'Asia/Seoul'));
  v_peak := v_hour in (19, 20);
  if v_peak and v_profile.peak_time_reservations >= 2 and not v_is_staff then
    raise exception 'peak reservation limit reached';
  end if;

  v_base := case when v_court.is_center then 30 else 20 end;
  v_discount := case v_profile.rank
    when 'gold' then 0.10
    when 'platinum' then 0.17
    when 'diamond' then 0.24
    when 'master' then 0.30
    else 0 end;
  v_cost := greatest(1, round(v_base * (1 - v_discount)));
  if v_profile.membership_tier = 'guest' or v_points_on is false then
    v_cost := 0;
  end if;

  if v_cost > 0 and v_profile.points < v_cost and not v_is_staff then
    raise exception 'insufficient points';
  end if;

  if v_cost > 0 then
    perform public._award_points(
      v_actor, -v_cost, 'court', v_court.name || ' 예약', 'court-' || p_court_id
    );
  end if;

  if v_peak then
    perform set_config('app.allow_sensitive_profile_write', 'on', true);
    update public.profiles
    set peak_time_reservations = peak_time_reservations + 1
    where id = v_actor;
  end if;

  perform set_config('app.allow_court_write', 'on', true);
  update public.courts set
    status = 'reserved',
    reserved_by = v_actor,
    reserved_at = now(),
    max_games = p_game_count,
    games_completed = 0,
    players = coalesce(p_players, '[]'::jsonb),
    join_requests = '[]'::jsonb,
    wait_queue = '[]'::jsonb,
    game_mode = nullif(p_game_mode, '')::public.game_mode,
    nanta_half = case
      when p_game_mode = 'nanta' then nullif(p_nanta_half, '')::public.nanta_half
      else null end,
    updated_at = now()
  where id = p_court_id
  returning * into v_court;

  return v_court;
end;
$$;
