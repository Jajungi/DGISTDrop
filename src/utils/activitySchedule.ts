import { ACTIVITY_SCHEDULE } from '@/src/constants';
import type { ActivitySession } from '@/src/types';

export const DEFAULT_ACTIVITY_SCHEDULE: ActivitySession[] = ACTIVITY_SCHEDULE.map((s) => ({
  ...s,
}));

export function cloneSchedule(sessions: ActivitySession[]): ActivitySession[] {
  return sessions.map((s) => ({ ...s }));
}

export function normalizeSchedule(sessions: ActivitySession[]): ActivitySession[] {
  return sessions
    .map((s) => ({
      day: Math.max(0, Math.min(6, Math.round(Number(s.day)) || 0)),
      startHour: clampHour(s.startHour),
      startMinute: clampMinute(s.startMinute),
      endHour: clampHour(s.endHour),
      endMinute: clampMinute(s.endMinute),
    }))
    .filter((s) => toMinutes(s.endHour, s.endMinute) > toMinutes(s.startHour, s.startMinute))
    .sort((a, b) => a.day - b.day || toMinutes(a.startHour, a.startMinute) - toMinutes(b.startHour, b.startMinute));
}

export function parseHHMM(value: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function formatHHMM(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** 이용 안내·배너용 활동 일정 한 줄 요약 */
export function formatActivityScheduleLabel(
  sessions: { day: number; startHour: number; startMinute: number; endHour: number; endMinute: number }[],
  dayLabel: (day: number) => string = (d) => ['일', '월', '화', '수', '목', '금', '토'][d] ?? ''
): string {
  if (!sessions.length) return '활동 일정 미설정';

  const byKey = new Map<string, number[]>();
  for (const s of sessions) {
    const key = `${formatHHMM(s.startHour, s.startMinute)}–${formatHHMM(s.endHour, s.endMinute)}`;
    const days = byKey.get(key) ?? [];
    if (!days.includes(s.day)) days.push(s.day);
    byKey.set(key, days);
  }

  return [...byKey.entries()]
    .map(([time, days]) => {
      const dayText = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(dayLabel).join('·');
      return `매주 ${dayText} ${time}`;
    })
    .join(' · ');
}

function clampHour(n: number) {
  return Math.max(0, Math.min(23, Math.round(Number(n)) || 0));
}

function clampMinute(n: number) {
  const v = Math.round(Number(n)) || 0;
  if (v === 30 || v === 0) return v;
  return v < 15 ? 0 : v < 45 ? 30 : 0;
}

function toMinutes(h: number, m: number) {
  return h * 60 + m;
}
