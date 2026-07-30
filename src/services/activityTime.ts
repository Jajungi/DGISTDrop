import { getActivitySchedule } from '@/src/stores/activityScheduleStore';
import type { ActivitySession } from '@/src/types';

function schedule(): ActivitySession[] {
  return getActivitySchedule();
}

export function isActivityTime(now: Date = new Date()): boolean {
  const day = now.getDay();
  const sessions = schedule().filter((s) => s.day === day);
  if (!sessions.length) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return sessions.some((session) => {
    const startMinutes = session.startHour * 60 + session.startMinute;
    const endMinutes = session.endHour * 60 + session.endMinute;
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  });
}

export function getNextActivityTime(now: Date = new Date()): Date | null {
  const candidates: Date[] = [];
  const sessions = schedule();

  for (let offset = 0; offset < 7; offset++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + offset);
    const day = checkDate.getDay();
    for (const session of sessions.filter((s) => s.day === day)) {
      const activityStart = new Date(checkDate);
      activityStart.setHours(session.startHour, session.startMinute, 0, 0);
      if (activityStart > now) candidates.push(activityStart);
    }
  }

  candidates.sort((a, b) => a.getTime() - b.getTime());
  return candidates[0] ?? null;
}

export function getActivityTimeRemaining(now: Date = new Date()): string | null {
  if (!isActivityTime(now)) return null;

  const day = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const ends = schedule()
    .filter((s) => s.day === day)
    .map((s) => s.endHour * 60 + s.endMinute)
    .filter((end) => end >= currentMinutes);
  if (!ends.length) return null;
  const endMinutes = Math.max(...ends);

  const endDate = new Date(now);
  endDate.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

  const diff = endDate.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}시간 ${minutes}분 남음`;
}

export function formatCountdownToNext(next: Date, now: Date = new Date()): string {
  const diff = next.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}일 ${hours}시간 후`;
  if (hours > 0) return `${hours}시간 ${minutes}분 후`;
  return `${minutes}분 후`;
}

export function getActivityDayLabel(day: number): string {
  const labels = ['일', '월', '화', '수', '목', '금', '토'];
  return labels[day] ?? '';
}
