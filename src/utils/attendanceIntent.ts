import type { User } from '@/src/types';
import { isActivityCancelledToday } from '@/src/stores/activityScheduleStore';
import { getSeoulTodayKey, isScheduleForToday, normalizeHHMM } from '@/src/utils/dateFormat';

export function todayAttendanceIntent(
  user: Pick<User, 'attendanceIntent' | 'attendanceIntentDate'> | null | undefined,
  today = getSeoulTodayKey()
): 'going' | 'not_going' | null {
  if (!user?.attendanceIntent || user.attendanceIntentDate !== today) return null;
  return user.attendanceIntent;
}

export function isGoingToday(
  user: Pick<User, 'attendanceIntent' | 'attendanceIntentDate' | 'memberStatus'> | null | undefined,
  today = getSeoulTodayKey()
): boolean {
  if (user?.memberStatus !== 'approved') return false;
  if (todayAttendanceIntent(user, today) !== 'going') return false;
  if (isActivityCancelledToday(today)) return false;
  return true;
}

/** 오늘 도착·퇴장 시각이 저장돼 있는지 */
export function hasArrivalTimeToday(
  user: Pick<User, 'scheduleDate' | 'scheduledStart'> | null | undefined,
  today = getSeoulTodayKey()
): boolean {
  if (!user?.scheduledStart || !normalizeHHMM(user.scheduledStart)) return false;
  return isScheduleForToday(user.scheduleDate, today);
}
