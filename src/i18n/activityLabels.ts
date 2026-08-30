import type { AppLocale } from '@/src/i18n/types';
import { getT } from '@/src/i18n/useI18n';
import { formatHHMM } from '@/src/utils/activitySchedule';

const DAY_KEYS = [
  'guide.daySun',
  'guide.dayMon',
  'guide.dayTue',
  'guide.dayWed',
  'guide.dayThu',
  'guide.dayFri',
  'guide.daySat',
] as const;

export function getActivityDayLabelLocalized(day: number, locale: AppLocale): string {
  const t = getT(locale);
  return t(DAY_KEYS[day] ?? 'guide.daySun');
}

export function formatActivityScheduleLabelLocalized(
  sessions: {
    day: number;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
  }[],
  locale: AppLocale
): string {
  const t = getT(locale);
  if (!sessions.length) return t('guide.scheduleUnset');

  const byKey = new Map<string, number[]>();
  for (const s of sessions) {
    const key = `${formatHHMM(s.startHour, s.startMinute)}–${formatHHMM(s.endHour, s.endMinute)}`;
    const days = byKey.get(key) ?? [];
    if (!days.includes(s.day)) days.push(s.day);
    byKey.set(key, days);
  }

  return [...byKey.entries()]
    .map(([time, days]) => {
      const dayText = [...days]
        .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
        .map((d) => getActivityDayLabelLocalized(d, locale))
        .join('·');
      return t('guide.scheduleWeekly', { days: dayText, time });
    })
    .join(' · ');
}

export function formatCountdownLocalized(
  target: Date,
  locale: AppLocale,
  now: Date = new Date()
): string {
  const t = getT(locale);
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return '';
  const totalMin = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const minutes = totalMin % 60;
  if (days > 0) return t('guide.countdownDays', { days, hours });
  if (hours > 0) return t('guide.countdownHours', { hours, minutes });
  return t('guide.countdownMinutes', { minutes });
}
