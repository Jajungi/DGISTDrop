// Supabase Edge Function: scheduled-activity-notify
// Supabase Cron으로 5분마다 호출 (KST 기준 활동일·알림 시간 매칭 시 발송)
//
// Cron 예: */5 * * * *  (Dashboard → Edge Functions → Schedules)
// 시크릿: SERVICE_ROLE_KEY는 자동, broadcast-push와 동일 VAPID/EXPO 설정

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface PushSettings {
  enabled?: boolean;
  auto_notify_enabled?: boolean;
  notify_time?: string;
  message_template?: string;
  cancel_today?: boolean;
  cancel_message?: string;
  last_auto_sent_date?: string | null;
}

interface ActivitySession {
  day: number;
  startHour: number;
  startMinute: number;
}

function kstNow(): { date: string; day: number; minutes: number } {
  const now = new Date();
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const y = kst.getFullYear();
  const m = String(kst.getMonth() + 1).padStart(2, '0');
  const d = String(kst.getDate()).padStart(2, '0');
  return {
    date: `${y}-${m}-${d}`,
    day: kst.getDay(),
    minutes: kst.getHours() * 60 + kst.getMinutes(),
  };
}

function parseHHMM(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function formatHHMM(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  if (auth !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const { data: meta, error: metaErr } = await supabase
      .from('club_metadata')
      .select('push_notify_settings, activity_schedule')
      .eq('id', 1)
      .maybeSingle();
    if (metaErr) throw metaErr;

    const settings = (meta?.push_notify_settings ?? {}) as PushSettings;
    const schedule = (meta?.activity_schedule ?? []) as ActivitySession[];

    if (!settings.enabled || !settings.auto_notify_enabled) {
      return new Response(JSON.stringify({ skipped: 'disabled' }), { status: 200 });
    }

    const now = kstNow();

    if (settings.last_auto_sent_date === now.date) {
      return new Response(JSON.stringify({ skipped: 'already_sent_today' }), { status: 200 });
    }

    const todaySessions = schedule.filter((s) => s.day === now.day);
    if (!todaySessions.length) {
      return new Response(JSON.stringify({ skipped: 'not_activity_day' }), { status: 200 });
    }

    const notifyMinutes = parseHHMM(settings.notify_time ?? '18:00');
    if (notifyMinutes == null) {
      return new Response(JSON.stringify({ error: 'invalid notify_time' }), { status: 400 });
    }

    // 5분 윈도우 내 매칭
    if (Math.abs(now.minutes - notifyMinutes) > 4) {
      return new Response(JSON.stringify({ skipped: 'not_notify_time' }), { status: 200 });
    }

    const firstSession = todaySessions.sort(
      (a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute)
    )[0];
    const activityTime = formatHHMM(firstSession.startHour, firstSession.startMinute);

    let title = 'Drop 활동 알림';
    let message: string;

    if (settings.cancel_today) {
      message = settings.cancel_message ?? '❌ 오늘 활동이 취소되었습니다.';
    } else {
      message = (settings.message_template ?? '🏸 오늘 {time}부터 활동 있습니다!')
        .replace('{time}', activityTime);
    }

    const broadcastRes = await fetch(`${SUPABASE_URL}/functions/v1/broadcast-push`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, message, type: 'activity' }),
    });
    const result = await broadcastRes.json();

    const updatedSettings = {
      ...settings,
      last_auto_sent_date: now.date,
    };
    await supabase
      .from('club_metadata')
      .update({ push_notify_settings: updatedSettings, updated_at: new Date().toISOString() })
      .eq('id', 1);

    return new Response(JSON.stringify({ sent: true, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
