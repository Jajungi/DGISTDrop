-- profiles 에 카카오 챗봇 매핑용 아이디 추가
alter table if exists public.profiles
  add column if not exists kakao_id text;

-- 동일 카카오 아이디 중복 등록 방지 (null 제외)
create unique index if not exists profiles_kakao_id_key
  on public.profiles (kakao_id)
  where kakao_id is not null and length(trim(kakao_id)) > 0;
