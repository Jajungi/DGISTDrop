import type { AppLocale } from '@/src/i18n/types';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import { getSupabase } from '@/src/lib/supabase';
import { tryPresetBilingualNotice, type BilingualNoticeCopy } from '@/src/i18n/noticePresets';

export type { BilingualNoticeCopy };

const CHUNK_SIZE = 380;

async function translateChunk(text: string, from: AppLocale, to: AppLocale): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed || from === to) return trimmed;

  if (isSupabaseEnabled()) {
    try {
      const { data, error } = await getSupabase().functions.invoke('translate-text', {
        body: { text: trimmed, from, to },
      });
      if (!error && data && typeof (data as { text?: string }).text === 'string') {
        const out = (data as { text: string }).text.trim();
        if (out) return out;
      }
    } catch {
      /* fallback below */
    }
  }

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${from}|${to}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('translate failed');
  const json = (await res.json()) as { responseData?: { translatedText?: string } };
  const out = json.responseData?.translatedText?.trim() ?? '';
  if (!out || out.toUpperCase().includes('MYMEMORY WARNING')) {
    throw new Error('translate quota');
  }
  return out;
}

async function translateLong(text: string, from: AppLocale, to: AppLocale): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (trimmed.length <= CHUNK_SIZE) return translateChunk(trimmed, from, to);

  const parts: string[] = [];
  let buf = '';
  for (const line of trimmed.split(/(\n+)/)) {
    if ((buf + line).length > CHUNK_SIZE && buf.trim()) {
      parts.push(await translateChunk(buf, from, to));
      buf = line;
    } else {
      buf += line;
    }
  }
  if (buf.trim()) parts.push(await translateChunk(buf, from, to));
  return parts.join('');
}

export async function translateText(
  text: string,
  from: AppLocale,
  to: AppLocale
): Promise<string> {
  return translateLong(text, from, to);
}

/** 작성 언어 기준으로 반대쪽을 자동 번역해 ko/en 필드를 채운다. */
export async function resolveBilingualNotice(params: {
  writeLocale: AppLocale;
  title: string;
  body: string;
}): Promise<BilingualNoticeCopy> {
  const title = params.title.trim();
  const body = params.body.trim();
  if (!title && !body) {
    return { title: '', body: '' };
  }

  const preset = tryPresetBilingualNotice({ title, body });
  if (preset) return preset;

  if (params.writeLocale === 'ko') {
    const [titleEn, bodyEn] = await Promise.all([
      title ? translateText(title, 'ko', 'en').catch(() => '') : Promise.resolve(''),
      body ? translateText(body, 'ko', 'en').catch(() => '') : Promise.resolve(''),
    ]);
    return {
      title: title || '공지',
      titleEn: titleEn || undefined,
      body,
      bodyEn: bodyEn || undefined,
    };
  }

  const [titleKo, bodyKo] = await Promise.all([
    title ? translateText(title, 'en', 'ko').catch(() => title) : Promise.resolve(''),
    body ? translateText(body, 'en', 'ko').catch(() => body) : Promise.resolve(''),
  ]);
  return {
    title: titleKo || title || 'Notice',
    titleEn: title || undefined,
    body: bodyKo || body,
    bodyEn: body || undefined,
  };
}
