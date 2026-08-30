-- ============================================================
-- 052: 알림·코치 공지 영문 필드
-- ============================================================

alter table public.notifications
  add column if not exists title_en text,
  add column if not exists message_en text;

alter table public.coach_announcements
  add column if not exists title_en text,
  add column if not exists message_en text;

drop function if exists public.rpc_send_notification(uuid, text, text, text, int, uuid);

create or replace function public.rpc_send_notification(
  p_target_user_id uuid,
  p_title text,
  p_message text,
  p_kind text default 'system',
  p_court_id int default null,
  p_room_id uuid default null,
  p_title_en text default null,
  p_message_en text default null
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

  insert into public.notifications (
    user_id, title, message, kind, court_id, room_id, title_en, message_en
  )
  values (
    p_target_user_id,
    trim(p_title),
    trim(p_message),
    coalesce(nullif(trim(p_kind), ''), 'system'),
    p_court_id,
    p_room_id,
    nullif(trim(coalesce(p_title_en, '')), ''),
    nullif(trim(coalesce(p_message_en, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.rpc_send_notification(uuid, text, text, text, int, uuid, text, text)
  to authenticated;

-- 푸시 트리거 payload에 영문 필드 포함 (015_push_tokens.ready.sql 과 동일 URL·키 패턴)
create or replace function public.notify_push_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text := 'https://xndodghcmedkkaurbnab.supabase.co/functions/v1/send-push';
  v_key text := '{SERVICE_ROLE_KEY}';
begin
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'user_id', new.user_id,
      'title', new.title,
      'message', new.message,
      'title_en', new.title_en,
      'message_en', new.message_en,
      'kind', new.kind
    )
  );
  return new;
end;
$$;
