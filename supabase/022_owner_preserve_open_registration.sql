-- ============================================================
-- 022: 완전 초기화 시 관리자(owner) 보존 · 가입 즉시 승인 스위치
-- 021 이후 Supabase SQL Editor에서 적용
-- ============================================================

-- ---------------------------------------------------------------------------
-- club_metadata: 가입 즉시 승인 (기본 ON)
-- ---------------------------------------------------------------------------
alter table public.club_metadata
  add column if not exists open_registration boolean not null default true;

create or replace function public._admin_reset_club_metadata()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.club_metadata set
    peak_reset_date           = null,
    last_cleaning_bonus_month = null,
    -- open_registration 은 운영 설정이므로 유지
    updated_at                = now()
  where id = 1;
end;
$$;

-- ---------------------------------------------------------------------------
-- 가입 시: open_registration=true → 즉시 승인 / false → 대기
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id text;
  v_name text;
  v_email text;
  v_open boolean := true;
  v_status public.member_status;
begin
  select coalesce(open_registration, true) into v_open
  from public.club_metadata where id = 1;
  v_status := case when coalesce(v_open, true) then 'approved'::public.member_status
                   else 'pending'::public.member_status end;

  -- 익명(게스트) 가입
  if nullif(btrim(coalesce(new.email, '')), '') is null then
    v_student_id := 'guest-' || substr(replace(new.id::text, '-', ''), 1, 16);
    v_name := coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), '게스트');
    v_email := '';
    insert into public.profiles (
      id, student_id, name, nickname, email, membership_tier, member_status
    )
    values (
      new.id, v_student_id, v_name, v_name, v_email, 'guest', 'approved'
    )
    on conflict (id) do nothing;
    return new;
  end if;

  v_student_id := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'student_id'), ''),
    nullif(split_part(new.email, '@', 1), '')
  );
  if v_student_id is null or v_student_id = '' then
    raise exception 'student id required';
  end if;

  if not public.is_valid_student_id(v_student_id) then
    raise exception 'invalid student id format';
  end if;

  v_name := coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), v_student_id);
  v_email := coalesce(new.raw_user_meta_data->>'contact_email', '');

  insert into public.profiles (
    id, student_id, name, nickname, email, membership_tier, member_status
  )
  values (
    new.id, v_student_id, v_name, v_name, v_email, 'associate', v_status
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 운영진: 가입 즉시 승인 스위치
-- ---------------------------------------------------------------------------
create or replace function public.rpc_set_open_registration(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.is_staff() then raise exception 'staff only'; end if;

  insert into public.club_metadata (id, open_registration, updated_at)
  values (1, coalesce(p_enabled, true), now())
  on conflict (id) do update
    set open_registration = coalesce(p_enabled, true),
        updated_at = now();

  return coalesce(p_enabled, true);
end;
$$;

grant execute on function public.rpc_set_open_registration(boolean) to authenticated;
revoke all on function public.rpc_set_open_registration(boolean) from anon;
revoke all on function public.rpc_set_open_registration(boolean) from public;

-- ---------------------------------------------------------------------------
-- 완전 초기화: 관리자(owner) 계정 보존
-- ---------------------------------------------------------------------------
create or replace function public.rpc_admin_reset_data(p_scope text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_actor uuid := auth.uid();
  v_deleted_users int := 0;
  v_ids uuid[];
  v_keep uuid[];
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  case p_scope
    when 'courts' then
      perform public._admin_reset_courts();

    when 'matches' then
      truncate table public.match_results cascade;

    when 'attendance' then
      truncate table public.attendance_records, public.cleaning_submissions cascade;

    when 'points' then
      truncate table public.point_transactions cascade;
      perform set_config('app.allow_sensitive_profile_write', 'on', true);
      update public.profiles set points = 0, updated_at = now() where id is not null;

    when 'social' then
      truncate table
        public.friend_requests,
        public.coach_announcements,
        public.lesson_queue,
        public.team_rooms
      cascade;

    when 'notifications_logs' then
      truncate table public.notifications, public.admin_logs cascade;

    when 'guests' then
      perform public._admin_reset_courts();
      select array_agg(id) into v_ids
      from public.profiles where membership_tier = 'guest';
      perform public._admin_clear_user_refs(v_ids);
      delete from auth.users where id = any(coalesce(v_ids, '{}'::uuid[]));
      get diagnostics v_deleted_users = row_count;

    when 'pending_members' then
      perform public._admin_reset_courts();
      select array_agg(id) into v_ids
      from public.profiles where member_status = 'pending';
      perform public._admin_clear_user_refs(v_ids);
      delete from auth.users where id = any(coalesce(v_ids, '{}'::uuid[]));
      get diagnostics v_deleted_users = row_count;

    when 'activity_stats' then
      perform public._admin_reset_courts();
      perform public._admin_truncate_activity_tables();
      perform public._admin_reset_member_stats();
      perform public._admin_reset_club_metadata();

    when 'full' then
      perform public._admin_reset_courts();
      perform public._admin_truncate_activity_tables();
      perform public._admin_reset_club_metadata();

      -- 관리자(owner) + 실행자 본인은 삭제하지 않음
      select array_agg(id) into v_keep
      from public.profiles
      where membership_tier = 'admin' or id = v_actor;

      select array_agg(id) into v_ids
      from public.profiles
      where not (id = any(coalesce(v_keep, array[v_actor]::uuid[])));

      perform public._admin_clear_user_refs(v_ids);
      delete from auth.users where id = any(coalesce(v_ids, '{}'::uuid[]));
      get diagnostics v_deleted_users = row_count;

      -- 남은 관리자 스탯만 깨끗이 (계정·권한은 유지)
      perform set_config('app.allow_sensitive_profile_write', 'on', true);
      update public.profiles set
        points = 0,
        elo = 1000,
        rank = 'bronze',
        wins = 0,
        losses = 0,
        total_games = 0,
        cleaning_contributions = 0,
        peak_time_reservations = 0,
        is_at_gym = false,
        schedule_date = null,
        scheduled_start = null,
        scheduled_end = null,
        lesson_status = 'none',
        lesson_requested_at = null,
        updated_at = now()
      where id = any(coalesce(v_keep, array[v_actor]::uuid[]));

    else
      raise exception 'unknown reset scope: %', p_scope;
  end case;

  return jsonb_build_object(
    'scope', p_scope,
    'deleted_users', v_deleted_users,
    'ok', true
  );
end;
$$;

revoke all on function public.rpc_admin_reset_data(text) from public;
grant execute on function public.rpc_admin_reset_data(text) to authenticated;
