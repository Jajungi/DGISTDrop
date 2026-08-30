// Supabase Edge Function: translate-text
// 운영진 공지·푸시용 짧은 문구 번역 (MyMemory 무료 API)
// 배포: supabase functions deploy translate-text

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CHUNK_SIZE = 380;

async function translateChunk(text: string, from: string, to: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('translate failed');
  const json = await res.json();
  const out = json?.responseData?.translatedText;
  if (!out || typeof out !== 'string') throw new Error('translate empty');
  if (out.toUpperCase().includes('MYMEMORY WARNING')) throw new Error('translate quota');
  return out.trim();
}

async function translateLong(text: string, from: string, to: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (trimmed.length <= CHUNK_SIZE) return translateChunk(trimmed, from, to);
  const parts: string[] = [];
  let buf = '';
  for (const line of trimmed.split(/(\n+)/)) {
    if ((buf + line).length > CHUNK_SIZE && buf.trim()) {
      parts.push(await translateChunk(buf, from, to));
      buf = line;
    } else buf += line;
  }
  if (buf.trim()) parts.push(await translateChunk(buf, from, to));
  return parts.join('');
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const auth = req.headers.get('Authorization') ?? '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const isService = bearer === SERVICE_ROLE_KEY;

  if (!isService) {
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401);
    const { data: staffCheck, error: staffErr } = await userClient.rpc('is_staff');
    if (staffErr || !staffCheck) return json({ error: 'staff only' }, 403);
  }

  try {
    const body = (await req.json()) as { text?: string; from?: string; to?: string };
    const text = body.text ?? '';
    const from = body.from === 'en' ? 'en' : 'ko';
    const to = body.to === 'en' ? 'en' : 'ko';
    if (from === to) return json({ text: text.trim() });
    const translated = await translateLong(text, from, to);
    return json({ text: translated });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
