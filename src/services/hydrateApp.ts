import type { AppStateSnapshot } from '@/src/services/appPersistence';
import { seedDemoCredentials } from '@/src/services/authCredentials';
import { seedDemoFriendships } from '@/src/services/friendBootstrap';
import { processMonthlyCleaningBonus } from '@/src/services/cleaningBonus';
import { seedDemoAdminLogs } from '@/src/services/demoAdminLogs';
import { MOCK_COACH_ANNOUNCEMENTS } from '@/src/services/mockData';
import { loadCourts, loadRooms } from '@/src/services/persistence';
import { loadAppState } from '@/src/services/appPersistence';
import type { ServerSyncPayload } from '@/src/services/syncTypes';
import { useCourtStore } from '@/src/stores/courtStore';
import { useLobbyStore } from '@/src/stores/lobbyStore';
import { useAuthStore } from '@/src/stores/authStore';
import { useFriendStore } from '@/src/stores/friendStore';
import { usePointStore } from '@/src/stores/pointStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useLessonStore } from '@/src/stores/lessonStore';
import { useAdminLogStore } from '@/src/stores/adminLogStore';
import { useCoachingStore } from '@/src/stores/coachingStore';

function applyAppState(appState: AppStateSnapshot, options?: { skipCleaningBonus?: boolean }) {
  useAuthStore.getState().hydrateAuth(
    appState.users,
    appState.attendanceRecords,
    appState.sessionUserId,
    appState.peakResetDate,
    appState.credentials ?? {},
    appState.lastCleaningBonusMonth ?? null
  );
  useFriendStore.getState().hydrate(appState.friendships, appState.friendRequests);
  usePointStore.getState().hydrate(appState.pointTransactions);
  useNotificationStore.getState().hydrate({
    pendingMatches: appState.pendingMatches,
    matchHistory: appState.matchHistory,
    cleaningLeaderboard: appState.cleaningLeaderboard,
    inbox: appState.inbox,
    dismissedLiveAlertIds: appState.dismissedLiveAlertIds,
  });
  useLessonStore.getState().hydrate(appState.lessonApplications, appState.lessonQueue);
  useAdminLogStore.getState().hydrate(
    appState.adminLogs?.length ? appState.adminLogs : seedDemoAdminLogs()
  );
  useCoachingStore.getState().hydrate(
    appState.coachAnnouncements?.length
      ? appState.coachAnnouncements
      : MOCK_COACH_ANNOUNCEMENTS
  );

  if (!options?.skipCleaningBonus) {
    const bonusMonth = processMonthlyCleaningBonus(appState.lastCleaningBonusMonth ?? null);
    if (bonusMonth && bonusMonth !== appState.lastCleaningBonusMonth) {
      useAuthStore.getState().setLastCleaningBonusMonth(bonusMonth);
    }
  }
}

function applyDemoSeed() {
  const users = useAuthStore.getState().users;
  useAuthStore.getState().hydrateAuth(
    users,
    useAuthStore.getState().attendanceRecords,
    null,
    null,
    seedDemoCredentials(users.map((u) => u.studentId)),
    null
  );
  useFriendStore.getState().hydrate(seedDemoFriendships(users), []);
  useAdminLogStore.getState().hydrate(seedDemoAdminLogs());
  useCoachingStore.getState().hydrate(MOCK_COACH_ANNOUNCEMENTS);
}

/** 서버·동기화 페이로드로 스토어 갱신 */
export function hydrateFromSyncPayload(
  payload: ServerSyncPayload,
  options?: { skipCleaningBonus?: boolean }
) {
  if (payload.courts?.length) {
    useCourtStore.getState().hydrateCourts(payload.courts);
  }
  if (payload.rooms?.length) {
    useLobbyStore.getState().hydrateRooms(payload.rooms);
  }
  if (payload.appState) {
    applyAppState(payload.appState, options);
  }
}

export async function hydrateAppStateFromDisk(options?: { skipCleaningBonus?: boolean }) {
  const [savedCourts, savedRooms, appState] = await Promise.all([
    loadCourts(),
    loadRooms(),
    loadAppState(),
  ]);

  if (savedCourts?.length) {
    useCourtStore.getState().hydrateCourts(savedCourts);
  }
  if (savedRooms?.length) {
    useLobbyStore.getState().hydrateRooms(savedRooms);
  }

  if (appState) {
    applyAppState(appState, options);
    return;
  }

  applyDemoSeed();
}
