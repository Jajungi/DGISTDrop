-- ============================================================
-- 035: 못 쓰는 푸시 기기 정리
-- 실행: SQL Editor에 붙여넣고 Run
-- 전제: 015 push_tokens, 029 push_notify_log, is_admin()
-- ============================================================

-- 승인 회원이 아닌 토큰(게스트·대기·거절) + 60일 넘은 발송 기록
-- 같은 사람의 앱·웹 기기는 유지. 웹 구독은 사람당 최근 3개만 관리 화면에서 추가로 정리할 수 있음.
create or replace function public.rpc_prune_push_tokens()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unapproved int := 0;
  v_logs int := 0;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  with gone as (
    delete from public.push_tokens t
    where not exists (
      select 1
      from public.profiles p
      where p.id = t.user_id
        and p.member_status = 'approved'
        and coalesce(p.membership_tier, 'guest') <> 'guest'
    )
    returning 1
  )
  select count(*) into v_unapproved from gone;

  with old_logs as (
    delete from public.push_notify_log
    where sent_at < now() - interval '60 days'
    returning 1
  )
  select count(*) into v_logs from old_logs;

  return jsonb_build_object(
    'unapproved', v_unapproved,
    'duplicates', 0,
    'old_logs', v_logs,
    'removed', v_unapproved
  );
end;
$$;

grant execute on function public.rpc_prune_push_tokens() to authenticated;
revoke all on function public.rpc_prune_push_tokens() from anon;
revoke all on function public.rpc_prune_push_tokens() from public;
