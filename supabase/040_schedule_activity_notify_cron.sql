-- ============================================================
-- drop-activity-notify Cron: Dashboard UI timeout 1000ms 한계 우회
-- Dashboard Edge Function Job은 timeout을 1000ms 넘게 못 올림.
-- 함수가 1초 넘으면(방송 포함) Cron 쪽이 4XX/노랑으로 보임.
--
-- 실행 전: Settings → API → service_role (eyJ… JWT) 복사
-- YOUR_SERVICE_ROLE_KEY 를 그 값으로 바꾼 뒤 SQL Editor에서 Run
-- ============================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Vault에 service_role 보관 (이미 있으면 update로 교체)
do $$
declare
  v_key text := 'YOUR_SERVICE_ROLE_KEY'; -- ← 여기만 교체
  v_id uuid;
begin
  if v_key = 'YOUR_SERVICE_ROLE_KEY' or length(v_key) < 20 then
    raise exception 'YOUR_SERVICE_ROLE_KEY 를 Settings → API → service_role 값으로 바꾸세요';
  end if;

  select id into v_id from vault.secrets where name = 'service_role_key' limit 1;
  if v_id is null then
    perform vault.create_secret(v_key, 'service_role_key');
  else
    perform vault.update_secret(v_id, v_key);
  end if;

  select id into v_id from vault.secrets where name = 'project_url' limit 1;
  if v_id is null then
    perform vault.create_secret(
      'https://xndodghcmedkkaurbnab.supabase.co',
      'project_url'
    );
  end if;
end $$;

-- Dashboard에서 만든 Job / 예전 Job 제거 후 15초 timeout 으로 재등록
select cron.unschedule(jobid)
from cron.job
where jobname in ('drop-activity-notify', 'scheduled-activity-notify-every-5m');

select
  cron.schedule(
    'drop-activity-notify',
    '*/5 * * * *',
    $$
    select
      net.http_post(
        url := (
          select decrypted_secret from vault.decrypted_secrets where name = 'project_url'
        ) || '/functions/v1/scheduled-activity-notify',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization',
            'Bearer ' || (
              select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
            ),
          'apikey',
            (
              select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
            )
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 15000
      ) as request_id;
    $$
  );

-- 확인
select jobid, jobname, schedule, active, command
from cron.job
where jobname = 'drop-activity-notify';
