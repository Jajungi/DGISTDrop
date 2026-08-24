-- ============================================================
-- 038: 친구 신청 (from, to) 한 줄만, 수락 시 반대 pending 정리
-- 실행: Supabase SQL Editor에 붙여넣고 Run
-- ============================================================

-- 같은 방향 중복 행은 수락된 것(또는 최신)만 남김
with ranked as (
  select
    id,
    row_number() over (
      partition by from_user_id, to_user_id
      order by (status = 'accepted') desc, created_at desc
    ) as rn
  from public.friend_requests
)
delete from public.friend_requests
where id in (select id from ranked where rn > 1);

create unique index if not exists friend_requests_from_to_uidx
  on public.friend_requests (from_user_id, to_user_id);

create or replace function public.friend_request_clear_reverse_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    delete from public.friend_requests
    where status = 'pending'
      and from_user_id = new.to_user_id
      and to_user_id = new.from_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists friend_request_clear_reverse_pending on public.friend_requests;
create trigger friend_request_clear_reverse_pending
  after update on public.friend_requests
  for each row
  execute function public.friend_request_clear_reverse_pending();
