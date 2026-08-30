-- ============================================================
-- 051: 알림 유형별 수신 설정 (합류·친구·운영)
-- ============================================================

alter table public.user_notification_prefs
  add column if not exists join_alerts boolean not null default true,
  add column if not exists friend_alerts boolean not null default true,
  add column if not exists system_alerts boolean not null default true;
