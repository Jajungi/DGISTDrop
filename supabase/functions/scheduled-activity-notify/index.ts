// Supabase Edge Function: scheduled-activity-notify
// Supabase Cron으로 5분마다 호출 (KST)
// 1) 휴관 당일 예약 푸시  2) 추가 활동일 활동알림 시각 푸시  3) 정기 활동일 자동 알림
//
// Cron 예: */5 * * * *  (Dashboard → Edge Functions → Schedules)

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

interface ClubEventPush {
  enabled?: boolean;
  time?: string;
  sentDates?: string[];
}

interface ClubEventRow {
  id: string;
  kind: string;
  title: string;
  body?: string;
  dateStart: string;
  dateEnd: string;
  active?: boolean;
  pushNotify?: ClubEventPush;
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

function earliestActivityTime(schedule: ActivitySession[]): string {
  if (!schedule.length) return '18:30';
  const sorted = [...schedule].sort(
    (a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute)
  );
  return formatHHMM(sorted[0].startHour, sorted[0].startMinute);
}

async function broadcast(
  title: string,
  message: string,
  type: string
): Promise<unknown> {
  const broadcastRes = await fetch(`${SUPABASE_URL}/functions/v1/broadcast-push`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, message, type }),
  });
  return broadcastRes.json();
}

function isActiveOn(ev: ClubEventRow, date: string): boolean {
  return ev.active !== false && ev.dateStart <= date && ev.dateEnd >= date;
}

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  if (auth !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = kstNow();
  const results: Record<string, unknown> = { date: now.date, minutes: now.minutes };

  try {
    const { data: meta, error: metaErr } = await supabase
      .from('club_metadata')
      .select('push_notify_settings, activity_schedule, club_events')
      .eq('id', 1)
      .maybeSingle();
    if (metaErr) throw metaErr;

    const settings = (meta?.push_notify_settings ?? {}) as PushSettings;
    const schedule = (meta?.activity_schedule ?? []) as ActivitySession[];
    const events = (Array.isArray(meta?.club_events) ? meta.club_events : []) as ClubEventRow[];
    let eventsChanged = false;
    const closureSent: string[] = [];
    const extraSent: string[] = [];

    // ---------- 휴관 당일 예약 푸시 ----------
    for (const ev of events) {
      if (ev.kind !== 'closure' || !isActiveOn(ev, now.date)) continue;
      if (!ev.pushNotify?.enabled) continue;

      const notifyMinutes = parseHHMM(ev.pushNotify.time ?? '09:00');
      if (notifyMinutes == null) continue;
      if (Math.abs(now.minutes - notifyMinutes) > 4) continue;

      const sent = Array.isArray(ev.pushNotify.sentDates) ? ev.pushNotify.sentDates : [];
      if (sent.includes(now.date)) continue;

      const title = `[휴관] ${ev.title || '휴관 안내'}`;
      const message =
        ev.body?.trim() ||
        `${now.date}은(는) 동아리 활동이 없습니다.`;

      try {
        await broadcast(title, message, 'notice');
        ev.pushNotify = {
          ...ev.pushNotify,
          enabled: true,
          time: ev.pushNotify.time ?? '09:00',
          sentDates: [...sent, now.date],
        };
        eventsChanged = true;
        closureSent.push(ev.id);
      } catch (err) {
        results.closureError = String(err);
      }
    }

    // ---------- 추가 활동일: 활동 자동 알림 시각에 발송 ----------
    const activityNotifyMinutes = parseHHMM(settings.notify_time ?? '18:00');
    if (activityNotifyMinutes != null && Math.abs(now.minutes - activityNotifyMinutes) <= 4) {
      const activityTime = earliestActivityTime(
        schedule.filter((s) => s.day === now.day).length
          ? schedule.filter((s) => s.day === now.day)
          : schedule
      );

      for (const ev of events) {
        if (ev.kind !== 'extra' || !isActiveOn(ev, now.date)) continue;
        if (!ev.pushNotify?.enabled) continue;

        const sent = Array.isArray(ev.pushNotify.sentDates) ? ev.pushNotify.sentDates : [];
        if (sent.includes(now.date)) continue;

        let title = 'Drop 활동 알림';
        let message: string;
        if (settings.cancel_today) {
          message = settings.cancel_message ?? '❌ 오늘 활동이 취소되었습니다.';
        } else {
          message = (settings.message_template ?? '🏸 오늘 {time}부터 활동 있습니다!')
            .replace('{time}', activityTime);
          if (ev.title?.trim()) {
            title = `Drop 활동 알림 · ${ev.title.trim()}`;
          }
        }

        try {
          await broadcast(title, message, 'activity');
          ev.pushNotify = {
            ...ev.pushNotify,
            enabled: true,
            time: settings.notify_time ?? '18:00',
            sentDates: [...sent, now.date],
          };
          eventsChanged = true;
          extraSent.push(ev.id);
        } catch (err) {
          results.extraError = String(err);
        }
      }
    }

    if (eventsChanged) {
      await supabase
        .from('club_metadata')
        .update({ club_events: events, updated_at: new Date().toISOString() })
        .eq('id', 1);
    }
    results.closurePush = { sent: closureSent.length, ids: closureSent };
    results.extraPush = { sent: extraSent.length, ids: extraSent };

    // ---------- 정기 활동일 자동 알림 ----------
    if (!settings.enabled || !settings.auto_notify_enabled) {
      results.activity = { skipped: 'disabled' };
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (settings.last_auto_sent_date === now.date || extraSent.length > 0) {
      results.activity = {
        skipped: extraSent.length > 0 ? 'extra_sent_today' : 'already_sent_today',
      };
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const closedToday = events.some((e) => e.kind === 'closure' && isActiveOn(e, now.date));
    if (closedToday) {
      results.activity = { skipped: 'closure_today' };
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const todaySessions = schedule.filter((s) => s.day === now.day);
    if (!todaySessions.length) {
      results.activity = { skipped: 'not_activity_day' };
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (activityNotifyMinutes == null) {
      return new Response(JSON.stringify({ ...results, error: 'invalid notify_time' }), {
        status: 400,
      });
    }

    if (Math.abs(now.minutes - activityNotifyMinutes) > 4) {
      results.activity = { skipped: 'not_notify_time' };
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const activityTime = earliestActivityTime(todaySessions);
    let title = 'Drop 활동 알림';
    let message: string;

    if (settings.cancel_today) {
      message = settings.cancel_message ?? '❌ 오늘 활동이 취소되었습니다.';
    } else {
      message = (settings.message_template ?? '🏸 오늘 {time}부터 활동 있습니다!')
        .replace('{time}', activityTime);
    }

    const result = await broadcast(title, message, 'activity');

    await supabase
      .from('club_metadata')
      .update({
        push_notify_settings: { ...settings, last_auto_sent_date: now.date },
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    results.activity = { sent: true, result };
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), ...results }), { status: 500 });
  }
});
