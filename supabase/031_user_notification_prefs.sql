-- ============================================================
-- 031: 개인 알림 설정 (활동일 저녁 · 레슨 차례 · 코치 공지 · 친구 도착)
-- ============================================================

create table if not exists public.user_notification_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  activity_evening boolean not null default true,
  lesson_turn boolean not null default true,
  coach_notice boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_notification_prefs enable row level security;

drop policy if exists "user_notification_prefs_select" on public.user_notification_prefs;
create policy "user_notification_prefs_select" on public.user_notification_prefs
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_notification_prefs_upsert" on public.user_notification_prefs;
drop policy if exists "user_notification_prefs_insert" on public.user_notification_prefs;
create policy "user_notification_prefs_insert" on public.user_notification_prefs
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "user_notification_prefs_update" on public.user_notification_prefs;
create policy "user_notification_prefs_update" on public.user_notification_prefs
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.friend_arrival_notify (
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  constraint friend_arrival_notify_not_self check (user_id <> friend_id)
);

create index if not exists friend_arrival_notify_friend_idx
  on public.friend_arrival_notify (friend_id);

alter table public.friend_arrival_notify enable row level security;

drop policy if exists "friend_arrival_notify_select" on public.friend_arrival_notify;
create policy "friend_arrival_notify_select" on public.friend_arrival_notify
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "friend_arrival_notify_insert" on public.friend_arrival_notify;
create policy "friend_arrival_notify_insert" on public.friend_arrival_notify
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.friend_requests fr
      where fr.status = 'accepted'
        and (
          (fr.from_user_id = auth.uid() and fr.to_user_id = friend_id)
          or (fr.from_user_id = friend_id and fr.to_user_id = auth.uid())
        )
    )
  );

drop policy if exists "friend_arrival_notify_delete" on public.friend_arrival_notify;
create policy "friend_arrival_notify_delete" on public.friend_arrival_notify
  for delete to authenticated
  using (user_id = auth.uid());

-- 체육관 도착(false → true) 시 구독한 친구에게 알림함 insert → send-push 트리거
create or replace function public.notify_friend_arrival()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if coalesce(old.is_at_gym, false) = true or coalesce(new.is_at_gym, false) = false then
    return new;
  end if;

  for rec in
    select n.user_id
    from public.friend_arrival_notify n
    where n.friend_id = new.id
      and exists (
        select 1 from public.friend_requests fr
        where fr.status = 'accepted'
          and (
            (fr.from_user_id = n.user_id and fr.to_user_id = new.id)
            or (fr.from_user_id = new.id and fr.to_user_id = n.user_id)
          )
      )
  loop
    insert into public.notifications (user_id, title, message, kind)
    values (
      rec.user_id,
      '친구 도착',
      coalesce(new.name, '친구') || '님이 체육관에 도착했어요.',
      'friend'
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists profiles_friend_arrival_notify on public.profiles;
create trigger profiles_friend_arrival_notify
  after update of is_at_gym on public.profiles
  for each row execute function public.notify_friend_arrival();
