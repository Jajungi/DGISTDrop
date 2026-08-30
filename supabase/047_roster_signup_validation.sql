-- ============================================================
-- 047: 명단 제한 가입 — 학번은 있는데 이름 불일치 시 가입 차단
-- 실행: Supabase SQL Editor에 붙여넣고 Run
-- ============================================================

-- 회원가입 화면·가입 전 검사 (anon 허용)
create or replace function public.rpc_get_roster_signup_policy()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enforce boolean := false;
begin
  select coalesce(roster_enforcement, false) into v_enforce
  from public.club_metadata where id = 1;
  return jsonb_build_object('roster_enforcement', v_enforce);
end;
$$;

-- matched | name_mismatch | not_on_roster | not_enforced
create or replace function public.rpc_check_roster_signup(p_student_id text, p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enforce boolean := false;
  v_student_id text := btrim(coalesce(p_student_id, ''));
  v_name text := btrim(coalesce(p_name, ''));
  v_id_on_roster boolean := false;
  v_match boolean := false;
begin
  select coalesce(roster_enforcement, false) into v_enforce
  from public.club_metadata where id = 1;

  if not v_enforce then
    return 'not_enforced';
  end if;

  if v_student_id = '' or v_name = '' or not public.is_valid_student_id(v_student_id) then
    return 'not_enforced';
  end if;

  select exists (
    select 1 from public.club_roster r where r.student_id = v_student_id
  ) into v_id_on_roster;

  select exists (
    select 1 from public.club_roster r
    where r.student_id = v_student_id
      and r.name_normalized = public.normalize_club_name(v_name)
  ) into v_match;

  if v_match then
    return 'matched';
  end if;

  if v_id_on_roster then
    return 'name_mismatch';
  end if;

  return 'not_on_roster';
end;
$$;

grant execute on function public.rpc_get_roster_signup_policy() to anon, authenticated;
grant execute on function public.rpc_check_roster_signup(text, text) to anon, authenticated;

revoke all on function public.rpc_get_roster_signup_policy() from public;
revoke all on function public.rpc_check_roster_signup(text, text) from public;

-- 학번은 명단에 있으나 이름이 다르면 계정 생성 자체를 막음
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id text;
  v_name text;
  v_open boolean := true;
  v_enforce boolean := false;
  v_on_roster boolean := false;
  v_id_on_roster boolean := false;
  v_status public.member_status;
  v_auth_email text;
begin
  select
    coalesce(open_registration, true),
    coalesce(roster_enforcement, false)
  into v_open, v_enforce
  from public.club_metadata where id = 1;

  v_auth_email := nullif(btrim(coalesce(new.email, '')), '');

  if v_auth_email is null then
    v_student_id := 'guest-' || substr(replace(new.id::text, '-', ''), 1, 16);
    v_name := coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), '게스트');
    insert into public.profiles (
      id, student_id, name, nickname, email, membership_tier, member_status, signup_complete
    )
    values (
      new.id, v_student_id, v_name, v_name, '', 'guest', 'approved', true
    )
    on conflict (id) do nothing;
    return new;
  end if;

  if v_auth_email not like 'drop-%@example.com' then
    v_name := coalesce(
      nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data->>'name'), ''),
      split_part(v_auth_email, '@', 1)
    );
    v_student_id := 'pending-' || substr(replace(new.id::text, '-', ''), 1, 20);
    insert into public.profiles (
      id, student_id, name, nickname, email, membership_tier, member_status, signup_complete
    )
    values (
      new.id, v_student_id, v_name, v_name, '', 'associate', 'pending', false
    )
    on conflict (id) do nothing;
    return new;
  end if;

  v_student_id := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'student_id'), ''),
    nullif(replace(split_part(v_auth_email, '@', 1), 'drop-', ''), '')
  );
  if v_student_id is null or v_student_id = '' then
    raise exception 'student id required';
  end if;

  if not public.is_valid_student_id(v_student_id) then
    raise exception 'invalid student id format';
  end if;

  v_name := coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), v_student_id);

  if coalesce(v_enforce, false) then
    select exists (
      select 1 from public.club_roster r where r.student_id = v_student_id
    ) into v_id_on_roster;

    select exists (
      select 1 from public.club_roster r
      where r.student_id = v_student_id
        and r.name_normalized = public.normalize_club_name(v_name)
    ) into v_on_roster;

    if v_id_on_roster and not v_on_roster then
      raise exception 'roster name mismatch';
    end if;

    v_status := case
      when v_on_roster then 'approved'::public.member_status
      else 'pending'::public.member_status
    end;
  else
    v_status := case
      when coalesce(v_open, true) then 'approved'::public.member_status
      else 'pending'::public.member_status
    end;
  end if;

  insert into public.profiles (
    id, student_id, name, nickname, email, membership_tier, member_status, signup_complete
  )
  values (
    new.id, v_student_id, v_name, v_name, '', 'associate', v_status, true
  )
  on conflict (id) do nothing;

  if coalesce(v_enforce, false) and not v_on_roster and not v_id_on_roster then
    insert into public.admin_logs (
      category,
      action,
      message,
      target_id,
      target_name
    )
    values (
      'member',
      'registration.roster_miss',
      v_student_id || ' ' || v_name || ' — 명단에 없어 승인 대기',
      v_student_id,
      v_name
    );
  end if;

  return new;
end;
$$;
