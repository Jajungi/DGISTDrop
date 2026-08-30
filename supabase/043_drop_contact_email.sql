-- ============================================================
-- 043: 연락용 이메일 제거 (profiles.email 비움)
-- 실행: Supabase SQL Editor에 붙여넣고 Run
-- ============================================================

update public.profiles set email = '';

alter table public.profiles alter column email set default '';
