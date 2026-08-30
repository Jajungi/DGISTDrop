-- ============================================================
-- 044: 소셜 로그인 (Google·Naver) · 가입 완료 RPC
-- 실행: Supabase SQL Editor에 붙여넣고 Run
-- Dashboard: Authentication → Providers 에서 Google·Custom OIDC(naver) 설정
-- ============================================================

alter table public.profiles
  add column if not exists signup_complete boolean not null default true;

update public.profiles set signup_complete = true where signup_complete is distinct from true;

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
  v_status public.member_status;
  v_auth_email text;
begin
  select
    coalesce(open_registration, true),
    coalesce(roster_enforcement, false)
  into v_open, v_enforce
  from public.club_metadata where id = 1;

  v_auth_email := nullif(btrim(coalesce(new.email, '')), '');

  -- 익명(게스트) 가입
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

  -- 소셜 OAuth (Google·Naver 등) — 학번은 rpc_complete_social_signup 에서
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

  -- 학번+비밀번호 가입
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
      select 1 from public.club_roster r
      where r.student_id = v_student_id
        and r.name_normalized = public.normalize_club_name(v_name)
    ) into v_on_roster;
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

  if coalesce(v_enforce, false) and not v_on_roster then
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

create or replace function public.rpc_complete_social_signup(
  p_student_id text,
  p_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_student_id text;
  v_name text;
  v_open boolean := true;
  v_enforce boolean := false;
  v_on_roster boolean := false;
  v_status public.member_status;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  v_student_id := nullif(btrim(p_student_id), '');
  v_name := nullif(btrim(p_name), '');

  if v_student_id is null then
    raise exception 'student id required';
  end if;
  if not public.is_valid_student_id(v_student_id) then
    raise exception 'invalid student id format';
  end if;
  if v_name is null then
    raise exception 'name required';
  end if;

  if exists (
    select 1 from public.profiles p
    where p.student_id = v_student_id and p.id <> v_uid
  ) then
    raise exception 'student id already taken';
  end if;

  select
    coalesce(open_registration, true),
    coalesce(roster_enforcement, false)
  into v_open, v_enforce
  from public.club_metadata where id = 1;

  if coalesce(v_enforce, false) then
    select exists (
      select 1 from public.club_roster r
      where r.student_id = v_student_id
        and r.name_normalized = public.normalize_club_name(v_name)
    ) into v_on_roster;
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

  update public.profiles
  set
    student_id = v_student_id,
    name = v_name,
    nickname = v_name,
    member_status = v_status,
    signup_complete = true
  where id = v_uid;

  if not found then
    raise exception 'profile not found';
  end if;

  if coalesce(v_enforce, false) and not v_on_roster then
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
end;
$$;

grant execute on function public.rpc_complete_social_signup(text, text) to authenticated;
revoke all on function public.rpc_complete_social_signup(text, text) from anon, public;
