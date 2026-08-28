import { isSupabaseEnabled } from '@/src/lib/supabase';
import { loadSupabaseAuthBundle, supabaseRestoreSession } from '@/src/services/supabase/auth';
import { loadSavedLogin } from '@/src/services/quickLogin';
import { fetchCourts, subscribeCourts, subscribeProfiles } from '@/src/services/supabase/courts';
import { fetchAllProfiles } from '@/src/services/supabase/profiles';
import { getSupabase } from '@/src/lib/supabase';
import { useAuthStore, useAppStore } from '@/src/stores/authStore';
import { useCourtStore, setRemoteCourtWriteEnabled } from '@/src/stores/courtStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useFriendStore } from '@/src/stores/friendStore';
import { usePointStore } from '@/src/stores/pointStore';
import { useLobbyStore } from '@/src/stores/lobbyStore';
import { useLessonStore } from '@/src/stores/lessonStore';
import { useCoachingStore } from '@/src/stores/coachingStore';
import { useAdminLogStore } from '@/src/stores/adminLogStore';
import { createEmptyCourts } from '@/src/services/courtService';
import { fetchOpenRegistration, fetchActivitySchedule, fetchSiteOverlays, fetchClubEvents, fetchLobbyExpiry, fetchEloFeaturesEnabled, fetchPeakHours, fetchReservationEnabled, fetchPointsFeaturesEnabled, purgeStaleGuestsRemote, subscribeClubFlags } from '@/src/services/supabase/club';
import { useActivityScheduleStore } from '@/src/stores/activityScheduleStore';
import { useSiteOverlayStore } from '@/src/stores/siteOverlayStore';
import { useClubEventStore } from '@/src/stores/clubEventStore';
import { useLobbyExpiryStore } from '@/src/stores/lobbyExpiryStore';
import { usePeakHoursStore } from '@/src/stores/peakHoursStore';
import { useFeatureFlagsStore } from '@/src/stores/featureFlagsStore';
import { useNotificationPrefsStore } from '@/src/stores/notificationPrefsStore';
import { useFriendPrefsStore } from '@/src/stores/friendPrefsStore';
import { afterSupabaseAuth } from '@/src/services/supabase/authBridge';

let courtsUnsub: (() => void) | null = null;
let profilesUnsub: (() => void) | null = null;
let clubFlagsUnsub: (() => void) | null = null;
let socialUnsubs: (() => void)[] = [];

/** 디자인용 mock 초기값 제거 — Supabase가 아직 채우지 않는 스토어 비우기 */
export function resetSupabaseSessionStores() {
  setRemoteCourtWriteEnabled(false);
  // mock 유저(지금 N명 등)가 하이드레이션 전에 깜빡이지 않도록 즉시 비움
  useAuthStore.setState({
    users: [],
    attendanceRecords: [],
    authHydrated: false,
  });
  useFriendStore.getState().hydrate({}, []);
  usePointStore.getState().hydrate([]);
  useLobbyStore.getState().hydrateRooms([]);
  useLessonStore.getState().hydrate([], []);
  useCoachingStore.getState().hydrate([]);
  useAdminLogStore.getState().hydrate([]);
  useNotificationStore.getState().hydrate({
    pendingMatches: [],
    matchHistory: [],
    cleaningLeaderboard: [],
    inbox: [],
  });
  useCourtStore.getState().hydrateCourts(createEmptyCourts());
}

/** Supabase 모드 앱 시작 — 세션·프로필·코트·Realtime */
export async function initSupabaseApp(): Promise<boolean> {
  if (!isSupabaseEnabled()) return false;

  resetSupabaseSessionStores();

  try {
    const open = await fetchOpenRegistration();
    useAppStore.setState({ openRegistration: open });
  } catch {
    /* keep default */
  }

  try {
    const eloOn = await fetchEloFeaturesEnabled();
    useFeatureFlagsStore.getState().setEloFeaturesEnabledLocal(eloOn);
  } catch {
    /* keep default */
  }

  try {
    const reservationOn = await fetchReservationEnabled();
    useFeatureFlagsStore.getState().setReservationEnabledLocal(reservationOn);
  } catch {
    /* keep default */
  }

  try {
    const pointsOn = await fetchPointsFeaturesEnabled();
    useFeatureFlagsStore.getState().setPointsFeaturesEnabledLocal(pointsOn);
  } catch {
    /* keep default */
  }

  try {
    const schedule = await fetchActivitySchedule();
    if (schedule?.length) {
      useActivityScheduleStore.getState().setScheduleLocal(schedule);
    }
  } catch {
    /* keep default */
  }

  try {
    const { fetchPushNotifySettings } = await import('@/src/services/supabase/pushSettings');
    await fetchPushNotifySettings();
  } catch {
    /* keep default */
  }

  try {
    const overlays = await fetchSiteOverlays();
    if (overlays) useSiteOverlayStore.getState().setLocal(overlays);
  } catch {
    /* keep default */
  }

  try {
    const events = await fetchClubEvents();
    if (events) useClubEventStore.getState().setLocal(events);
  } catch {
    /* keep default */
  }

  try {
    const { reconcileTodayAttendanceIntent } = await import(
      '@/src/services/attendanceIntentCleanup'
    );
    reconcileTodayAttendanceIntent();
  } catch {
    /* ignore */
  }

  try {
    const expiry = await fetchLobbyExpiry();
    if (expiry) useLobbyExpiryStore.getState().setLocal(expiry);
  } catch {
    /* keep default */
  }

  try {
    const peakHours = await fetchPeakHours();
    if (peakHours) usePeakHoursStore.getState().setLocal(peakHours);
  } catch {
    /* keep default */
  }

  const sessionUserId = await supabaseRestoreSession();
  const saved = await loadSavedLogin();
  const waitForConfirm = Boolean(saved?.pendingConfirm && sessionUserId);
  const bundle = await loadSupabaseAuthBundle(sessionUserId);

  const currentUser =
    sessionUserId && !waitForConfirm
      ? bundle.users.find((u) => u.id === sessionUserId) ?? null
      : null;

  useAuthStore.getState().hydrateAuth(
    bundle.users,
    [],
    currentUser?.id ?? null,
    null,
    {},
    null
  );

  useAuthStore.setState({
    currentUser,
    isAuthenticated: Boolean(currentUser),
    isGuestSession: currentUser?.membershipTier === 'guest',
    credentials: {},
  });

  const courts = await fetchCourts();
  if (courts.length) {
    useCourtStore.getState().hydrateCourts(courts);
  }
  // 서버 코트 로드 후에만 원격 upsert 허용 (mock 오염 방지)
  setRemoteCourtWriteEnabled(true);

  if (currentUser) {
    await bindSupabaseSession(
      currentUser.id,
      currentUser.membershipTier === 'admin' || !!currentUser.isAdmin || !!currentUser.isOperator
    );
    try {
      await purgeStaleGuestsRemote();
    } catch {
      /* 034 미적용이면 무시 */
    }
  }

  courtsUnsub?.();
  profilesUnsub?.();
  clubFlagsUnsub?.();

  courtsUnsub = subscribeCourts((next) => {
    useCourtStore.getState().hydrateCourts(next);
  });

  profilesUnsub = subscribeProfiles(async () => {
    try {
      const users = await fetchAllProfiles();
      const auth = useAuthStore.getState();
      const current = auth.currentUser?.id
        ? users.find((u) => u.id === auth.currentUser?.id) ?? null
        : null;
      useAuthStore.setState({
        users,
        currentUser: current,
        isGuestSession: current?.membershipTier === 'guest',
      });
    } catch {
      /* ignore */
    }
  });

  clubFlagsUnsub = subscribeClubFlags(() => {
    void (async () => {
      try {
        const [reservationOn, pointsOn, eloOn, schedule, events] = await Promise.all([
          fetchReservationEnabled(),
          fetchPointsFeaturesEnabled(),
          fetchEloFeaturesEnabled(),
          fetchActivitySchedule(),
          fetchClubEvents(),
        ]);
        const flags = useFeatureFlagsStore.getState();
        flags.setReservationEnabledLocal(reservationOn);
        flags.setPointsFeaturesEnabledLocal(pointsOn);
        flags.setEloFeaturesEnabledLocal(eloOn);
        if (schedule?.length) useActivityScheduleStore.getState().setScheduleLocal(schedule);
        if (events) useClubEventStore.getState().setLocal(events);
        const { reconcileTodayAttendanceIntent } = await import(
          '@/src/services/attendanceIntentCleanup'
        );
        reconcileTodayAttendanceIntent();
      } catch {
        /* ignore */
      }
      try {
        const { fetchPushNotifySettings } = await import('@/src/services/supabase/pushSettings');
        await fetchPushNotifySettings();
      } catch {
        /* ignore */
      }
    })();
  });

  getSupabase().auth.onAuthStateChange(async (event) => {
    if (event === 'SIGNED_OUT') {
      await afterSupabaseAuth(null);
      useAuthStore.setState({
        currentUser: null,
        isAuthenticated: false,
        isGuestSession: false,
        authHydrated: true,
      });
    }
  });

  useAuthStore.getState().setAuthHydrated();
  return true;
}

/** 로그인·세션 복구 후 사용자 데이터 hydrate + realtime 재구독 */
export async function bindSupabaseSession(userId: string, isAdmin: boolean) {
  await hydrateUserData(userId, isAdmin);
  setupSocialSubscriptions(userId, isAdmin);
}

/** 소셜·경기·알림 실시간 구독 — 변경 시 해당 스토어를 다시 불러옴 */
function setupSocialSubscriptions(userId: string, isAdmin: boolean) {
  socialUnsubs.forEach((fn) => fn());
  socialUnsubs = [];

  import('@/src/services/supabase/social')
    .then((social) => {
      socialUnsubs.push(
        social.subscribeFriendRequests(async () => {
          try {
            const { requests, friendships } = await social.fetchFriendData(userId);
            useFriendStore.getState().hydrate(friendships, requests);
          } catch (err) {
            console.warn('[friend] refetch failed', err);
          }
        })
      );
      socialUnsubs.push(
        social.subscribeCoachAnnouncements(async () => {
          try {
            useCoachingStore.getState().hydrate(await social.fetchCoachAnnouncements());
          } catch {
            /* ignore */
          }
        })
      );
      socialUnsubs.push(
        social.subscribeLessonQueue(async () => {
          try {
            useLessonStore.getState().hydrate([], await social.fetchLessonQueue());
          } catch {
            /* ignore */
          }
        })
      );
      socialUnsubs.push(
        social.subscribeTeamRooms(async () => {
          try {
            useLobbyStore.getState().hydrateRooms(await social.fetchTeamRooms());
            useLobbyStore.getState().expireStaleRooms();
          } catch {
            /* ignore */
          }
        })
      );
      socialUnsubs.push(
        social.subscribeNotifications(userId, async () => {
          try {
            const { fetchNotifications } = await import('@/src/services/supabase/notifications');
            useNotificationStore.setState({ inbox: await fetchNotifications(userId) });
          } catch {
            /* ignore */
          }
        })
      );
      socialUnsubs.push(
        social.subscribeMatchResults(async () => {
          try {
            const { fetchMatchResults } = await import('@/src/services/supabase/matches');
            const matches = await fetchMatchResults();
            useNotificationStore.setState({
              pendingMatches: matches.filter((m) => m.status === 'pending'),
              matchHistory: matches,
            });
          } catch {
            /* ignore */
          }
        })
      );
      void import('@/src/services/supabase/points').then((points) => {
        const reloadPoints = () => {
          void (async () => {
            try {
              const txs = isAdmin
                ? await points.fetchAllPointTransactions()
                : await points.fetchPointTransactions(userId);
              usePointStore.getState().hydrate(txs);
            } catch {
              /* ignore */
            }
          })();
        };
        socialUnsubs.push(
          isAdmin
            ? points.subscribeAllPointTransactions(reloadPoints)
            : points.subscribePointTransactions(userId, reloadPoints)
        );
        reloadPoints();
      });
      void import('@/src/services/supabase/attendance').then((attendance) => {
        const reload = () => {
          void (async () => {
            try {
              const records = isAdmin
                ? await attendance.fetchAllAttendance()
                : await attendance.fetchAttendance(userId);
              useAuthStore.setState({ attendanceRecords: records });
            } catch {
              /* ignore */
            }
          })();
        };
        socialUnsubs.push(
          isAdmin
            ? attendance.subscribeAllAttendance(reload)
            : attendance.subscribeAttendance(userId, reload)
        );
        reload();
      });
      socialUnsubs.push(
        social.subscribeCleaningSubmissions(async () => {
          try {
            const { fetchCleaningSubmissions } = await import('@/src/services/supabase/submissions');
            useNotificationStore.setState({
              cleaningLeaderboard: await fetchCleaningSubmissions(),
            });
          } catch {
            /* ignore */
          }
        })
      );
      if (isAdmin) {
        socialUnsubs.push(
          social.subscribeAdminLogs(async () => {
            try {
              const { fetchAdminLogs } = await import('@/src/services/supabase/adminLogs');
              useAdminLogStore.getState().hydrate(await fetchAdminLogs());
            } catch {
              /* ignore */
            }
          })
        );
      }
    })
    .catch((err) => console.warn('[realtime] social subscribe failed', err));
}

/** 로그인 사용자 기준 모든 로컬 스토어를 Supabase 데이터로 채움 */
async function hydrateUserData(userId: string, isAdmin: boolean) {
  const [
    { fetchPointTransactions, fetchAllPointTransactions },
    { fetchAttendance, fetchAllAttendance },
    { fetchMatchResults },
    { fetchCleaningSubmissions },
    { fetchNotifications },
    { fetchAdminLogs },
    social,
  ] = await Promise.all([
    import('@/src/services/supabase/points'),
    import('@/src/services/supabase/attendance'),
    import('@/src/services/supabase/matches'),
    import('@/src/services/supabase/submissions'),
    import('@/src/services/supabase/notifications'),
    import('@/src/services/supabase/adminLogs'),
    import('@/src/services/supabase/social'),
  ]);

  const results = await Promise.allSettled([
    isAdmin ? fetchAllPointTransactions() : fetchPointTransactions(userId),
    isAdmin ? fetchAllAttendance() : fetchAttendance(userId),
    fetchMatchResults(),
    fetchCleaningSubmissions(),
    fetchNotifications(userId),
    isAdmin ? fetchAdminLogs() : Promise.resolve([]),
    social.fetchFriendData(userId),
    social.fetchCoachAnnouncements(),
    social.fetchLessonQueue(),
    social.fetchTeamRooms(),
  ]);

  const [txRes, attRes, matchRes, cleanRes, notifRes, logRes, friendRes, coachRes, queueRes, roomRes] =
    results;

  if (txRes.status === 'fulfilled') {
    usePointStore.getState().hydrate(txRes.value);
  }
  if (attRes.status === 'fulfilled') {
    useAuthStore.setState({ attendanceRecords: attRes.value });
  }

  const matches = matchRes.status === 'fulfilled' ? matchRes.value : [];
  useNotificationStore.getState().hydrate({
    pendingMatches: matches.filter((m) => m.status === 'pending'),
    matchHistory: matches,
    cleaningLeaderboard: cleanRes.status === 'fulfilled' ? cleanRes.value : [],
    inbox: notifRes.status === 'fulfilled' ? notifRes.value : [],
  });

  if (logRes.status === 'fulfilled' && logRes.value.length) {
    useAdminLogStore.getState().hydrate(logRes.value);
  }

  if (friendRes.status === 'fulfilled') {
    useFriendStore.getState().hydrate(friendRes.value.friendships, friendRes.value.requests);
  }
  if (coachRes.status === 'fulfilled') {
    useCoachingStore.getState().hydrate(coachRes.value);
  }
  if (queueRes.status === 'fulfilled') {
    useLessonStore.getState().hydrate([], queueRes.value);
  }
  if (roomRes.status === 'fulfilled') {
    useLobbyStore.getState().hydrateRooms(roomRes.value);
    useLobbyStore.getState().expireStaleRooms();
  }

  await useNotificationPrefsStore.getState().hydrate(userId);
  await useFriendPrefsStore.getState().hydrateForUser(userId);
}

export function teardownSupabaseSubscriptions() {
  courtsUnsub?.();
  profilesUnsub?.();
  clubFlagsUnsub?.();
  socialUnsubs.forEach((fn) => fn());
  socialUnsubs = [];
  courtsUnsub = null;
  profilesUnsub = null;
  clubFlagsUnsub = null;
}
