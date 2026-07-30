-- ============================================================
-- 026: 화면 오버레이 공지 · 휴관/특강 · 코트 대기열
-- ============================================================

-- club_metadata: overlays + events
alter table public.club_metadata
  add column if not exists site_overlays jsonb not null default '[]'::jsonb;

alter table public.club_metadata
  add column if not exists club_events jsonb not null default '[]'::jsonb;

update public.club_metadata
set
  site_overlays = coalesce(site_overlays, '[]'::jsonb),
  club_events = coalesce(club_events, '[]'::jsonb)
where id = 1;

create or replace function public.rpc_set_site_overlays(p_overlays jsonb)
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
  if p_overlays is null or jsonb_typeof(p_overlays) <> 'array' then
    raise exception 'invalid overlays';
  end if;

  insert into public.club_metadata (id, site_overlays, updated_at)
  values (1, p_overlays, now())
  on conflict (id) do update
    set site_overlays = excluded.site_overlays,
        updated_at = now();

  return p_overlays;
end;
$$;

grant execute on function public.rpc_set_site_overlays(jsonb) to authenticated;
revoke all on function public.rpc_set_site_overlays(jsonb) from anon;
revoke all on function public.rpc_set_site_overlays(jsonb) from public;

create or replace function public.rpc_set_club_events(p_events jsonb)
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
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    raise exception 'invalid events';
  end if;

  insert into public.club_metadata (id, club_events, updated_at)
  values (1, p_events, now())
  on conflict (id) do update
    set club_events = excluded.club_events,
        updated_at = now();

  return p_events;
end;
$$;

grant execute on function public.rpc_set_club_events(jsonb) to authenticated;
revoke all on function public.rpc_set_club_events(jsonb) from anon;
revoke all on function public.rpc_set_club_events(jsonb) from public;

-- 로그인 전에도 공지·휴관을 읽을 수 있도록 anon select 허용 (이미 있으면면 유지)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'club_metadata' and policyname = 'club_metadata_select_anon'
  ) then
    create policy club_metadata_select_anon on public.club_metadata
      for select to anon
      using (true);
  end if;
exception when others then
  null;
end $$;

-- courts.wait_queue
alter table public.courts
  add column if not exists wait_queue jsonb not null default '[]'::jsonb;

-- 예약 시 대기열은 유지 (다음 이용자) — 반납 RPC/클라이언트에서 비움
-- guard: wait_queue 만 바뀌는 경우도 허용 (합류와 동일)
create or replace function public.guard_court_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_is_participant boolean;
  v_only_queue boolean;
  v_cleanup boolean;
begin
  if public.is_admin() or public.is_operator()
     or current_setting('app.allow_court_write', true) = 'on' then
    return new;
  end if;

  if new.status = 'reserved' and old.status is distinct from 'reserved' then
    raise exception 'use rpc_reserve_court to reserve a court';
  end if;

  if new.reserved_by is not null and new.reserved_by is distinct from old.reserved_by then
    raise exception 'cannot claim a court directly';
  end if;

  v_is_participant := (old.reserved_by = v_actor)
    or exists (
      select 1 from jsonb_array_elements(old.players) e
      where e->>'userId' = v_actor::text
    );

  -- join_requests / wait_queue 만 변경
  v_only_queue := (new.status = old.status)
    and (new.reserved_by is not distinct from old.reserved_by)
    and (new.players = old.players)
    and (new.games_completed = old.games_completed)
    and (new.max_games = old.max_games);

  v_cleanup := (old.status = 'just_finished' and new.status = 'empty');

  if not (v_is_participant or v_only_queue or v_cleanup) then
    raise exception 'not allowed to modify this court';
  end if;

  return new;
end;
$$;
