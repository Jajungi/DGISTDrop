// Supabase Edge Function: scheduled-activity-notify
// Supabase Cron으로 5분마다 호출 (KST)
// 1) 휴관 당일 예약 푸시  2) 추가 활동일 활동알림 시각 푸시  3) 정기 활동일 자동 알림
//
// Cron 예: */5 * * * *  (Dashboard → Edge Functions → Schedules)
//
// 알림 시각: ±4분 창 + 놓친 경우 활동 시작(또는 +2시간)까지 당일 1회 따라잡기.
// last_auto_sent_date 는 broadcast 성공 후에만 기록.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface PushSettings {
  enabled?: boolean;
  auto_notify_enabled?: boolean;
  notify_time?: string;
  message_template?: string;
  cancel_today?: boolean;
  cancel_date?: string | null;
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

/** HH:MM 또는 HH:MM:SS */
function parseHHMM(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
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

function earliestStartMinutes(schedule: ActivitySession[]): number | null {
  if (!schedule.length) return null;
  return Math.min(...schedule.map((s) => s.startHour * 60 + s.startMinute));
}

/**
 * ±4분 정각 창, 또는 정각을 놓쳤을 때 catchUntil(활동 시작 등)까지 따라잡기.
 * catchUntil 이 없으면 알림 시각 + 120분.
 */
function inNotifyWindow(
  nowMinutes: number,
  notifyMinutes: number,
  catchUntilMinutes: number | null
): boolean {
  if (Math.abs(nowMinutes - notifyMinutes) <= 4) return true;
  if (nowMinutes < notifyMinutes) return false;
  const until =
    catchUntilMinutes != null && catchUntilMinutes >= notifyMinutes
      ? catchUntilMinutes
      : notifyMinutes + 120;
  return nowMinutes <= until;
}

async function broadcast(
  title: string,
  message: string,
  type: string
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const broadcastRes = await fetch(`${SUPABASE_URL}/functions/v1/broadcast-push`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, message, type }),
  });
  let body: unknown = null;
  try {
    body = await broadcastRes.json();
  } catch {
    body = null;
  }
  return { ok: broadcastRes.ok, status: broadcastRes.status, body };
}

function isActiveOn(ev: ClubEventRow, date: string): boolean {
  return ev.active !== false && ev.dateStart <= date && ev.dateEnd >= date;
}

function jwtRole(token: string): string | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

function isAuthorized(req: Request): { ok: boolean; detail: Record<string, unknown> } {
  const expected = (SERVICE_ROLE_KEY ?? '').trim();
  const rawAuth = (req.headers.get('Authorization') ?? '').trim();
  const rawApiKey = (req.headers.get('apikey') ?? req.headers.get('ApiKey') ?? '').trim();
  const token = rawAuth.replace(/^Bearer\s+/i, '').replace(/^Bearer\s+/i, '').trim();

  const detail: Record<string, unknown> = {
    has_authorization: Boolean(rawAuth),
    has_apikey: Boolean(rawApiKey),
    auth_role: token ? jwtRole(token) : null,
    apikey_role: rawApiKey.includes('.') ? jwtRole(rawApiKey) : null,
  };

  if (!expected) {
    return { ok: false, detail: { ...detail, reason: 'missing_service_role_env' } };
  }
  // 문자열 일치 (레거시 JWT / sb_secret 동일 값)
  if (token && token === expected) return { ok: true, detail: { ...detail, via: 'authorization' } };
  if (rawApiKey && rawApiKey === expected) return { ok: true, detail: { ...detail, via: 'apikey' } };
  // Dashboard Cron·Vault에 넣은 JWT와 Edge 자동주입 키가 세대가 다르면 문자열이 다를 수 있음.
  // payload role 이 service_role 이면 서비스 권한으로 본다.
  if (jwtRole(token) === 'service_role') {
    return { ok: true, detail: { ...detail, via: 'authorization_jwt_role' } };
  }
  if (jwtRole(rawApiKey) === 'service_role') {
    return { ok: true, detail: { ...detail, via: 'apikey_jwt_role' } };
  }
  return {
    ok: false,
    detail: {
      ...detail,
      reason: 'key_mismatch',
      hint:
        detail.auth_role === 'anon' || detail.apikey_role === 'anon'
          ? 'Cron is sending anon/publishable key. Use service_role (secret) in Authorization or apikey.'
          : 'Use Settings → API → service_role JWT (role=service_role).',
    },
  };
}

Deno.serve(async (req) => {
  // Boot만 보이면 게이트웨이 JWT 검사에서 막힌 것. 이 줄이 보이면 핸들러 도착.
  console.log(
    '[scheduled-activity-notify] handler_enter',
    JSON.stringify({
      method: req.method,
      has_authorization: Boolean(req.headers.get('Authorization')),
      has_apikey: Boolean(req.headers.get('apikey') ?? req.headers.get('ApiKey')),
    })
  );

  const auth = isAuthorized(req);
  if (!auth.ok) {
    console.log('[scheduled-activity-notify] unauthorized', JSON.stringify(auth.detail));
    return new Response(JSON.stringify({ error: 'unauthorized', ...auth.detail }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  console.log('[scheduled-activity-notify] authorized', JSON.stringify(auth.detail));

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

    const cancelledToday = settings.cancel_today === true && settings.cancel_date === now.date;
    if (settings.cancel_today && settings.cancel_date !== now.date) {
      settings.cancel_today = false;
      settings.cancel_date = null;
      await supabase
        .from('club_metadata')
        .update({
          push_notify_settings: settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);
    }

    // 마스터/자동: 명시 false만 끔. undefined면 기본 on으로 본다.
    const pushMasterOn = settings.enabled !== false;
    const autoOn = settings.auto_notify_enabled !== false;

    if (!pushMasterOn) {
      results.skipped = 'push_disabled';
      results.closurePush = { sent: 0, ids: [] };
      results.extraPush = { sent: 0, ids: [] };
      results.activity = { skipped: 'disabled' };
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ---------- 휴관 당일 예약 푸시 ----------
    for (const ev of events) {
      if (ev.kind !== 'closure' || !isActiveOn(ev, now.date)) continue;
      if (!ev.pushNotify?.enabled) continue;

      const notifyMinutes = parseHHMM(ev.pushNotify.time ?? '09:00');
      if (notifyMinutes == null) continue;
      // 휴관: ±4 또는 정각 후 2시간 따라잡기
      if (!inNotifyWindow(now.minutes, notifyMinutes, notifyMinutes + 120)) continue;

      const sent = Array.isArray(ev.pushNotify.sentDates) ? ev.pushNotify.sentDates : [];
      if (sent.includes(now.date)) continue;

      const title = `[휴관] ${ev.title || '휴관 안내'}`;
      const message =
        ev.body?.trim() ||
        `${now.date}은(는) 동아리 활동이 없습니다.`;

      try {
        const br = await broadcast(title, message, 'notice');
        if (!br.ok) {
          results.closureError = `broadcast ${br.status}`;
          continue;
        }
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
    const todaySessionsForExtra = schedule.filter((s) => s.day === now.day);
    const extraCatchUntil = earliestStartMinutes(
      todaySessionsForExtra.length ? todaySessionsForExtra : schedule
    );

    if (
      !cancelledToday &&
      autoOn &&
      activityNotifyMinutes != null &&
      inNotifyWindow(now.minutes, activityNotifyMinutes, extraCatchUntil)
    ) {
      const activityTime = earliestActivityTime(
        todaySessionsForExtra.length ? todaySessionsForExtra : schedule
      );

      for (const ev of events) {
        if (ev.kind !== 'extra' || !isActiveOn(ev, now.date)) continue;
        if (!ev.pushNotify?.enabled) continue;

        const sent = Array.isArray(ev.pushNotify.sentDates) ? ev.pushNotify.sentDates : [];
        if (sent.includes(now.date)) continue;

        let title = 'Drop 활동 알림';
        const template = ev.body?.trim()
          || settings.message_template
          || '🏸 오늘 {time}부터 활동 있습니다!';
        let message = template.replace('{time}', activityTime);
        if (ev.title?.trim()) {
          title = `Drop 활동 알림 · ${ev.title.trim()}`;
        }

        try {
          const br = await broadcast(title, message, 'activity');
          if (!br.ok) {
            results.extraError = `broadcast ${br.status}`;
            continue;
          }
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
    if (!autoOn) {
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

    if (cancelledToday) {
      results.activity = { skipped: 'cancelled_today' };
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

    const catchUntil = earliestStartMinutes(todaySessions);
    if (!inNotifyWindow(now.minutes, activityNotifyMinutes, catchUntil)) {
      results.activity = {
        skipped: 'not_notify_time',
        notify_minutes: activityNotifyMinutes,
        catch_until: catchUntil,
      };
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const activityTime = earliestActivityTime(todaySessions);
    const title = 'Drop 활동 알림';
    const message = (settings.message_template ?? '🏸 오늘 {time}부터 활동 있습니다!')
      .replace('{time}', activityTime);

    const br = await broadcast(title, message, 'activity');
    if (!br.ok) {
      results.activity = { sent: false, error: `broadcast ${br.status}`, result: br.body };
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await supabase
      .from('club_metadata')
      .update({
        push_notify_settings: { ...settings, last_auto_sent_date: now.date },
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    results.activity = { sent: true, result: br.body };
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), ...results }), { status: 500 });
  }
});
