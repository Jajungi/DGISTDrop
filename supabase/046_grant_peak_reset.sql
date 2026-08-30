-- ============================================================
-- 046: rpc_reset_peak_reservations 실행 권한 (42501 해결)
-- 로그인 시 피크타임 예약 횟수 자정 리셋용
-- Supabase SQL Editor에서 Run
-- ============================================================

grant execute on function public.rpc_reset_peak_reservations() to authenticated;
