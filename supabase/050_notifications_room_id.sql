-- 050: 모집방 초대 알림에 room_id 저장 (푸시·수락용)

alter table public.notifications
  add column if not exists room_id uuid references public.team_rooms(id) on delete set null;

create or replace function public.rpc_send_notification(
  p_target_user_id uuid,
  p_title text,
  p_message text,
  p_kind text default 'system',
  p_court_id int default null,
  p_room_id uuid default null
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

  insert into public.notifications (user_id, title, message, kind, court_id, room_id)
  values (
    p_target_user_id,
    trim(p_title),
    trim(p_message),
    coalesce(nullif(trim(p_kind), ''), 'system'),
    p_court_id,
    p_room_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.rpc_send_notification(uuid, text, text, text, int, uuid) to authenticated;
