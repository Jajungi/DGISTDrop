import { getActivitySchedule, isActivityCancelledToday } from '@/src/stores/activityScheduleStore';
import { getSeoulTodayKey } from '@/src/utils/dateFormat';
import { useClubEventStore } from '@/src/stores/clubEventStore';
import { isClubEventActiveOn, todayLocalISODate } from '@/src/utils/siteOps';
import { parseHHMM } from '@/src/utils/activitySchedule';
import type { ActivitySession } from '@/src/types';

function schedule(): ActivitySession[] {
  return getActivitySchedule();
}

function defaultSessionTimes(): { startHour: number; startMinute: number; endHour: number; endMinute: number } {
  const sessions = schedule();
  if (sessions[0]) {
    return {
      startHour: sessions[0].startHour,
      startMinute: sessions[0].startMinute,
      endHour: sessions[0].endHour,
      endMinute: sessions[0].endMinute,
    };
  }
  return { startHour: 18, startMinute: 30, endHour: 21, endMinute: 50 };
}

function isClosedOn(dateISO: string): boolean {
  return useClubEventStore
    .getState()
    .events.some((e) => e.kind === 'closure' && isClubEventActiveOn(e, dateISO));
}

function hasExtraActivityOn(dateISO: string): boolean {
  return useClubEventStore
    .getState()
    .events.some((e) => e.kind === 'extra' && isClubEventActiveOn(e, dateISO));
}

export function isActivityDay(now: Date = new Date()): boolean {
  const dateISO = todayLocalISODate(now);
  if (isActivityCancelledToday(getSeoulTodayKey(now))) return false;
  if (isClosedOn(dateISO)) return false;
  if (hasExtraActivityOn(dateISO)) return true;
  const day = now.getDay();
  return schedule().some((s) => s.day === day);
}

export function isActivityTime(now: Date = new Date()): boolean {
  const dateISO = todayLocalISODate(now);
  if (isActivityCancelledToday(getSeoulTodayKey(now))) return false;
  if (isClosedOn(dateISO)) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (hasExtraActivityOn(dateISO)) {
    const t = defaultSessionTimes();
    const startMinutes = t.startHour * 60 + t.startMinute;
    const endMinutes = t.endHour * 60 + t.endMinute;
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  const day = now.getDay();
  const sessions = schedule().filter((s) => s.day === day);
  if (!sessions.length) return false;

  return sessions.some((session) => {
    const startMinutes = session.startHour * 60 + session.startMinute;
    const endMinutes = session.endHour * 60 + session.endMinute;
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  });
}

export function getNextActivityTime(now: Date = new Date()): Date | null {
  const candidates: Date[] = [];
  const sessions = schedule();
  const times = defaultSessionTimes();

  for (let offset = 0; offset < 21; offset++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + offset);
    const dateISO = todayLocalISODate(checkDate);
    if (isClosedOn(dateISO)) continue;
    if (offset === 0 && isActivityCancelledToday(getSeoulTodayKey(checkDate))) continue;

    const day = checkDate.getDay();
    const daySessions = hasExtraActivityOn(dateISO)
      ? [
          {
            day,
            startHour: times.startHour,
            startMinute: times.startMinute,
            endHour: times.endHour,
            endMinute: times.endMinute,
          },
        ]
      : sessions.filter((s) => s.day === day);

    for (const session of daySessions) {
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

  const dateISO = todayLocalISODate(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const day = now.getDay();
  const times = defaultSessionTimes();

  const ends = hasExtraActivityOn(dateISO)
    ? [times.endHour * 60 + times.endMinute]
    : schedule()
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

/** 오늘 활동 시작 시각. 활동일 아니면 null. */
export function getTodayActivityStart(now: Date = new Date()): Date | null {
  if (!isActivityDay(now)) return null;
  const dateISO = todayLocalISODate(now);
  const times = defaultSessionTimes();
  const day = now.getDay();
  const session = hasExtraActivityOn(dateISO)
    ? { startHour: times.startHour, startMinute: times.startMinute }
    : schedule().find((s) => s.day === day);
  if (!session) return null;
  const start = new Date(now);
  start.setHours(session.startHour, session.startMinute, 0, 0);
  return start;
}

/**
 * 활동일에 활동 푸시 시각(설정 notify_time)부터 활동 시작 시각까지.
 */
export function isBetweenNotifyAndActivityStart(notifyTime: string, now: Date = new Date()): boolean {
  const start = getTodayActivityStart(now);
  const parsed = parseHHMM(notifyTime);
  if (!start || !parsed) return false;
  const n = now.getHours() * 60 + now.getMinutes();
  const from = parsed.hour * 60 + parsed.minute;
  const to = start.getHours() * 60 + start.getMinutes();
  if (from > to) return false;
  return n >= from && n <= to;
}
