import { useCallback, useMemo } from 'react';
import { useLocaleStore } from '@/src/stores/localeStore';
import { ko } from '@/src/i18n/locales/ko';
import { en } from '@/src/i18n/locales/en';
import { translate } from '@/src/i18n/translate';
import type { AppLocale } from '@/src/i18n/types';

const MESSAGES = { ko, en } as const;

export function useI18n() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const toggleLocale = useLocaleStore((s) => s.toggleLocale);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(MESSAGES[locale], key, params),
    [locale]
  );

  return useMemo(
    () => ({ locale, setLocale, toggleLocale, t }),
    [locale, setLocale, toggleLocale, t]
  );
}

export function getT(locale: AppLocale) {
  return (key: string, params?: Record<string, string | number>) =>
    translate(MESSAGES[locale], key, params);
}
