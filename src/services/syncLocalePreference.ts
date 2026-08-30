import type { AppLocale } from '@/src/i18n/types';
import { getSupabase, isSupabaseEnabled } from '@/src/lib/supabase';

/** 프로필·이 기기 푸시 토큰에 언어 선호를 저장 */
export async function syncPreferredLocaleRemote(
  userId: string,
  locale: AppLocale
): Promise<void> {
  if (!isSupabaseEnabled()) return;
  const client = getSupabase();
  const { error: profileErr } = await client
    .from('profiles')
    .update({ preferred_locale: locale, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (profileErr) {
    const msg = profileErr.message?.toLowerCase() ?? '';
    if (!msg.includes('preferred_locale') && !msg.includes('42703')) {
      console.warn('[locale] profile sync failed', profileErr);
    }
  }
  const { error: tokenErr } = await client
    .from('push_tokens')
    .update({ locale, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (tokenErr) {
    const msg = tokenErr.message?.toLowerCase() ?? '';
    if (!msg.includes('locale') && !msg.includes('42703')) {
      console.warn('[locale] push token sync failed', tokenErr);
    }
  }
}
