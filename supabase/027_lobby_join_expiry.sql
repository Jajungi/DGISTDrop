-- ============================================================
-- 027: 모집방 참가 승인 · 자동 만료 설정
-- ============================================================

alter table public.team_rooms
  add column if not exists join_requests jsonb not null default '[]'::jsonb;

alter table public.club_metadata
  add column if not exists lobby_expiry jsonb;

update public.club_metadata
set lobby_expiry = coalesce(
  lobby_expiry,
  '{"mode":"end_of_day","hours":6}'::jsonb
)
where id = 1;

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
  public.team_room_has_password(id) as has_password,
  join_requests
from public.team_rooms;

grant select on public.team_rooms_public to authenticated;
grant select on public.team_rooms to authenticated;
revoke select (password) on public.team_rooms from authenticated;
revoke select on public.team_rooms from anon;
revoke select (password) on public.team_rooms from anon;

create or replace function public.rpc_set_lobby_expiry(p_expiry jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_mode text;
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;
  if not (public.is_admin() or public.is_operator()) then
    raise exception 'admin or operator only';
  end if;
  if p_expiry is null or jsonb_typeof(p_expiry) <> 'object' then
    raise exception 'invalid expiry';
  end if;
  v_mode := p_expiry->>'mode';
  if v_mode is null or v_mode not in ('hours', 'end_of_day', 'never') then
    raise exception 'invalid expiry mode';
  end if;

  insert into public.club_metadata (id, lobby_expiry, updated_at)
  values (1, p_expiry, now())
  on conflict (id) do update
    set lobby_expiry = excluded.lobby_expiry,
        updated_at = now();

  return p_expiry;
end;
$$;

grant execute on function public.rpc_set_lobby_expiry(jsonb) to authenticated;
revoke all on function public.rpc_set_lobby_expiry(jsonb) from anon;
revoke all on function public.rpc_set_lobby_expiry(jsonb) from public;
