/** Expo / Web Push 발송 + 만료·Invalid 토큰 정리 (발송 실패분만 삭제) */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildPushPayload } from 'https://esm.sh/@block65/webcrypto-web-push@1.0.2';

export function isExpoToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
}

export function isWebSubscription(token: string): boolean {
  return token.startsWith('{') && token.includes('"endpoint"');
}

/** Expo DeviceNotRegistered 등 — 재발송해도 소용없는 토큰 */
function isExpoFatalError(detailsError?: string, message?: string): boolean {
  const err = (detailsError ?? '').toLowerCase();
  const msg = (message ?? '').toLowerCase();
  return (
    err === 'devicenotregistered' ||
    err === 'invalidcredentials' ||
    msg.includes('devicenotregistered') ||
    msg.includes('not a registered push notification recipient') ||
    msg.includes('unable to retrieve the fcm server key')
  );
}

/** Web Push 구독 만료/삭제 — 404·410 등 */
function isWebSubscriptionGone(status: number): boolean {
  return status === 404 || status === 410 || status === 403;
}

async function deleteTokens(supabase: SupabaseClient, tokens: string[]) {
  const unique = [...new Set(tokens.filter(Boolean))];
  if (!unique.length) return;
  const { error } = await supabase.from('push_tokens').delete().in('token', unique);
  if (error) console.warn('[push] token prune failed', error.message, unique.length);
  else console.log('[push] pruned invalid tokens', unique.length);
}

export async function sendExpoAndPrune(
  supabase: SupabaseClient,
  tokens: string[],
  title: string,
  body: string,
  kind?: string,
  expoAccessToken?: string | null
): Promise<number> {
  if (!tokens.length) return 0;

  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title,
    body,
    priority: 'high',
    channelId: kind === 'coach' ? 'coach' : 'default',
  }));

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
    return 0;
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
    const token = tokens[i];
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

  await deleteTokens(supabase, dead);
  return sent;
}

export async function sendWebAndPrune(
  supabase: SupabaseClient,
  tokens: string[],
  title: string,
  body: string,
  vapid: { subject: string; publicKey: string; privateKey: string }
): Promise<number> {
  if (!tokens.length || !vapid.publicKey || !vapid.privateKey) return 0;

  let sent = 0;
  const dead: string[] = [];

  for (const token of tokens) {
    try {
      const sub = JSON.parse(token) as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      const payload = await buildPushPayload(
        { data: JSON.stringify({ title, body }), options: { ttl: 3600 } },
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
      console.warn('[web-push] failed', err);
    }
  }

  await deleteTokens(supabase, dead);
  return sent;
}
