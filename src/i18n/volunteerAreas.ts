import type { AppLocale } from '@/src/i18n/types';
import { getT } from '@/src/i18n/useI18n';

const CLEANING_KEYS = [
  'profile.areaCleaning13',
  'profile.areaCleaning46',
  'profile.areaCleaning79',
  'profile.areaCleaningShuttle',
  'profile.areaCleaningGear',
  'profile.areaCleaningLocker',
] as const;

const NET_KEYS = ['profile.areaNetSetup', 'profile.areaNetTeardown'] as const;

const SHUTTLECOCK_KEYS = ['profile.areaShuttlecockFrom', 'profile.areaShuttlecockTo'] as const;

export function getCleaningAreaLabels(locale: AppLocale): string[] {
  const t = getT(locale);
  return CLEANING_KEYS.map((key) => t(key));
}

export function getNetAreaLabels(locale: AppLocale): string[] {
  const t = getT(locale);
  return NET_KEYS.map((key) => t(key));
}

export function getShuttlecockCarryAreaLabels(locale: AppLocale): string[] {
  const t = getT(locale);
  return SHUTTLECOCK_KEYS.map((key) => t(key));
}
