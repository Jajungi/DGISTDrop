-- ============================================================
-- 031: 피크 시간 설정 (club_metadata.peak_hours)
-- ============================================================

alter table public.club_metadata
  add column if not exists peak_hours jsonb;

update public.club_metadata
set peak_hours = coalesce(peak_hours, '[19,20]'::jsonb)
where id = 1;

create or replace function public.rpc_set_peak_hours(p_hours jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_item jsonb;
  v_hour int;
  v_arr jsonb := '[]'::jsonb;
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;
  if not (public.is_admin() or public.is_operator()) then
    raise exception 'admin or operator only';
  end if;
  if p_hours is null or jsonb_typeof(p_hours) <> 'array' then
    raise exception 'invalid peak hours';
  end if;

  for v_item in select * from jsonb_array_elements(p_hours)
  loop
    if jsonb_typeof(v_item) <> 'number' then
      raise exception 'invalid peak hour';
    end if;
    v_hour := (v_item #>> '{}')::int;
    if v_hour < 0 or v_hour > 23 then
      raise exception 'peak hour out of range';
    end if;
    if not (v_arr @> jsonb_build_array(v_hour)) then
      v_arr := v_arr || jsonb_build_array(v_hour);
    end if;
  end loop;

  if jsonb_array_length(v_arr) = 0 then
    raise exception 'peak hours empty';
  end if;

  insert into public.club_metadata (id, peak_hours, updated_at)
  values (1, v_arr, now())
  on conflict (id) do update
    set peak_hours = excluded.peak_hours,
        updated_at = now();

  return v_arr;
end;
$$;

grant execute on function public.rpc_set_peak_hours(jsonb) to authenticated;
revoke all on function public.rpc_set_peak_hours(jsonb) from anon;
revoke all on function public.rpc_set_peak_hours(jsonb) from public;
