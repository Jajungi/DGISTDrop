-- ============================================================
-- 029: 활동 알림 푸시 설정 (club_metadata.push_notify_settings)
-- 전제: 024 activity_schedule, 015 push_tokens 적용됨
-- ============================================================

alter table public.club_metadata
  add column if not exists push_notify_settings jsonb;

update public.club_metadata
set push_notify_settings = coalesce(
  push_notify_settings,
  '{
    "enabled": true,
    "auto_notify_enabled": true,
    "notify_time": "18:00",
    "message_template": "🏸 오늘 {time}부터 활동 있습니다! 앱에서 출석·코트를 확인하세요.",
    "cancel_today": false,
    "cancel_message": "❌ 오늘 활동이 취소되었습니다.",
    "last_auto_sent_date": null
  }'::jsonb
)
where id = 1;

-- 발송 기록
create table if not exists public.push_notify_log (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'activity',
  title text not null,
  message text not null,
  recipient_count int not null default 0,
  sent_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz not null default now()
);

create index if not exists push_notify_log_sent_at_idx
  on public.push_notify_log (sent_at desc);

alter table public.push_notify_log enable row level security;

drop policy if exists "push_notify_log_select_admin" on public.push_notify_log;
create policy "push_notify_log_select_admin" on public.push_notify_log
  for select to authenticated
  using (public.is_admin());

-- 관리자만 설정 변경
create or replace function public.rpc_set_push_notify_settings(p_settings jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  insert into public.club_metadata (id, push_notify_settings, updated_at)
  values (1, p_settings, now())
  on conflict (id) do update
    set push_notify_settings = excluded.push_notify_settings,
        updated_at = now();

  return true;
end;
$$;

grant execute on function public.rpc_set_push_notify_settings(jsonb) to authenticated;
revoke all on function public.rpc_set_push_notify_settings(jsonb) from anon;
revoke all on function public.rpc_set_push_notify_settings(jsonb) from public;

-- 오늘 활동 취소 토글
create or replace function public.rpc_toggle_activity_cancel_today(p_cancel boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select coalesce(push_notify_settings, '{}'::jsonb)
  into v_settings
  from public.club_metadata
  where id = 1;

  v_settings := jsonb_set(v_settings, '{cancel_today}', to_jsonb(p_cancel), true);

  insert into public.club_metadata (id, push_notify_settings, updated_at)
  values (1, v_settings, now())
  on conflict (id) do update
    set push_notify_settings = excluded.push_notify_settings,
        updated_at = now();

  return v_settings;
end;
$$;

grant execute on function public.rpc_toggle_activity_cancel_today(boolean) to authenticated;
revoke all on function public.rpc_toggle_activity_cancel_today(boolean) from anon;
revoke all on function public.rpc_toggle_activity_cancel_today(boolean) from public;
