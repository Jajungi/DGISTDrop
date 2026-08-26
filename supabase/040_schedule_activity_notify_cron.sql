-- ============================================================
-- 040: 활동 자동 알림 Cron (5분마다 scheduled-activity-notify 호출)
-- 실행: Supabase SQL Editor
--
-- 왜 필요? Edge Function만 배포하면 호출이 0건입니다.
-- Cron(pg_cron + pg_net)이 함수 URL을 주기적으로 호출해야 자동 발송됩니다.
--
-- 사전: Dashboard → Project Settings → API 에서 service_role 키 복사
-- ============================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- 1) 시크릿 (한 번만). 이미 있으면 있으면 건너뛰고, service_role 값만 맞춰 주세요.
--    ※ service_role 키는 절대 Git에 넣지 마세요. SQL Editor에서만 실행.
select vault.create_secret(
  'https://xndodghcmedkkaurbnab.supabase.co',
  'project_url'
)
where not exists (
  select 1 from vault.decrypted_secrets where name = 'project_url'
);

-- ↓↓↓ 아래 YOUR_SERVICE_ROLE_KEY 를 실제 service_role 로 바꾼 뒤 실행 ↓↓↓
-- select vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');
-- 이미 service_role_key 가 있으면: Dashboard Vault에서 갱신하거나
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'service_role_key'),
--     'YOUR_SERVICE_ROLE_KEY'
--   );

-- 2) 기존 동명 Job 제거 후 재등록 (재실행 안전)
select cron.unschedule(jobid)
from cron.job
where jobname = 'scheduled-activity-notify-every-5m';

select
  cron.schedule(
    'scheduled-activity-notify-every-5m',
    '*/5 * * * *',
    $$
    select
      net.http_post(
        url := (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'project_url'
        ) || '/functions/v1/scheduled-activity-notify',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization',
            'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'service_role_key'
            )
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 15000
      ) as request_id;
    $$
  );

-- 확인
-- select jobid, jobname, schedule, active from cron.job where jobname = 'scheduled-activity-notify-every-5m';
-- select * from cron.job_run_details order by start_time desc limit 10;
