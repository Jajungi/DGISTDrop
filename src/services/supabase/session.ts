import { useLocaleStore } from '@/src/stores/localeStore';
import { bindAfterSupabaseAuth } from '@/src/services/supabase/authBridge';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import {
  bindSupabaseSession,
  resetSupabaseSessionStores,
  teardownSupabaseSubscriptions,
} from '@/src/services/supabase/init';
import type { User } from '@/src/types';

/** 로그인/게스트 입장 후 Supabase 데이터·realtime 구독 연결 */
export async function afterSupabaseAuth(user: User | null): Promise<void> {
  if (!isSupabaseEnabled()) return;
  if (user) {
    useLocaleStore.getState().applyLocaleFromProfile(user.preferredLocale);
    await bindSupabaseSession(user.id, user.membershipTier === 'admin' || !!user.isAdmin || !!user.isOperator);
    return;
  }
  teardownSupabaseSubscriptions();
  resetSupabaseSessionStores();
}

bindAfterSupabaseAuth(afterSupabaseAuth);
