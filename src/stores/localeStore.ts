import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { AppLocale } from '@/src/i18n/types';
import { syncPreferredLocaleRemote } from '@/src/services/syncLocalePreference';
import { useAuthStore } from '@/src/stores/authStore';

const LOCALE_KEY = 'drop-locale';

interface LocaleState {
  locale: AppLocale;
  hydrated: boolean;
  setLocale: (locale: AppLocale) => void;
  toggleLocale: () => void;
  /** 기기에 저장된 언어가 없을 때 프로필 선호 언어 적용 */
  applyLocaleFromProfile: (preferredLocale?: 'ko' | 'en') => void;
  hydrate: () => Promise<void>;
}

async function persistLocale(locale: AppLocale) {
  await AsyncStorage.setItem(LOCALE_KEY, locale);
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(LOCALE_KEY, locale);
  }
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.lang = locale === 'ko' ? 'ko' : 'en';
  }
}

function readWebLocale(): AppLocale | null {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return null;
  const v = localStorage.getItem(LOCALE_KEY);
  return v === 'en' || v === 'ko' ? v : null;
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: 'ko',
  hydrated: false,
  setLocale: (locale) => {
    set({ locale });
    void persistLocale(locale);
    const userId = useAuthStore.getState().currentUser?.id;
    if (userId) {
      useAuthStore.setState((state) => ({
        users: state.users.map((u) =>
          u.id === userId ? { ...u, preferredLocale: locale } : u
        ),
        currentUser:
          state.currentUser?.id === userId
            ? { ...state.currentUser, preferredLocale: locale }
            : state.currentUser,
      }));
      void syncPreferredLocaleRemote(userId, locale);
    }
  },
  toggleLocale: () => {
    const next: AppLocale = get().locale === 'ko' ? 'en' : 'ko';
    get().setLocale(next);
  },
  applyLocaleFromProfile: (preferredLocale?: 'ko' | 'en') => {
    if (preferredLocale !== 'en' && preferredLocale !== 'ko') return;
    const stored =
      Platform.OS === 'web' && typeof localStorage !== 'undefined'
        ? localStorage.getItem(LOCALE_KEY)
        : null;
    if (stored === 'en' || stored === 'ko') return;
    get().setLocale(preferredLocale);
  },
  hydrate: async () => {
    try {
      const stored =
        readWebLocale() ?? ((await AsyncStorage.getItem(LOCALE_KEY)) as AppLocale | null);
      const locale: AppLocale = stored === 'en' ? 'en' : 'ko';
      set({ locale, hydrated: true });
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.documentElement.lang = locale === 'ko' ? 'ko' : 'en';
      }
    } catch {
      set({ hydrated: true });
    }
  },
}));
