import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/src/stores/authStore';
import { useFriendStore } from '@/src/stores/friendStore';
import { useFriendPrefsStore } from '@/src/stores/friendPrefsStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { getTodayKey } from '@/src/utils/dateFormat';

/**
 * 구독한 친구가 isAtGym false→true 로 바뀌면 알림함(+로컬) 알림.
 * 기기 로컬 설정 · 하루 1회 중복 방지.
 */
export function useFriendArrivalWatch() {
  const currentUserId = useAuthStore((s) => s.currentUser?.id ?? null);
  const users = useAuthStore((s) => s.users);
  const friendships = useFriendStore((s) => s.friendships);
  const arrivalNotify = useFriendPrefsStore((s) => s.arrivalNotify);
  const hydrated = useFriendPrefsStore((s) => s.hydrated);
  const hydrate = useFriendPrefsStore((s) => s.hydrate);

  const prevGym = useRef<Record<string, boolean>>({});
  const primed = useRef(false);
  const notifiedToday = useRef<Set<string>>(new Set());
  const dayKey = useRef(getTodayKey());

  useEffect(() => {
    primed.current = false;
    prevGym.current = {};
  }, [currentUserId]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const today = getTodayKey();
    if (dayKey.current !== today) {
      dayKey.current = today;
      notifiedToday.current = new Set();
    }

    if (!hydrated || !currentUserId) return;

    const friendIds = new Set(friendships[currentUserId] ?? []);
    const watchIds = new Set(arrivalNotify[currentUserId] ?? []);
    const next: Record<string, boolean> = {};

    for (const u of users) {
      next[u.id] = !!u.isAtGym;
    }

    if (!primed.current) {
      prevGym.current = next;
      primed.current = true;
      return;
    }

    const prev = prevGym.current;
    for (const u of users) {
      if (u.id === currentUserId) continue;
      if (!friendIds.has(u.id) || !watchIds.has(u.id)) continue;
      const was = prev[u.id];
      const now = !!u.isAtGym;
      if (was === false && now === true) {
        const key = `${today}:${u.id}`;
        if (notifiedToday.current.has(key)) continue;
        notifiedToday.current.add(key);
        useNotificationStore.getState().pushInbox({
          type: 'friend',
          title: '친구 도착',
          message: `${u.name}님이 체육관에 도착했어요.`,
          targetUserId: currentUserId,
        });
        void import('@/src/services/localNotifications').then((m) =>
          m.pushLocalNotification('친구 도착', `${u.name}님이 체육관에 도착했어요.`)
        );
      }
    }

    prevGym.current = next;
  }, [users, currentUserId, friendships, arrivalNotify, hydrated]);
}
