-- ============================================================
-- 032: 카카오 아이디 연동 제거 (028에서 추가한 profiles.kakao_id)
-- 재실행 안전
-- ============================================================

drop index if exists public.profiles_kakao_id_key;

alter table public.profiles
  drop column if exists kakao_id;
