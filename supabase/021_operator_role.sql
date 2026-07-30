-- ============================================================
-- 021: 운영자(operator) 역할 — 관리자(owner) / 운영자(staff)
-- 020 이후 Supabase SQL Editor에서 적용
-- ============================================================

alter table public.profiles
  add column if not exists is_operator boolean not null default false;

create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_operator = true
      and member_status = 'approved'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or public.is_operator();
$$;

grant execute on function public.is_operator() to authenticated;
grant execute on function public.is_staff() to authenticated;
revoke all on function public.is_operator() from anon;
revoke all on function public.is_operator() from public;
revoke all on function public.is_staff() from anon;
revoke all on function public.is_staff() from public;

-- ---------------------------------------------------------------------------
-- guard: is_operator 보호 + 관리자 tier 변경은 관리자만 + 일상은 staff
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- RLS: 일상 운영 → is_staff
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
  on public.profiles for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "admin_logs_admin" on public.admin_logs;
create policy "admin_logs_admin"
  on public.admin_logs for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "club_metadata_admin" on public.club_metadata;
create policy "club_metadata_admin"
  on public.club_metadata for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "attendance_delete_admin" on public.attendance_records;
create policy "attendance_delete_admin"
  on public.attendance_records for delete to authenticated
  using (public.is_staff());

drop policy if exists "cleaning_update_admin" on public.cleaning_submissions;
create policy "cleaning_update_admin"
  on public.cleaning_submissions for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "coach_announcements_write" on public.coach_announcements;
create policy "coach_announcements_write"
  on public.coach_announcements for all to authenticated
  using (public.is_staff() or public.is_coach())
  with check (public.is_staff() or public.is_coach());

drop policy if exists "match_results_insert" on public.match_results;
create policy "match_results_insert"
  on public.match_results for insert to authenticated
  with check (
    public.is_staff()
    or auth.uid() = any(coalesce(team_a, '{}'))
    or auth.uid() = any(coalesce(team_b, '{}'))
  );

drop policy if exists "match_results_update" on public.match_results;
create policy "match_results_update"
  on public.match_results for update to authenticated
  using (
    public.is_staff()
    or (
      status = 'pending'
      and (
        auth.uid() = any(coalesce(team_a, '{}'))
        or auth.uid() = any(coalesce(team_b, '{}'))
      )
    )
    or (
      auth.uid() = any(coalesce(team_a, '{}'))
      or auth.uid() = any(coalesce(team_b, '{}'))
    )
  )
  with check (
    public.is_staff()
    or auth.uid() = any(coalesce(team_a, '{}'))
    or auth.uid() = any(coalesce(team_b, '{}'))
  );

drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert"
  on public.notifications for insert to authenticated
  with check (
    public.is_staff()
    or (user_id = auth.uid() and public.is_approved_member())
  );

drop policy if exists "admin_logs_insert" on public.admin_logs;
create policy "admin_logs_insert"
  on public.admin_logs for insert to authenticated
  with check (
    public.is_staff()
    or actor_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- RPC: 일상 운영 staff 허용 (reset_data는 admin 유지)
-- ---------------------------------------------------------------------------
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
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  if not public.is_staff() then raise exception 'staff only'; end if;

  select membership_tier, member_status into v_tier, v_status
  from public.profiles where id = p_user_id;
  if not found then raise exception 'user not found'; end if;
  if v_status <> 'approved' then raise exception 'not an approved member'; end if;

  if exists (
    select 1 from public.attendance_records
    where user_id = p_user_id and date = current_date
  ) then
    raise exception 'already checked in today';
  end if;

  insert into public.attendance_records (user_id, date) values (p_user_id, current_date);

  v_pts := case when v_tier in ('full', 'admin') then 150 else 100 end;
  perform public._award_points(p_user_id, v_pts, 'attendance', '운영진 대리 출석', null);

  perform set_config('app.allow_sensitive_profile_write', 'on', true);
  update public.profiles set is_at_gym = true, updated_at = now() where id = p_user_id;

  return v_pts;
end;
$$;

create or replace function public.rpc_revoke_point_transaction(
  p_tx_id uuid,
  p_reason text default '운영진 취소'
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.point_transactions;
  v_reversal int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.is_staff() then raise exception 'staff only'; end if;

  select * into v_tx from public.point_transactions where id = p_tx_id for update;
  if not found then raise exception 'transaction not found'; end if;
  if v_tx.revoked_at is not null then raise exception 'already revoked'; end if;
  if v_tx.delta = 0 then raise exception 'cannot revoke zero transaction'; end if;

  update public.point_transactions set revoked_at = now() where id = p_tx_id;
  v_reversal := -v_tx.delta;
  perform public._award_points(
    v_tx.user_id,
    v_reversal,
    'admin',
    '포인트 취소 · ' || v_tx.reason || ' (' || coalesce(nullif(trim(p_reason), ''), '운영진 취소') || ')',
    p_tx_id::text
  );
  return v_reversal;
end;
$$;

create or replace function public.rpc_admin_refund_court(
  p_court_id int,
  p_user_id uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.point_transactions;
  v_refund int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.is_staff() then raise exception 'staff only'; end if;

  select * into v_tx
  from public.point_transactions
  where user_id = p_user_id
    and kind = 'court'
    and delta < 0
    and ref_id = 'court-' || p_court_id
    and revoked_at is null
  order by created_at desc
  limit 1;

  if not found then return 0; end if;

  v_refund := abs(v_tx.delta);
  update public.point_transactions set revoked_at = now() where id = v_tx.id;
  perform public._award_points(
    p_user_id,
    v_refund,
    'court',
    '코트 ' || p_court_id || ' 예약 환불 (운영진)',
    'refund-admin-' || p_court_id
  );
  return v_refund;
end;
$$;

create or replace function public.rpc_revoke_cleaning_submission(
  p_submission_id uuid,
  p_reason text default '운영진 취소'
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.cleaning_submissions;
  v_tx public.point_transactions;
  v_reversal int;
  v_reason text := coalesce(nullif(trim(p_reason), ''), '운영진 취소');
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.is_staff() then raise exception 'staff only'; end if;

  select * into v_row from public.cleaning_submissions where id = p_submission_id for update;
  if not found then raise exception 'submission not found'; end if;
  if v_row.revoked_at is not null then raise exception 'already revoked'; end if;

  update public.cleaning_submissions
  set revoked_at = now(), revoked_by = auth.uid()
  where id = p_submission_id;

  select * into v_tx
  from public.point_transactions
  where user_id = v_row.user_id
    and ref_id = p_submission_id::text
    and revoked_at is null
    and delta > 0
  order by created_at desc
  limit 1;

  if found then
    update public.point_transactions set revoked_at = now() where id = v_tx.id;
    v_reversal := v_tx.delta;
    perform public._award_points(
      v_row.user_id,
      -v_reversal,
      'admin',
      case v_row.kind
        when 'net_setup' then '네트 인증 취소 · ' || v_row.area || ' (' || v_reason || ')'
        else '청소 인증 취소 · ' || v_row.area || ' (' || v_reason || ')'
      end,
      p_submission_id::text
    );
  else
    v_reversal := v_row.points;
    if v_reversal > 0 then
      perform public._award_points(
        v_row.user_id,
        -v_reversal,
        'admin',
        case v_row.kind
          when 'net_setup' then '네트 인증 취소 · ' || v_row.area || ' (' || v_reason || ')'
          else '청소 인증 취소 · ' || v_row.area || ' (' || v_reason || ')'
        end,
        p_submission_id::text
      );
    end if;
  end if;

  if v_row.kind = 'cleaning' then
    perform set_config('app.allow_sensitive_profile_write', 'on', true);
    update public.profiles
    set cleaning_contributions = greatest(0, cleaning_contributions - 1)
    where id = v_row.user_id;
  end if;

  return coalesce(v_reversal, 0);
end;
$$;

create or replace function public.rpc_adjust_points(
  p_user_id uuid,
  p_delta int,
  p_kind public.point_tx_kind,
  p_reason text,
  p_ref_id text default null
)
returns public.point_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_tx public.point_transactions;
  v_actor uuid := auth.uid();
  v_is_staff boolean := public.is_staff();
begin
  if v_actor is null then raise exception 'not authenticated'; end if;

  if p_user_id <> v_actor and not v_is_staff then
    raise exception 'can only adjust own points unless staff';
  end if;

  if p_delta > 0 and not v_is_staff then
    raise exception 'earning points requires a validated action (use dedicated RPC)';
  end if;

  if p_kind = 'admin' and not v_is_staff then
    raise exception 'staff only';
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then raise exception 'user not found'; end if;

  perform set_config('app.allow_sensitive_profile_write', 'on', true);

  update public.profiles
  set points = greatest(0, v_profile.points + p_delta), updated_at = now()
  where id = p_user_id
  returning * into v_profile;

  insert into public.point_transactions (user_id, delta, balance_after, kind, reason, ref_id, created_by)
  values (p_user_id, p_delta, v_profile.points, p_kind, p_reason, p_ref_id, v_actor)
  returning * into v_tx;

  return v_tx;
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
  v_gym_lat constant double precision := 35.6972;
  v_gym_lng constant double precision := 128.4611;
  v_radius constant double precision := 500;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;

  select membership_tier, member_status into v_tier, v_status
  from public.profiles where id = v_actor;
  if v_status <> 'approved' then raise exception 'not an approved member'; end if;

  -- 지오펜스 (운영진·관리자 예외)
  if not public.is_staff() then
    if p_lat is null or p_lng is null then raise exception 'location required'; end if;
    v_dist := 2 * 6371000 * asin(sqrt(
      power(sin(radians(p_lat - v_gym_lat) / 2), 2) +
      cos(radians(v_gym_lat)) * cos(radians(p_lat)) *
      power(sin(radians(p_lng - v_gym_lng) / 2), 2)
    ));
    if v_dist > v_radius then raise exception 'outside gym fence'; end if;
  end if;

  if exists (select 1 from public.attendance_records where user_id = v_actor and date = current_date) then
    raise exception 'already checked in today';
  end if;

  insert into public.attendance_records (user_id, date) values (v_actor, current_date);

  v_pts := case when v_tier in ('full', 'admin') then 150 else 100 end;
  perform public._award_points(v_actor, v_pts, 'attendance', '체육관 출석 인증 (500m 내)', null);
  perform set_config('app.allow_sensitive_profile_write', 'on', true);
  update public.profiles set is_at_gym = true where id = v_actor;

  return v_pts;
end;
$$;

create or replace function public.rpc_send_notification(
  p_target_user_id uuid,
  p_title text,
  p_message text,
  p_kind text default 'system',
  p_court_id int default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  if not public.is_approved_member() and not public.is_staff() then
    raise exception 'not approved';
  end if;
  if p_target_user_id is null then raise exception 'target required'; end if;
  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_message), '') = '' then
    raise exception 'title and message required';
  end if;

  insert into public.notifications (user_id, title, message, kind, court_id)
  values (
    p_target_user_id,
    trim(p_title),
    trim(p_message),
    coalesce(nullif(trim(p_kind), ''), 'system'),
    p_court_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- rpc_reserve_court: 운영진도 지오펜스·피크·포인트 예외 (합의된 staff 권한)
-- ---------------------------------------------------------------------------
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
  v_gym_lat constant double precision := 35.6972;
  v_gym_lng constant double precision := 128.4611;
  v_radius constant double precision := 500;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;

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
          select 1 from jsonb_array_elements(c.players) e
          where e->>'userId' = v_actor::text
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

  if v_profile.points < v_cost and not v_is_staff then
    raise exception 'insufficient points';
  end if;

  perform public._award_points(
    v_actor, -v_cost, 'court', v_court.name || ' 예약', 'court-' || p_court_id
  );

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
