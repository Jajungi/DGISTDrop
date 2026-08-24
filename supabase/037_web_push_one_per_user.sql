-- ============================================================
-- 037: 웹 푸시 구독은 사람당 최근 1개만 유지
-- 실행: SQL Editor에 붙여넣고 Run
-- 전제: 015 push_tokens, 035 rpc_prune_push_tokens, is_admin()
-- ============================================================

-- 승인 회원이 아닌 토큰 + 60일 넘은 발송 기록 + 같은 사람의 여분 웹 구독
create or replace function public.rpc_prune_push_tokens()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unapproved int := 0;
  v_extra_web int := 0;
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

  with ranked as (
    select
      token,
      row_number() over (
        partition by user_id
        order by coalesce(updated_at, created_at) desc nulls last, token
      ) as rn
    from public.push_tokens
    where
      (token like '{%' and token like '%"endpoint"%')
      or platform in ('web', 'web-desktop', 'web-android', 'web-ios')
  ),
  gone_web as (
    delete from public.push_tokens t
    using ranked r
    where t.token = r.token
      and r.rn > 1
    returning 1
  )
  select count(*) into v_extra_web from gone_web;

  with old_logs as (
    delete from public.push_notify_log
    where sent_at < now() - interval '60 days'
    returning 1
  )
  select count(*) into v_logs from old_logs;

  return jsonb_build_object(
    'unapproved', v_unapproved,
    'extra_web', v_extra_web,
    'duplicates', v_extra_web,
    'old_logs', v_logs,
    'removed', v_unapproved + v_extra_web
  );
end;
$$;

grant execute on function public.rpc_prune_push_tokens() to authenticated;
revoke all on function public.rpc_prune_push_tokens() from anon;
revoke all on function public.rpc_prune_push_tokens() from public;

comment on function public.rpc_prune_push_tokens() is
  '미승인·게스트 토큰, 여분 웹 구독(사람당 최근 1개만), 옛 발송 기록을 정리한다.';
