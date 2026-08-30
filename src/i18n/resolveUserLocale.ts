import type { AppLocale } from '@/src/i18n/types';
import { useAuthStore } from '@/src/stores/authStore';
import { useLocaleStore } from '@/src/stores/localeStore';

/** 알림·문구 생성 시 대상 회원의 표시 언어 (없으면 ko) */
export function resolveUserLocale(userId?: string | null): AppLocale {
  const current = useAuthStore.getState().currentUser;
  if (userId && current?.id === userId) {
    return useLocaleStore.getState().locale;
  }
  if (userId) {
    const user = useAuthStore.getState().users.find((u) => u.id === userId);
    if (user?.preferredLocale === 'en' || user?.preferredLocale === 'ko') {
      return user.preferredLocale;
    }
  }
  return 'ko';
}
