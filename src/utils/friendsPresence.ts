import type { AttendanceRecord, User } from '@/src/types';
import { getEffectiveSchedule } from '@/src/utils/dateFormat';
import { getT } from '@/src/i18n/useI18n';
import { useLocaleStore } from '@/src/stores/localeStore';
import type { AppLocale } from '@/src/i18n/types';

export interface FriendGroups {
  onlineFriends: User[];
  offlineFriends: User[];
  othersCheckedIn: User[];
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** 도착 예정 시각 기준 정렬 (없으면 뒤로) — 오늘 일정만 반영 */
export function sortByScheduledArrival(users: User[]): User[] {
  return [...users].sort((a, b) => {
    const aStart = getEffectiveSchedule(a).start;
    const bStart = getEffectiveSchedule(b).start;
    if (!aStart && !bStart) return a.name.localeCompare(b.name);
    if (!aStart) return 1;
    if (!bStart) return -1;
    return toMinutes(aStart) - toMinutes(bStart);
  });
}

export function isCheckedInToday(userId: string, records: AttendanceRecord[], today: string): boolean {
  return records.some((r) => r.userId === userId && r.date === today);
}

export function buildFriendGroups(
  users: User[],
  currentUserId: string | undefined,
  attendanceRecords: AttendanceRecord[],
  today: string,
  friendIds: string[]
): FriendGroups {
  const friendIdSet = new Set(friendIds);
  const others = users.filter((u) => u.id !== currentUserId && u.memberStatus === 'approved');

  const friends = others.filter((u) => friendIdSet.has(u.id));
  const onlineFriends = sortByScheduledArrival(friends.filter((u) => u.isAtGym));
  const offlineFriends = sortByScheduledArrival(friends.filter((u) => !u.isAtGym));

  const othersCheckedIn = sortByScheduledArrival(
    others.filter(
      (u) =>
        !friendIdSet.has(u.id) &&
        (isCheckedInToday(u.id, attendanceRecords, today) || u.isAtGym)
    )
  );

  return { onlineFriends, offlineFriends, othersCheckedIn };
}

export function formatArrivalLabel(user: User, locale?: AppLocale): string | null {
  const { start } = getEffectiveSchedule(user);
  if (!start) return null;
  const loc = locale ?? useLocaleStore.getState().locale;
  return getT(loc)('friends.arrivalAt', { time: start });
}

export function formatScheduleRange(user: User): string | null {
  const { start, end } = getEffectiveSchedule(user);
  if (!start) return null;
  if (end) return `${start} – ${end}`;
  return start;
}
