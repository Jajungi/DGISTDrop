// Supabase Edge Function: send-push
// notifications 테이블 insert 시(트리거/웹훅) 호출되어, 해당 유저의
// Expo 푸시 토큰들로 원격 푸시를 발송한다.
// 만료·Invalid(DeviceNotRegistered / web 404·410) 토큰은 발송 실패 시 삭제한다.
//
// 배포:
//   supabase functions deploy send-push
// 시크릿:
//   supabase secrets set PUSH_WEBHOOK_SECRET=xxxx
//   (선택) supabase secrets set EXPO_ACCESS_TOKEN=xxxx

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  isExpoToken,
  isWebSubscription,
  sendExpoAndPrune,
  sendWebAndPrune,
} from '../_shared/pushSend.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUSH_WEBHOOK_SECRET = Deno.env.get('PUSH_WEBHOOK_SECRET');
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN');
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:drop@dgist.ac.kr';

interface Payload {
  user_id?: string;
  title?: string;
  message?: string;
  kind?: string;
  record?: { user_id?: string; title?: string; message?: string; kind?: string };
}

function isAuthorized(req: Request): boolean {
  const auth = req.headers.get('Authorization') ?? '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (bearer && bearer === SERVICE_ROLE_KEY) return true;
  if (PUSH_WEBHOOK_SECRET && bearer === PUSH_WEBHOOK_SECRET) return true;
  const secretHeader = req.headers.get('X-Push-Webhook-Secret');
  if (PUSH_WEBHOOK_SECRET && secretHeader === PUSH_WEBHOOK_SECRET) return true;
  return false;
}

Deno.serve(async (req) => {
  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  try {
    const body = (await req.json()) as Payload;
    const rec = body.record ?? body;
    const userId = rec.user_id;
    const title = rec.title ?? '알림';
    const message = rec.message ?? '';

    if (!userId) {
      return new Response(JSON.stringify({ error: 'user_id 없음' }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const kind = rec.kind ?? 'system';

    if (kind === 'coach') {
      const { data: pref } = await supabase
        .from('user_notification_prefs')
        .select('lesson_turn')
        .eq('user_id', userId)
        .maybeSingle();
      if (pref && (pref as { lesson_turn?: boolean }).lesson_turn === false) {
        return new Response(JSON.stringify({ sent: 0, skipped: 'lesson_turn_off' }), {
          status: 200,
        });
      }
    }

    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', userId);

    if (error) throw error;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const expoTokens = tokens
      .filter((t: { token: string }) => isExpoToken(t.token))
      .map((t: { token: string; platform?: string | null }) => ({
        token: t.token,
        platform: t.platform,
      }));
    const webTokens = tokens.map((t: { token: string }) => t.token).filter(isWebSubscription);

    const expoRes = await sendExpoAndPrune(
      supabase,
      expoTokens,
      title,
      message,
      kind,
      EXPO_ACCESS_TOKEN
    );
    const webRes = await sendWebAndPrune(supabase, webTokens, title, message, {
      subject: VAPID_SUBJECT,
      publicKey: VAPID_PUBLIC,
      privateKey: VAPID_PRIVATE,
    }, kind);

    return new Response(
      JSON.stringify({
        sent: expoRes.sent + webRes.sent,
        expo: expoRes.sent,
        web: webRes.sent,
        pruned: expoRes.pruned + webRes.pruned,
      }),
      {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
