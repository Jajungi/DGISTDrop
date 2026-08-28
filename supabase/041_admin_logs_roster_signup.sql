-- ============================================================
-- 041: 활동 로그 전체 삭제 RPC · 명단 밖 가입 시 관리자 로그
-- 실행: Supabase SQL Editor에 붙여넣고 Run
-- ============================================================

create or replace function public.rpc_clear_admin_logs()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_staff() then
    raise exception 'staff only';
  end if;

  delete from public.admin_logs;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

grant execute on function public.rpc_clear_admin_logs() to authenticated;
revoke all on function public.rpc_clear_admin_logs() from anon, public;

-- 명단 제한 ON + 명단에 없으면 가입 대기 + 관리자 활동 로그
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
  v_enforce boolean := false;
  v_on_roster boolean := false;
  v_status public.member_status;
begin
  select
    coalesce(open_registration, true),
    coalesce(roster_enforcement, false)
  into v_open, v_enforce
  from public.club_metadata where id = 1;

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
    id, student_id, name, nickname, email, membership_tier, member_status
  )
  values (
    new.id, v_student_id, v_name, v_name, v_email, 'associate', v_status
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
