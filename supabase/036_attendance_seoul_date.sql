-- ============================================================
-- 036: 출석 날짜를 한국(서울) 날짜로 맞춤
-- 실행: SQL Editor에 붙여넣고 Run
-- 전제: rpc_check_in, rpc_admin_check_in 이미 있음
-- ============================================================

create or replace function public.seoul_today()
returns date
language sql
stable
as $$
  select (timezone('Asia/Seoul', now()))::date;
$$;

create or replace function public.rpc_admin_check_in(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_tier public.membership_tier;
  v_status public.member_status;
  v_pts int;
  v_today date := public.seoul_today();
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  if not public.is_staff() then raise exception 'staff only'; end if;

  select membership_tier, member_status into v_tier, v_status
  from public.profiles where id = p_user_id;
  if not found then raise exception 'user not found'; end if;
  if v_status <> 'approved' then raise exception 'not an approved member'; end if;

  if exists (
    select 1 from public.attendance_records
    where user_id = p_user_id and date = v_today
  ) then
    raise exception 'already checked in today';
  end if;

  insert into public.attendance_records (user_id, date) values (p_user_id, v_today);

  v_pts := case when v_tier in ('full', 'admin') then 150 else 100 end;
  perform public._award_points(p_user_id, v_pts, 'attendance', '운영진 대리 출석', null);

  perform set_config('app.allow_sensitive_profile_write', 'on', true);
  update public.profiles set is_at_gym = true, updated_at = now() where id = p_user_id;

  return v_pts;
end;
$$;

create or replace function public.rpc_check_in(p_lat double precision, p_lng double precision)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_tier public.membership_tier;
  v_status public.member_status;
  v_pts int;
  v_dist double precision;
  v_today date := public.seoul_today();
  v_gym_lat constant double precision := 35.6972;
  v_gym_lng constant double precision := 128.4611;
  v_radius constant double precision := 500;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;

  select membership_tier, member_status into v_tier, v_status
  from public.profiles where id = v_actor;
  if v_status <> 'approved' then raise exception 'not an approved member'; end if;

  if not public.is_staff() then
    if p_lat is null or p_lng is null then raise exception 'location required'; end if;
    v_dist := 2 * 6371000 * asin(sqrt(
      power(sin(radians(p_lat - v_gym_lat) / 2), 2) +
      cos(radians(v_gym_lat)) * cos(radians(p_lat)) *
      power(sin(radians(p_lng - v_gym_lng) / 2), 2)
    ));
    if v_dist > v_radius then raise exception 'outside gym fence'; end if;
  end if;

  if exists (select 1 from public.attendance_records where user_id = v_actor and date = v_today) then
    raise exception 'already checked in today';
  end if;

  insert into public.attendance_records (user_id, date) values (v_actor, v_today);

  v_pts := case when v_tier in ('full', 'admin') then 150 else 100 end;
  perform public._award_points(v_actor, v_pts, 'attendance', '체육관 출석 인증 (500m 내)', null);
  perform set_config('app.allow_sensitive_profile_write', 'on', true);
  update public.profiles set is_at_gym = true where id = v_actor;

  return v_pts;
end;
$$;
