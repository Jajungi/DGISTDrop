import type { AppNotification } from '@/src/types';
import type { AppLocale } from '@/src/i18n/types';
import { localizedBody, localizedTitle } from '@/src/i18n/localizedContent';

export function displayNotificationTitle(n: AppNotification, locale: AppLocale): string {
  return localizedTitle(n, locale);
}

export function displayNotificationMessage(n: AppNotification, locale: AppLocale): string {
  return localizedBody(n, locale);
}
