import { PEAK_HOURS as DEFAULT_PEAK_HOURS } from '@/src/constants/points';

export const DEFAULT_PEAK_HOURS_LIST: number[] = [...DEFAULT_PEAK_HOURS];

export function normalizePeakHours(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [...DEFAULT_PEAK_HOURS_LIST];
  const hours = raw
    .map((v) => (typeof v === 'number' ? v : Number(v)))
    .filter((h) => Number.isInteger(h) && h >= 0 && h <= 23);
  const unique = [...new Set(hours)].sort((a, b) => a - b);
  return unique.length ? unique : [...DEFAULT_PEAK_HOURS_LIST];
}

export function formatPeakHoursLabel(hours: number[]): string {
  if (!hours.length) return '없음';
  return hours.map((h) => `${h}시`).join(' · ');
}
