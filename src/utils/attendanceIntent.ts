import type { User } from '@/src/types';
import { getSeoulTodayKey } from '@/src/utils/dateFormat';

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
