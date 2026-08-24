import type { User } from '@/src/types';
import { getSeoulTodayKey, isScheduleForToday, normalizeHHMM } from '@/src/utils/dateFormat';

export function todayAttendanceIntent(
  user: Pick<User, 'attendanceIntent' | 'attendanceIntentDate'> | null | undefined,
  today = getSeoulTodayKey()
): 'going' | 'not_going' | null {
  if (!user?.attendanceIntent) return null;
  if (user.attendanceIntentDate && user.attendanceIntentDate !== today) return null;
  return user.attendanceIntent;
}

export function isGoingToday(
  user: Pick<User, 'attendanceIntent' | 'attendanceIntentDate' | 'memberStatus'> | null | undefined,
  today = getSeoulTodayKey()
): boolean {
  return user?.memberStatus === 'approved' && todayAttendanceIntent(user, today) === 'going';
}

/** 오늘 도착·퇴장 시각이 저장돼 있는지 */
export function hasArrivalTimeToday(
  user: Pick<User, 'scheduleDate' | 'scheduledStart'> | null | undefined,
  today = getSeoulTodayKey()
): boolean {
  if (!user?.scheduledStart || !normalizeHHMM(user.scheduledStart)) return false;
  return isScheduleForToday(user.scheduleDate, today);
}
