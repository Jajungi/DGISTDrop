-- ============================================================
-- 033: 동아리 명단 (학번 + 실명) · 가입 제한 스위치
-- 기본: roster_enforcement = false → 지금과 동일 (즉시 승인 스위치만)
-- ON이면 명단 일치 시 즉시 승인, 없으면 승인 대기
-- 게스트는 변경 없음
-- ============================================================

alter table public.club_metadata
  add column if not exists roster_enforcement boolean not null default false;

create or replace function public.normalize_club_name(p_name text)
returns text
language sql
immutable
as $$
  select lower(
    regexp_replace(
      normalize(trim(both from coalesce(p_name, '')), nfc),
      '\s+',
      '',
      'g'
    )
  );
$$;

create table if not exists public.club_roster (
  student_id text primary key,
  name text not null,
  name_normalized text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists club_roster_name_normalized_idx
  on public.club_roster (name_normalized);

alter table public.club_roster enable row level security;

revoke all on table public.club_roster from anon, authenticated, public;

drop policy if exists "club_roster_no_direct" on public.club_roster;
create policy "club_roster_no_direct"
  on public.club_roster for all to authenticated
  using (false)
  with check (false);

-- ---------------------------------------------------------------------------
-- 가입 트리거: 명단 제한 OFF면 open_registration, ON이면 학번+실명 대조
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

  return new;
end;
$$;

create or replace function public.rpc_set_roster_enforcement(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.is_staff() then raise exception 'staff only'; end if;

  insert into public.club_metadata (id, roster_enforcement, updated_at)
  values (1, coalesce(p_enabled, false), now())
  on conflict (id) do update
    set roster_enforcement = coalesce(p_enabled, false),
        updated_at = now();

  return coalesce(p_enabled, false);
end;
$$;

create or replace function public.rpc_list_club_roster()
returns table (
  student_id text,
  name text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.is_staff() then raise exception 'staff only'; end if;

  return query
    select r.student_id, r.name, r.created_at, r.updated_at
    from public.club_roster r
    order by r.student_id;
end;
$$;

create or replace function public.rpc_upsert_club_roster(p_entries jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_el jsonb;
  v_sid text;
  v_name text;
  v_inserted int := 0;
  v_updated int := 0;
  v_skipped int := 0;
  v_existed boolean;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.is_staff() then raise exception 'staff only'; end if;

  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception 'entries must be a json array';
  end if;

  for v_el in select value from jsonb_array_elements(p_entries)
  loop
    v_sid := nullif(btrim(coalesce(v_el->>'student_id', '')), '');
    v_name := nullif(btrim(coalesce(v_el->>'name', '')), '');

    if v_sid is null or v_name is null then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    if not public.is_valid_student_id(v_sid) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    if length(public.normalize_club_name(v_name)) < 2 then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    select exists (
      select 1 from public.club_roster where student_id = v_sid
    ) into v_existed;

    insert into public.club_roster (student_id, name, name_normalized, created_at, updated_at)
    values (v_sid, v_name, public.normalize_club_name(v_name), now(), now())
    on conflict (student_id) do update
      set name = excluded.name,
          name_normalized = excluded.name_normalized,
          updated_at = now();

    if v_existed then
      v_updated := v_updated + 1;
    else
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'skipped', v_skipped,
    'ok', true
  );
end;
$$;

create or replace function public.rpc_delete_club_roster(p_student_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.is_staff() then raise exception 'staff only'; end if;

  delete from public.club_roster where student_id = btrim(p_student_id);
  return found;
end;
$$;

grant execute on function public.normalize_club_name(text) to authenticated;
grant execute on function public.rpc_set_roster_enforcement(boolean) to authenticated;
grant execute on function public.rpc_list_club_roster() to authenticated;
grant execute on function public.rpc_upsert_club_roster(jsonb) to authenticated;
grant execute on function public.rpc_delete_club_roster(text) to authenticated;

revoke all on function public.normalize_club_name(text) from anon;
revoke all on function public.rpc_set_roster_enforcement(boolean) from anon, public;
revoke all on function public.rpc_list_club_roster() from anon, public;
revoke all on function public.rpc_upsert_club_roster(jsonb) from anon, public;
revoke all on function public.rpc_delete_club_roster(text) from anon, public;
