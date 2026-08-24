// Supabase Edge Function: broadcast-push
// 배포: supabase functions deploy broadcast-push --no-verify-jwt
// JWT는 함수 안에서 검사한다. 게이트웨이 verify_jwt는 브라우저 OPTIONS를 막는다.
// 만료·Invalid 토큰은 발송 실패 시 push_tokens에서 삭제한다.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  isExpoToken,
  sendExpoAndPrune,
  sendWebAndPrune,
  splitWebTokensPerUser,
  deleteTokens,
} from '../_shared/pushSend.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN');
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:drop@dgist.ac.kr';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Payload {
  title?: string;
  message?: string;
  type?: string;
  sent_by?: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  const auth = req.headers.get('Authorization') ?? '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const isService = bearer === SERVICE_ROLE_KEY;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  if (!isService) {
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: 'unauthorized' }, 401);
    }

    let bodyPeek: Payload = {};
    try {
      bodyPeek = (await req.clone().json()) as Payload;
    } catch {
      bodyPeek = {};
    }
    const incomingType = bodyPeek.type ?? 'activity';

    const { data: staffCheck, error: staffErr } = await userClient.rpc('is_staff');
    if (incomingType === 'coach') {
      const { data: profile } = await userClient
        .from('profiles')
        .select('is_coach')
        .eq('id', userData.user.id)
        .maybeSingle();
      const isCoach = !!(profile as { is_coach?: boolean } | null)?.is_coach;
      if ((staffErr || !staffCheck) && !isCoach) {
        return json({ error: 'admin or coach only' }, 403);
      }
    } else if (staffErr || !staffCheck) {
      return json({ error: 'admin only' }, 403);
    }
  }

  try {
    const body = (await req.json()) as Payload;
    const title = body.title ?? 'Drop';
    const message = body.message ?? '';
    const type = body.type ?? 'activity';

    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('token, platform, user_id, updated_at, created_at');

    if (error) throw error;

    const approvedIds = new Set<string>();
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('member_status', 'approved');
    for (const p of profiles ?? []) approvedIds.add(p.id);

    const prefOff = new Set<string>();
    if (type === 'activity' || type === 'coach') {
      const col = type === 'activity' ? 'activity_evening' : 'coach_notice';
      const { data: prefs } = await supabase
        .from('user_notification_prefs')
        .select(`user_id, ${col}`);
      for (const row of prefs ?? []) {
        const r = row as { user_id: string; activity_evening?: boolean; coach_notice?: boolean };
        const enabled = type === 'activity' ? r.activity_evening : r.coach_notice;
        if (enabled === false) prefOff.add(r.user_id);
      }
    }

    const filtered = (tokens ?? []).filter(
      (t: { user_id: string }) => approvedIds.has(t.user_id) && !prefOff.has(t.user_id)
    );

    const expoTokens = filtered
      .filter((t: { token: string }) => isExpoToken(t.token))
      .map((t: { token: string; platform?: string | null }) => ({
        token: t.token,
        platform: t.platform,
      }));
    const { keep: webTokens, drop: extraWeb } = splitWebTokensPerUser(
      filtered as Array<{
        token: string;
        user_id: string;
        platform?: string | null;
        updated_at?: string | null;
        created_at?: string | null;
      }>
    );
    const extraPruned = await deleteTokens(supabase, extraWeb);

    const expoRes = await sendExpoAndPrune(
      supabase,
      expoTokens,
      title,
      message,
      type,
      EXPO_ACCESS_TOKEN
    );
    const webRes = await sendWebAndPrune(supabase, webTokens, title, message, {
      subject: VAPID_SUBJECT,
      publicKey: VAPID_PUBLIC,
      privateKey: VAPID_PRIVATE,
    }, type);
    const sent = expoRes.sent + webRes.sent;
    const pruned = expoRes.pruned + webRes.pruned + extraPruned;

    await supabase.from('push_notify_log').insert({
      type,
      title,
      message,
      recipient_count: sent,
      sent_by: body.sent_by ?? null,
    });

    return json({ sent, expo: expoRes.sent, web: webRes.sent, pruned });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
