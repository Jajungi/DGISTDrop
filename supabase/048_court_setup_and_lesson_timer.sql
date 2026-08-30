-- 048: 코트 현황 3단계 + 레슨 진행 시각
-- 예약 OFF 모드: unset(empty) / ready(reserved) / active(playing)

alter table public.lesson_queue
  add column if not exists active_since timestamptz;

create or replace function public.rpc_set_court_setup_state(p_court_id int, p_state text)
returns public.courts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_court public.courts;
  v_status text;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  if not public.is_staff() then raise exception 'staff only'; end if;

  if p_state not in ('unset', 'ready', 'active') then
    raise exception 'invalid setup state';
  end if;

  v_status := case p_state
    when 'unset' then 'empty'
    when 'ready' then 'reserved'
    else 'playing'
  end;

  select * into v_court from public.courts where id = p_court_id for update;
  if not found then raise exception 'court not found'; end if;

  perform set_config('app.allow_court_write', 'on', true);

  if v_status = 'empty' then
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
  elsif v_status = 'reserved' then
    update public.courts set
      status = 'reserved',
      reserved_by = null,
      reserved_at = now(),
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
  else
    update public.courts set
      status = 'playing',
      reserved_by = null,
      reserved_at = coalesce(reserved_at, now()),
      started_at = coalesce(started_at, now()),
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

grant execute on function public.rpc_set_court_setup_state(int, text) to authenticated;
revoke all on function public.rpc_set_court_setup_state(int, text) from anon, public;
