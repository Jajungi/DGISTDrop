import type { AppStateSnapshot } from './appPersistence';
import { useAuthStore } from '@/src/stores/authStore';
import { usePointStore } from '@/src/stores/pointStore';
import { useFriendStore } from '@/src/stores/friendStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useLessonStore } from '@/src/stores/lessonStore';
import { useAdminLogStore } from '@/src/stores/adminLogStore';
import { useCoachingStore } from '@/src/stores/coachingStore';

export function collectAppStateSnapshot(): AppStateSnapshot {
  const auth = useAuthStore.getState();
  const points = usePointStore.getState();
  const friends = useFriendStore.getState();
  const notif = useNotificationStore.getState();
  const lesson = useLessonStore.getState();
  const adminLog = useAdminLogStore.getState();
  const coaching = useCoachingStore.getState();

  return {
    sessionUserId: auth.currentUser?.id ?? null,
    users: auth.users,
    attendanceRecords: auth.attendanceRecords,
    friendships: friends.friendships,
    friendRequests: friends.friendRequests,
    pointTransactions: points.transactions,
    matchHistory: notif.matchHistory,
    pendingMatches: notif.pendingMatches,
    cleaningLeaderboard: notif.cleaningLeaderboard,
    inbox: notif.inbox,
    dismissedLiveAlertIds: notif.dismissedLiveAlertIds,
    lessonApplications: lesson.applications,
    lessonQueue: lesson.lessonQueue,
    peakResetDate: auth.peakResetDate,
    credentials: auth.credentials,
    lastCleaningBonusMonth: auth.lastCleaningBonusMonth,
    adminLogs: adminLog.logs,
    coachAnnouncements: coaching.announcements,
  };
}

export type { AppStateSnapshot };
