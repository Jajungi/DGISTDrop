import { useCallback, useMemo } from 'react';
import type { FriendRequest } from '@/src/types';
import { useAuthStore } from '@/src/stores/authStore';
import { useFriendStore, type FriendState } from '@/src/stores/friendStore';
import { ACTIVITY_SCHEDULE } from '@/src/constants';
import { getActivitySchedule } from '@/src/stores/activityScheduleStore';
import { buildFriendGroups, sortByScheduledArrival } from '@/src/utils/friendsPresence';
import { getSeoulTodayKey } from '@/src/utils/dateFormat';

const EMPTY_FRIEND_IDS: string[] = [];
const EMPTY_REQUESTS: FriendRequest[] = [];

function getTodaySession() {
  const day = new Date().getDay();
  const sessions = getActivitySchedule();
  return sessions.find((s) => s.day === day) ?? sessions[0] ?? ACTIVITY_SCHEDULE[0];
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function filterIncoming(
  requests: FriendRequest[],
  userId: string,
  friendIds: string[]
): FriendRequest[] {
  const friends = new Set(friendIds);
  return requests
    .filter(
      (r) => r.status === 'pending' && r.toUserId === userId && !friends.has(r.fromUserId)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function filterOutgoing(
  requests: FriendRequest[],
  userId: string,
  friendIds: string[]
): FriendRequest[] {
  const friends = new Set(friendIds);
  return requests
    .filter(
      (r) => r.status === 'pending' && r.fromUserId === userId && !friends.has(r.toUserId)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function useFriendsPresence() {
  const currentUserId = useAuthStore((s) => s.currentUser?.id ?? null);
  const users = useAuthStore((s) => s.users);
  const attendanceRecords = useAuthStore((s) => s.attendanceRecords);

  const friendIdsSelector = useCallback(
    (s: FriendState) =>
      currentUserId ? s.friendships[currentUserId] ?? EMPTY_FRIEND_IDS : EMPTY_FRIEND_IDS,
    [currentUserId]
  );
  const friendIds = useFriendStore(friendIdsSelector);
  const friendRequests = useFriendStore((s) => s.friendRequests);

  const incomingRequests = useMemo(() => {
    if (!currentUserId) return EMPTY_REQUESTS;
    return filterIncoming(friendRequests, currentUserId, friendIds);
  }, [friendRequests, currentUserId, friendIds]);

  const outgoingRequests = useMemo(() => {
    if (!currentUserId) return EMPTY_REQUESTS;
    return filterOutgoing(friendRequests, currentUserId, friendIds);
  }, [friendRequests, currentUserId, friendIds]);

  const today = useMemo(() => getSeoulTodayKey(), []);
  const session = getTodaySession();
  const activityStart = `${pad(session.startHour)}:${pad(session.startMinute)}`;
  const activityEnd = `${pad(session.endHour)}:${pad(session.endMinute)}`;

  const groups = useMemo(
    () => buildFriendGroups(users, currentUserId ?? undefined, attendanceRecords, today, friendIds),
    [users, currentUserId, attendanceRecords, today, friendIds]
  );

  const allFriends = useMemo(() => {
    const idSet = new Set(friendIds);
    const list = users.filter(
      (u) => u.id !== currentUserId && idSet.has(u.id) && u.memberStatus === 'approved'
    );
    return sortByScheduledArrival(list);
  }, [users, currentUserId, friendIds]);

  return useMemo(
    () => ({
      ...groups,
      allFriends,
      incomingRequests,
      outgoingRequests,
      activityStart,
      activityEnd,
      today,
    }),
    [groups, allFriends, incomingRequests, outgoingRequests, activityStart, activityEnd, today]
  );
}
