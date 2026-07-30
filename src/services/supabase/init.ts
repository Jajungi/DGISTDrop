import { isSupabaseEnabled } from '@/src/lib/supabase';
import { loadSupabaseAuthBundle, supabaseRestoreSession } from '@/src/services/supabase/auth';
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
import { fetchOpenRegistration, fetchActivitySchedule, fetchSiteOverlays, fetchClubEvents } from '@/src/services/supabase/club';
import { useActivityScheduleStore } from '@/src/stores/activityScheduleStore';
import { useSiteOverlayStore } from '@/src/stores/siteOverlayStore';
import { useClubEventStore } from '@/src/stores/clubEventStore';

let courtsUnsub: (() => void) | null = null;
let profilesUnsub: (() => void) | null = null;
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
    const schedule = await fetchActivitySchedule();
    if (schedule?.length) {
      useActivityScheduleStore.getState().setScheduleLocal(schedule);
    }
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

  const sessionUserId = await supabaseRestoreSession();
  const bundle = await loadSupabaseAuthBundle(sessionUserId);

  const currentUser = sessionUserId
    ? bundle.users.find((u) => u.id === sessionUserId) ?? null
    : null;

  useAuthStore.getState().hydrateAuth(bundle.users, [], sessionUserId, null, {}, null);

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
      currentUser.membershipTier === 'admin' || !!currentUser.isOperator
    );
  }

  courtsUnsub?.();
  profilesUnsub?.();

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

  getSupabase().auth.onAuthStateChange(async (event) => {
    if (event === 'SIGNED_OUT') {
      await import('@/src/services/supabase/session').then(({ afterSupabaseAuth }) =>
        afterSupabaseAuth(null)
      );
      useAuthStore.setState({ currentUser: null, isAuthenticated: false, isGuestSession: false });
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
          } catch {
            /* ignore */
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
  }
}

export function teardownSupabaseSubscriptions() {
  courtsUnsub?.();
  profilesUnsub?.();
  socialUnsubs.forEach((fn) => fn());
  socialUnsubs = [];
  courtsUnsub = null;
  profilesUnsub = null;
}
