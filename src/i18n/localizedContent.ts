import type { AppLocale } from '@/src/i18n/types';

export interface LocalizedCopy {
  title: string;
  titleEn?: string;
  message?: string;
  messageEn?: string;
  body?: string;
  bodyEn?: string;
}

export function localizedTitle(copy: LocalizedCopy, locale: AppLocale): string {
  if (locale === 'en' && copy.titleEn?.trim()) return copy.titleEn.trim();
  return copy.title;
}

export function localizedBody(copy: LocalizedCopy, locale: AppLocale): string {
  const ko = copy.body ?? copy.message ?? '';
  const en = copy.bodyEn ?? copy.messageEn;
  if (locale === 'en' && en?.trim()) return en.trim();
  return ko;
}
