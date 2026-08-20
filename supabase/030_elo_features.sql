-- ============================================================
-- 030: Elo·랭크 실험 기능 스위치 (club_metadata.elo_features_enabled)
-- 기본 ON. OFF면 브론즈 티어·Elo 추이·랭크 할인 등 UI/규칙이 숨겨집니다.
-- ============================================================

alter table public.club_metadata
  add column if not exists elo_features_enabled boolean not null default true;

create or replace function public.rpc_set_elo_features_enabled(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  insert into public.club_metadata (id, elo_features_enabled, updated_at)
  values (1, p_enabled, now())
  on conflict (id) do update
    set elo_features_enabled = excluded.elo_features_enabled,
        updated_at = now();

  return p_enabled;
end;
$$;

grant execute on function public.rpc_set_elo_features_enabled(boolean) to authenticated;
revoke all on function public.rpc_set_elo_features_enabled(boolean) from anon;
revoke all on function public.rpc_set_elo_features_enabled(boolean) from public;
