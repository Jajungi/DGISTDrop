/** Expo / Web Push 발송 + 만료·Invalid 토큰 정리 (발송 실패분만 삭제) */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildPushPayload } from 'https://esm.sh/@block65/webcrypto-web-push@1.0.2';

export type PushSendResult = { sent: number; pruned: number };

export function isExpoToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
}

export function isWebSubscription(token: string): boolean {
  return token.startsWith('{') && token.includes('"endpoint"');
}

/** Expo — 재발송해도 소용없는 토큰 */
function isExpoFatalError(detailsError?: string, message?: string): boolean {
  const err = (detailsError ?? '').toLowerCase();
  const msg = (message ?? '').toLowerCase();
  return (
    err === 'devicenotregistered' ||
    err === 'invalidcredentials' ||
    err === 'mismatchsenderid' ||
    msg.includes('devicenotregistered') ||
    msg.includes('not a registered push notification recipient') ||
    msg.includes('unable to retrieve the fcm server key')
  );
}

/** Web Push 구독이 죽었을 때 (VAPID 전체 실패인 401은 지우지 않음) */
function isWebSubscriptionGone(status: number): boolean {
  return status === 404 || status === 410 || status === 403 || status === 400;
}

async function deleteTokens(supabase: SupabaseClient, tokens: string[]): Promise<number> {
  const unique = [...new Set(tokens.filter(Boolean))];
  if (!unique.length) return 0;
  const { error } = await supabase.from('push_tokens').delete().in('token', unique);
  if (error) {
    console.warn('[push] token prune failed', error.message, unique.length);
    return 0;
  }
  console.log('[push] pruned invalid tokens', unique.length);
  return unique.length;
}

export type ExpoPushTarget = { token: string; platform?: string | null };

function normalizeExpoTargets(tokens: Array<string | ExpoPushTarget>): ExpoPushTarget[] {
  return tokens.map((item) => (typeof item === 'string' ? { token: item } : item));
}

function isAndroidPlatform(platform?: string | null): boolean {
  return (platform ?? '').toLowerCase() === 'android';
}

export async function sendExpoAndPrune(
  supabase: SupabaseClient,
  tokens: Array<string | ExpoPushTarget>,
  title: string,
  body: string,
  kind?: string,
  expoAccessToken?: string | null
): Promise<PushSendResult> {
  const targets = normalizeExpoTargets(tokens);
  if (!targets.length) return { sent: 0, pruned: 0 };

  const isAttendance = kind === 'activity' || kind === 'attendance';
  const messages = targets.map(({ token, platform }) => {
    if (isAttendance && isAndroidPlatform(platform)) {
      return {
        to: token,
        priority: 'high',
        channelId: 'default',
        categoryId: 'attendance',
        _contentAvailable: true,
        data: {
          kind: 'attendance',
          title,
          body,
          presentLocal: '1',
        },
      };
    }
    return {
      to: token,
      sound: 'default',
      title,
      body,
      priority: 'high',
      channelId: kind === 'coach' ? 'coach' : 'default',
      ...(isAttendance
        ? { categoryId: 'attendance', data: { kind: 'attendance' } }
        : { data: { kind: kind ?? 'system' } }),
    };
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (expoAccessToken) headers.Authorization = `Bearer ${expoAccessToken}`;

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    console.warn('[expo] push HTTP', res.status, await res.text());
    return { sent: 0, pruned: 0 };
  }

  const json = (await res.json()) as {
    data?: Array<{
      status?: string;
      message?: string;
      details?: { error?: string };
    }>;
  };

  const tickets = json.data ?? [];
  const dead: string[] = [];
  let sent = 0;

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    const token = targets[i]?.token;
    if (!ticket || !token) continue;
    if (ticket.status === 'ok') {
      sent += 1;
      continue;
    }
    if (isExpoFatalError(ticket.details?.error, ticket.message)) {
      dead.push(token);
    } else {
      console.warn('[expo] ticket error', ticket.message, ticket.details?.error);
    }
  }

  const pruned = await deleteTokens(supabase, dead);
  return { sent, pruned };
}

export async function sendWebAndPrune(
  supabase: SupabaseClient,
  tokens: string[],
  title: string,
  body: string,
  vapid: { subject: string; publicKey: string; privateKey: string },
  kind?: string
): Promise<PushSendResult> {
  if (!tokens.length || !vapid.publicKey || !vapid.privateKey) return { sent: 0, pruned: 0 };

  let sent = 0;
  const dead: string[] = [];

  for (const token of tokens) {
    try {
      const sub = JSON.parse(token) as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
        dead.push(token);
        continue;
      }
      const resolvedKind = kind ?? 'system';
      const showAttendance = resolvedKind === 'activity' || resolvedKind === 'attendance';
      const payload = await buildPushPayload(
        {
          data: JSON.stringify({
            title,
            body,
            kind: resolvedKind,
            showAttendance,
            data: { kind: resolvedKind, showAttendance },
          }),
          options: { ttl: 3600 },
        },
        sub,
        vapid
      );
      const res = await fetch(sub.endpoint, payload);
      if (res.status >= 200 && res.status < 300) {
        sent += 1;
      } else if (isWebSubscriptionGone(res.status)) {
        dead.push(token);
        console.warn('[web-push] gone', res.status, sub.endpoint.slice(0, 48));
      } else {
        console.warn('[web-push] status', res.status, await res.text());
      }
    } catch (err) {
      dead.push(token);
      console.warn('[web-push] failed', err);
    }
  }

  const pruned = await deleteTokens(supabase, dead);
  return { sent, pruned };
}
