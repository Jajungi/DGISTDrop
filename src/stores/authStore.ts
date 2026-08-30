import { create } from 'zustand';
import type { GeoLocation, User, AttendanceRecord, MembershipTier, MemberStatus, LessonAccessStatus, RankTier } from '@/src/types';
import { MOCK_USERS, MOCK_ATTENDANCE } from '@/src/services/mockData';
import { AVATAR_COLORS, GYM_LOCATION, RANK_THRESHOLDS } from '@/src/constants';
import { isWithinGymFence } from '@/src/services/geoFence';
import { hashPassword, verifyPassword, seedDemoCredentials } from '@/src/services/authCredentials';
import { getAttendancePoints, getRankFromElo } from '@/src/services/points';
import { POINT_EARN, POINT_SPEND } from '@/src/constants/points';
import { applyPointChange, applyPointChangeLocalOnly } from '@/src/services/pointLedger';
import { persistAppState } from '@/src/services/persistGate';
import { runtime } from '@/src/stores/runtimeAccess';
import { recordAdminLog, recordAdminLogAsCurrentUser, recordAdminLogAsActor } from '@/src/services/adminLog';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import {
  supabaseLogin,
  supabaseLogout,
  supabaseRegister,
  supabaseGuestLogin,
  supabaseDeleteAccount,
  supabaseResumeRememberedSession,
  supabaseResolveSession,
  supabaseCompleteSocialSignup,
} from '@/src/services/supabase/auth';
import { signInWithSocialProvider } from '@/src/services/supabase/socialAuth';
import { consumeSocialAuthIntent, clearSocialSignupInProgress, setSocialSignupInProgress } from '@/src/services/supabase/socialAuthIntent';
import type { SocialAuthIntent } from '@/src/services/supabase/socialAuthIntent';
import { isIncompleteSocialSignup, isAppReadyMember } from '@/src/utils/socialSignup';
import type { SocialProvider } from '@/src/constants/socialAuth';
import { fetchAllProfiles, uploadAvatar, removeAvatar } from '@/src/services/supabase/profiles';
import { clearSavedLogin, loadSavedLogin, saveSavedLogin } from '@/src/services/quickLogin';
import { isActivityDay, isActivityTime } from '@/src/services/activityTime';
import { getSeoulTodayKey, isScheduleForToday, normalizeHHMM } from '@/src/utils/dateFormat';
import { INFINITE_DEV_POINTS } from '@/src/utils/responsive';
import {
  createLocalGuestUser,
  isGuestUser,
  validateGuestName,
} from '@/src/utils/guestAccess';
import { validateStudentId } from '@/src/utils/studentId';
import { saveGuestSession, clearGuestSession } from '@/src/services/guestSession';
import { afterSupabaseAuth } from '@/src/services/supabase/authBridge';
import { isOwnerStudentId } from '@/src/constants/roles';
import { isAdminUser } from '@/src/utils/staffAccess';
import { isPointsFeaturesEnabled } from '@/src/stores/featureFlagsStore';

function pickAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

/** 관리자 회원 관리 변경분을 Supabase 프로필에 반영 */
async function syncAdminProfileRemote(user: User | undefined): Promise<{ ok: boolean; message?: string }> {
  if (!user || !isSupabaseEnabled()) return { ok: true };
  try {
    const { adminUpdateProfileRemote } = await import('@/src/services/supabase/profiles');
    await adminUpdateProfileRemote(user);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : '프로필 동기화에 실패했어요.';
    console.warn('[profile] admin sync failed', message);
    return { ok: false, message };
  }
}

function todayKey() {
  return getSeoulTodayKey();
}

interface AuthState {
  currentUser: User | null;
  users: User[];
  isAuthenticated: boolean;
  /** 게스트(임시) 세션 — 포인트·친구·랭크 등 제한 */
  isGuestSession: boolean;
  authHydrated: boolean;
  peakResetDate: string | null;
  lastCleaningBonusMonth: string | null;
  credentials: Record<string, string>;
  login: (
    studentId: string,
    password: string,
    remember?: boolean
  ) => Promise<{ success: boolean; message: string }>;
  loginAsGuest: (name: string, remember?: boolean) => Promise<{ success: boolean; message: string }>;
  restoreSavedLogin: () => Promise<{ success: boolean; message: string }>;
  dismissSavedLogin: () => Promise<void>;
  logout: () => Promise<void>;
  register: (input: {
    studentId: string;
    name: string;
    password: string;
  }) => Promise<{ success: boolean; message: string }>;
  loginWithSocial: (
    provider: SocialProvider,
    intent?: SocialAuthIntent
  ) => Promise<{ success: boolean; message: string; needsSignup?: boolean }>;
  applySocialSession: () => Promise<{ success: boolean; message: string; needsSignup?: boolean }>;
  completeSocialSignup: (
    studentId: string,
    name: string,
    password: string
  ) => Promise<{ success: boolean; message: string }>;
  hydrateAuth: (
    users: User[],
    attendanceRecords: AttendanceRecord[],
    sessionUserId: string | null,
    peakResetDate: string | null,
    credentials: Record<string, string>,
    lastCleaningBonusMonth: string | null
  ) => void;
  setAuthHydrated: () => void;
  approveMember: (userId: string) => void;
  rejectMember: (userId: string) => void;
  deleteMyAccount: () => Promise<{ success: boolean; message: string }>;
  adminDeleteAccount: (
    userId: string,
    adminId: string
  ) => Promise<{ success: boolean; message: string }>;
  updateUserPoints: (userId: string, delta: number) => void;
  updateUserElo: (userId: string, delta: number) => void;
  syncUserRank: (userId: string) => void;
  incrementPeakReservations: (userId: string) => void;
  resetPeakReservationsIfNewDay: () => void;
  recordMatchStats: (winnerIds: string[], loserIds: string[]) => void;
  reverseMatchStats: (winnerIds: string[], loserIds: string[]) => void;
  adjustCleaningContributions: (userId: string, delta: number) => void;
  attendanceRecords: AttendanceRecord[];
  checkIn: (userId: string, options?: { skipGeoFence?: boolean }) => { success: boolean; message: string };
  adminRevokeAttendance: (
    recordId: string,
    adminId: string,
    reason?: string
  ) => { success: boolean; message: string };
  adminForceCheckIn: (
    userId: string,
    adminId: string
  ) => { success: boolean; message: string };
  adminSetUserAtGym: (
    userId: string,
    atGym: boolean,
    adminId: string
  ) => { success: boolean; message: string };
  updateUserSchedule: (
    userId: string,
    arrivalTime: string,
    endTime?: string
  ) => { success: boolean; message: string };
  requestLessonAccess: (userId: string) => { success: boolean; message: string };
  approveLessonAccess: (userId: string) => { success: boolean; message: string };
  rejectLessonAccess: (userId: string) => { success: boolean; message: string };
  updateUserProfile: (
    userId: string,
    patch: { avatarUri?: string | null }
  ) => Promise<{ success: boolean; message: string }>;
  setUserAtGym: (userId: string, atGym: boolean) => void;
  /** 로컬만: 전원 체육관 해제 (활동 종료 시). DB는 RPC로 맞춤 */
  clearAllAtGymLocal: () => void;
  canPerformMemberAction: (userId: string) => { allowed: boolean; reason?: string };
  setLastCleaningBonusMonth: (month: string) => void;
  /** Discord 스타일 회원 관리 */
  adminSetMembershipTier: (
    userId: string,
    tier: MembershipTier
  ) => Promise<{ success: boolean; message: string }>;
  adminSetMemberStatus: (
    userId: string,
    status: MemberStatus,
    reason?: string
  ) => { success: boolean; message: string };
  adminSetLessonStatus: (
    userId: string,
    status: LessonAccessStatus
  ) => { success: boolean; message: string };
  adminSetCoach: (userId: string, enabled: boolean) => { success: boolean; message: string };
  adminSetOperator: (userId: string, enabled: boolean) => { success: boolean; message: string };
  adminSetAdminRole: (userId: string, enabled: boolean) => Promise<{ success: boolean; message: string }>;
  setAttendanceIntent: (
    userId: string,
    intent: 'going' | 'not_going' | null
  ) => { success: boolean; message: string };
  /** 휴관·일정 변경 등으로 활동일이 아닌 날짜의 참석·도착 의사 제거 */
  clearAttendanceIntentsForDate: (dateISO: string) => void;
  adminAdjustPoints: (
    userId: string,
    delta: number,
    reason: string
  ) => { success: boolean; message: string };
  adminVerifyClubFee: (
    userId: string,
    adminId: string
  ) => { success: boolean; message: string };
  adminRevokeClubFee: (
    userId: string,
    adminId: string,
    reason?: string
  ) => { success: boolean; message: string };
  claimShuttlecock: (userId: string) => { success: boolean; message: string };
  adminAdjustElo: (userId: string, delta: number, reason: string) => { success: boolean; message: string };
  adminPlaceRank: (userId: string, rank: RankTier) => { success: boolean; message: string };
  adminSetAdminNote: (userId: string, note: string) => { success: boolean; message: string };
  adminSendSystemNotice: (
    userId: string,
    title: string,
    message: string
  ) => { success: boolean; message: string };
}

function normalizeUser(user: User): User {
  return {
    ...user,
    nickname: user.name,
    lessonStatus: user.lessonStatus ?? 'none',
    isCoach: user.isCoach ?? false,
  };
}

function normalizeUsers(users: User[]): User[] {
  return users.map(normalizeUser);
}

function syncCurrentUser(users: User[], currentId: string | null): User | null {
  if (!currentId) return null;
  return users.find((u) => u.id === currentId) ?? null;
}

function removeUserFromState(
  set: (fn: (state: AuthState) => Partial<AuthState>) => void,
  get: () => AuthState,
  userId: string,
  studentId: string
) {
  set((state) => {
    const { [studentId]: _removed, ...restCredentials } = state.credentials;
    const users = state.users.filter((u) => u.id !== userId);
    const isSelf = state.currentUser?.id === userId;
    return {
      users,
      credentials: restCredentials,
      currentUser: isSelf ? null : syncCurrentUser(users, state.currentUser?.id ?? null),
      isAuthenticated: isSelf ? false : state.isAuthenticated,
      isGuestSession: isSelf ? false : state.isGuestSession,
    };
  });
  if (!isSupabaseEnabled()) persistAppState();
}

async function persistRememberedAccount(
  remember: boolean,
  payload: {
    kind: 'member' | 'guest';
    name: string;
    studentId?: string;
    password?: string;
  }
): Promise<void> {
  if (!remember) {
    await clearSavedLogin();
    return;
  }
  await saveSavedLogin({
    kind: payload.kind,
    name: payload.name,
    studentId: payload.studentId,
    password: isSupabaseEnabled() ? undefined : payload.password,
    pendingConfirm: false,
  });
}

function canDeleteUser(
  users: User[],
  target: User,
  _actorId?: string
): { allowed: boolean; message?: string } {
  if (target.membershipTier === 'admin') {
    const adminCount = users.filter(
      (u) => u.membershipTier === 'admin' && u.memberStatus === 'approved'
    ).length;
    if (adminCount <= 1) {
      return { allowed: false, message: '마지막 관리자 계정은 삭제할 수 없어요.' };
    }
  }
  return { allowed: true };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  // Supabase 모드에서는 mock이 먼저 그려지지 않도록 빈 목록으로 시작
  users: isSupabaseEnabled() ? [] : MOCK_USERS,
  isAuthenticated: false,
  isGuestSession: false,
  authHydrated: false,
  peakResetDate: null,
  lastCleaningBonusMonth: null,
  credentials: seedDemoCredentials(
    isSupabaseEnabled() ? [] : MOCK_USERS.map((u) => u.studentId)
  ),

  setAuthHydrated: () => set({ authHydrated: true }),

  hydrateAuth: (users, attendanceRecords, sessionUserId, peakResetDate, credentials, lastCleaningBonusMonth) => {
    const normalized = normalizeUsers(users);
    const currentUser = syncCurrentUser(normalized, sessionUserId);
    set({
      users: normalized,
      attendanceRecords,
      currentUser,
      isAuthenticated: !!currentUser,
      isGuestSession: isGuestUser(currentUser),
      peakResetDate,
      credentials: seedDemoCredentials(
        normalized.map((u) => u.studentId),
        credentials
      ),
      lastCleaningBonusMonth,
      authHydrated: true,
    });
    get().resetPeakReservationsIfNewDay();
  },

  login: async (studentId, password, remember = false) => {
    const idCheck = validateStudentId(studentId);
    if (!idCheck.ok) {
      return { success: false, message: idCheck.message };
    }

    if (isSupabaseEnabled()) {
      const result = await supabaseLogin(idCheck.normalized, password);
      if (!result.success) return result;
      const users = await fetchAllProfiles();
      const user = users.find((u) => u.id === result.userId) ?? null;
      await clearGuestSession();
      set({ users, currentUser: user, isAuthenticated: Boolean(user), isGuestSession: false, credentials: {} });
      await afterSupabaseAuth(user);
      get().resetPeakReservationsIfNewDay();
      await persistRememberedAccount(remember, {
        kind: 'member',
        name: user?.name ?? idCheck.normalized,
        studentId: idCheck.normalized,
      });
      return { success: true, message: result.message };
    }

    const trimmed = idCheck.normalized;
    const user = get().users.find((u) => u.studentId === trimmed);
    if (!user) {
      return { success: false, message: '학번을 찾을 수 없어요. 회원가입을 먼저 해 주세요.' };
    }
    const storedHash = get().credentials[trimmed];
    if (!storedHash || !verifyPassword(password, storedHash)) {
      return { success: false, message: '비밀번호가 올바르지 않아요.' };
    }
    if (user.memberStatus === 'pending') {
      return { success: false, message: '가입 승인 대기 중이에요. 운영진 승인 후 로그인할 수 있어요.' };
    }
    if (user.memberStatus === 'rejected') {
      return { success: false, message: '가입이 거절되었어요. 운영진에게 문의해 주세요.' };
    }
    if (user.memberStatus === 'suspended') {
      return {
        success: false,
        message: user.suspendedReason
          ? `계정이 정지되었어요. 사유: ${user.suspendedReason}`
          : '계정이 정지되었어요. 운영진에게 문의해 주세요.',
      };
    }
    set({ currentUser: user, isAuthenticated: true, isGuestSession: false });
    persistAppState();
    await persistRememberedAccount(remember, {
      kind: 'member',
      name: user.name,
      studentId: trimmed,
      password,
    });
    return { success: true, message: `${user.name}님, 환영합니다!` };
  },

  loginAsGuest: async (name, remember = false) => {
    const validation = validateGuestName(name);
    if (!validation.ok) {
      return { success: false, message: validation.message ?? '이름을 확인해 주세요.' };
    }
    const trimmed = name.trim();

    if (isSupabaseEnabled()) {
      const result = await supabaseGuestLogin(trimmed);
      if (!result.success) return result;
      const users = await fetchAllProfiles();
      const user = users.find((u) => u.id === result.userId) ?? null;
      if (!user) {
        return { success: false, message: '게스트 프로필을 불러오지 못했어요.' };
      }
      await saveGuestSession({ userId: user.id, name: user.name });
      set({
        users,
        currentUser: user,
        isAuthenticated: true,
        isGuestSession: true,
        credentials: {},
      });
      await afterSupabaseAuth(user);
      get().resetPeakReservationsIfNewDay();
      await persistRememberedAccount(remember, { kind: 'guest', name: user.name });
      return { success: true, message: result.message };
    }

    const existing = get().users.find(
      (u) => u.membershipTier === 'guest' && u.name === trimmed
    );
    const guest = existing ?? createLocalGuestUser(trimmed, get().users.length);
    const users = existing ? get().users : [...get().users, guest];
    await saveGuestSession({ userId: guest.id, name: guest.name });
    set({
      users,
      currentUser: guest,
      isAuthenticated: true,
      isGuestSession: true,
    });
    persistAppState();
    await persistRememberedAccount(remember, { kind: 'guest', name: guest.name });
    return { success: true, message: `${guest.name}님, 게스트로 입장했어요.` };
  },

  restoreSavedLogin: async () => {
    const account = await loadSavedLogin();
    if (!account) {
      return { success: false, message: '저장된 계정이 없어요.' };
    }

    if (isSupabaseEnabled()) {
      const result = await supabaseResumeRememberedSession();
      if (!result.success) {
        await saveSavedLogin({ ...account, pendingConfirm: false });
        return result;
      }
      const users = await fetchAllProfiles();
      const user = users.find((u) => u.id === result.userId) ?? null;
      const guest = isGuestUser(user);
      if (guest && user) {
        await saveGuestSession({ userId: user.id, name: user.name });
      } else {
        await clearGuestSession();
      }
      set({
        users,
        currentUser: user,
        isAuthenticated: Boolean(user),
        isGuestSession: guest,
        credentials: {},
      });
      await afterSupabaseAuth(user);
      get().resetPeakReservationsIfNewDay();
      await persistRememberedAccount(true, {
        kind: guest ? 'guest' : 'member',
        name: user?.name ?? account.name,
        studentId: user?.studentId ?? account.studentId,
      });
      return { success: true, message: result.message };
    }

    if (account.kind === 'guest') {
      return get().loginAsGuest(account.name, true);
    }
    if (account.studentId && account.password) {
      return get().login(account.studentId, account.password, true);
    }
    return { success: false, message: '저장된 로그인을 사용할 수 없어요. 다시 입력해 주세요.' };
  },

  dismissSavedLogin: async () => {
    const saved = await loadSavedLogin();
    if (saved) {
      await saveSavedLogin({ ...saved, pendingConfirm: false });
    }
    if (isSupabaseEnabled()) await supabaseLogout();
  },

  logout: async () => {
    await clearSocialSignupInProgress();
    const saved = await loadSavedLogin();
    const keepRemembered = Boolean(saved);
    if (keepRemembered) {
      await saveSavedLogin({ ...saved!, pendingConfirm: true });
    } else if (isSupabaseEnabled()) {
      await supabaseLogout();
    }
    await clearGuestSession();
    await afterSupabaseAuth(null);
    set({
      currentUser: null,
      isAuthenticated: false,
      isGuestSession: false,
      authHydrated: true,
    });
    if (!isSupabaseEnabled()) persistAppState();
  },

  register: async ({ studentId, name, password }) => {
    const idCheck = validateStudentId(studentId);
    if (!idCheck.ok) {
      return { success: false, message: idCheck.message };
    }
    const normalizedId = idCheck.normalized;
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, message: '이름을 입력해 주세요.' };
    }
    if (password.trim().length < 6) {
      return { success: false, message: '비밀번호는 6자 이상이어야 해요.' };
    }

    if (isSupabaseEnabled()) {
      return supabaseRegister({
        studentId: normalizedId,
        name: trimmedName,
        password,
      });
    }

    if (get().users.some((u) => u.studentId === normalizedId)) {
      return { success: false, message: '이미 등록된 학번이에요. 로그인하거나 계정을 삭제한 뒤 다시 가입해 주세요.' };
    }

    const openRegistration = useAppStore.getState().openRegistration;
    const newUser: User = {
      id: `user-${Date.now()}`,
      studentId: normalizedId,
      name: trimmedName,
      nickname: trimmedName,
      signupComplete: true,
      membershipTier: 'associate',
      memberStatus: openRegistration ? 'approved' : 'pending',
      rank: 'bronze',
      elo: 1000,
      points: 0,
      wins: 0,
      losses: 0,
      totalGames: 0,
      cleaningContributions: 0,
      peakTimeReservations: 0,
      lessonStatus: 'none',
      isAtGym: false,
      avatarColor: pickAvatarColor(get().users.length),
      createdAt: new Date().toISOString().slice(0, 10),
    };

    set((state) => ({
      users: [...state.users, newUser],
      credentials: {
        ...state.credentials,
        [normalizedId]: hashPassword(password),
      },
    }));
    persistAppState();
    return {
      success: true,
      message: openRegistration
        ? '회원가입이 완료됐어요. 바로 로그인할 수 있어요.'
        : '회원가입이 접수됐어요. 운영진 승인 후 로그인할 수 있어요.',
    };
  },

  applySocialSession: async () => {
    if (!isSupabaseEnabled()) {
      return { success: false, message: 'Supabase가 설정되지 않았어요.' };
    }
    const intent = await consumeSocialAuthIntent();
    const result = await supabaseResolveSession();
    if (!result.success || !result.userId) {
      return { success: false, message: result.message };
    }

    if (result.needsSignup) {
      if (intent === 'signup') {
        await setSocialSignupInProgress();
        const users = await fetchAllProfiles();
        const user = users.find((u) => u.id === result.userId) ?? null;
        await clearGuestSession();
        set({
          users,
          currentUser: user,
          isAuthenticated: Boolean(user),
          isGuestSession: false,
          credentials: {},
        });
        return {
          success: true,
          message: result.message,
          needsSignup: true,
        };
      }

      await clearSocialSignupInProgress();
      await supabaseLogout();
      set({
        currentUser: null,
        isAuthenticated: false,
        isGuestSession: false,
        credentials: {},
      });
      return {
        success: false,
        message:
          'Google·네이버 연동이 되어 있지 않아요. 설정에서 연동하거나 회원가입 탭에서 간편 회원가입을 이용하세요.',
      };
    }

    const users = await fetchAllProfiles();
    const user = users.find((u) => u.id === result.userId) ?? null;

    if (!isAppReadyMember(user)) {
      await clearSocialSignupInProgress();
      await supabaseLogout();
      set({
        currentUser: null,
        isAuthenticated: false,
        isGuestSession: false,
        credentials: {},
      });
      return {
        success: false,
        message:
          'Google·네이버 연동이 되어 있지 않아요. 설정에서 연동하거나 회원가입 탭에서 간편 회원가입을 이용하세요.',
      };
    }

    await clearGuestSession();
    set({
      users,
      currentUser: user,
      isAuthenticated: Boolean(user),
      isGuestSession: false,
      credentials: {},
    });
    await afterSupabaseAuth(user);
    get().resetPeakReservationsIfNewDay();
    return {
      success: true,
      message: result.message,
      needsSignup: false,
    };
  },

  loginWithSocial: async (provider, intent = 'login') => {
    if (!isSupabaseEnabled()) {
      return { success: false, message: 'Supabase가 설정되지 않았어요.' };
    }
    const oauth = await signInWithSocialProvider(provider, intent);
    if (!oauth.success) return oauth;
    return get().applySocialSession();
  },

  completeSocialSignup: async (studentId, name, password) => {
    if (!isSupabaseEnabled()) {
      return { success: false, message: 'Supabase가 설정되지 않았어요.' };
    }
    const result = await supabaseCompleteSocialSignup(studentId, name, password);
    if (!result.success) return result;

    await clearSocialSignupInProgress();

    const userId = get().currentUser?.id;
    const users = await fetchAllProfiles();
    const user = userId ? users.find((u) => u.id === userId) ?? null : null;
    set({ users, currentUser: user, isAuthenticated: Boolean(user), isGuestSession: false });
    await afterSupabaseAuth(user);
    get().resetPeakReservationsIfNewDay();

    if (user?.memberStatus === 'pending') {
      await supabaseLogout();
      set({ currentUser: null, isAuthenticated: false });
      return result;
    }

    return result;
  },

  approveMember: (userId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user || user.memberStatus !== 'pending') return;

    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, memberStatus: 'approved' as const } : u
      ),
    }));
    syncAdminProfileRemote(get().users.find((u) => u.id === userId));

    runtime().pushInbox({
      type: 'system',
      title: '회원 가입 승인',
      message: '회원 가입이 승인됐어요. Drop을 이용할 수 있습니다.',
      targetUserId: userId,
    });

    recordAdminLogAsCurrentUser({
      category: 'member',
      action: 'member.approve',
      message: `${user.name} 회원 가입 승인 (회비 인증 후 +${POINT_EARN.CLUB_FEE}P)`,
      targetId: userId,
      targetName: user.name,
    });
    persistAppState();
  },

  rejectMember: (userId) => {
    const user = get().users.find((u) => u.id === userId);
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, memberStatus: 'rejected' as const } : u
      ),
    }));
    syncAdminProfileRemote(get().users.find((u) => u.id === userId));
    if (user) {
      runtime().pushInbox({
        type: 'system',
        title: '회원 가입 거절',
        message: '회원 가입이 거절됐어요.',
        targetUserId: userId,
      });
      recordAdminLogAsCurrentUser({
        category: 'member',
        action: 'member.reject',
        message: `${user.name} 회원 가입 거절`,
        targetId: userId,
        targetName: user.name,
      });
    }
    persistAppState();
  },

  deleteMyAccount: async () => {
    const user = get().currentUser;
    if (!user) {
      return { success: false, message: '로그인이 필요해요.' };
    }
    const guard = canDeleteUser(get().users, user);
    if (!guard.allowed) {
      return { success: false, message: guard.message ?? '계정을 삭제할 수 없어요.' };
    }

    if (isSupabaseEnabled()) {
      const result = await supabaseDeleteAccount();
      if (!result.success) return result;
      await supabaseLogout();
      await clearGuestSession();
      await clearSavedLogin();
      const users = await fetchAllProfiles();
      set({
        users,
        currentUser: null,
        isAuthenticated: false,
        isGuestSession: false,
        credentials: {},
      });
      return result;
    }

    removeUserFromState(set, get, user.id, user.studentId);
    await clearSavedLogin();
    return { success: true, message: '계정이 삭제되었어요. 같은 학번으로 다시 가입할 수 있어요.' };
  },

  adminDeleteAccount: async (userId, adminId) => {
    const target = get().users.find((u) => u.id === userId);
    if (!target) {
      return { success: false, message: '회원을 찾을 수 없어요.' };
    }
    if (userId === adminId) {
      return { success: false, message: '본인 계정은 프로필에서 삭제해 주세요.' };
    }
    const guard = canDeleteUser(get().users, target, adminId);
    if (!guard.allowed) {
      return { success: false, message: guard.message ?? '계정을 삭제할 수 없어요.' };
    }

    if (isSupabaseEnabled()) {
      const result = await supabaseDeleteAccount(userId);
      if (!result.success) return result;
      const users = await fetchAllProfiles();
      set((state) => ({
        users,
        currentUser: syncCurrentUser(users, state.currentUser?.id ?? null),
        isAuthenticated: Boolean(syncCurrentUser(users, state.currentUser?.id ?? null)),
      }));
      recordAdminLogAsActor(adminId, {
        category: 'member',
        action: 'member.delete',
        message: `${target.name} (${target.studentId}) 계정 삭제`,
        targetId: userId,
        targetName: target.name,
      });
      return result;
    }

    removeUserFromState(set, get, userId, target.studentId);
    recordAdminLogAsActor(adminId, {
      category: 'member',
      action: 'member.delete',
      message: `${target.name} (${target.studentId}) 계정 삭제`,
      targetId: userId,
      targetName: target.name,
    });
    return { success: true, message: `${target.name}님 계정을 삭제했어요.` };
  },

  updateUserPoints: (userId, delta) =>
    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId ? { ...u, points: u.points + delta } : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      persistAppState();
      return { users, currentUser };
    }),

  updateUserElo: (userId, delta) =>
    set((state) => {
      const users = state.users.map((u) => {
        if (u.id !== userId) return u;
        const elo = u.elo + delta;
        return { ...u, elo, rank: getRankFromElo(elo) };
      });
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      persistAppState();
      return { users, currentUser };
    }),

  syncUserRank: (userId) =>
    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId ? { ...u, rank: getRankFromElo(u.elo) } : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      persistAppState();
      return { users, currentUser };
    }),

  adjustCleaningContributions: (userId, delta) =>
    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId
          ? { ...u, cleaningContributions: Math.max(0, u.cleaningContributions + delta) }
          : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      persistAppState();
      return { users, currentUser };
    }),

  incrementPeakReservations: (userId) =>
    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId ? { ...u, peakTimeReservations: u.peakTimeReservations + 1 } : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      persistAppState();
      return { users, currentUser };
    }),

  resetPeakReservationsIfNewDay: () => {
    const today = todayKey();
    if (get().peakResetDate === today) return;
    set((state) => ({
      peakResetDate: today,
      users: state.users.map((u) => ({ ...u, peakTimeReservations: 0 })),
      currentUser: state.currentUser
        ? { ...state.currentUser, peakTimeReservations: 0 }
        : null,
    }));
    if (isSupabaseEnabled()) {
      import('@/src/services/supabase/profiles')
        .then(({ resetPeakReservationsRemote }) => resetPeakReservationsRemote())
        .catch((err) => console.warn('[profile] peak reset failed', err));
    }
  },

  recordMatchStats: (winnerIds, loserIds) =>
    set((state) => {
      const bump = (u: User, won: boolean) => ({
        ...u,
        wins: u.wins + (won ? 1 : 0),
        losses: u.losses + (won ? 0 : 1),
        totalGames: u.totalGames + 1,
      });
      let users = state.users;
      winnerIds.forEach((id) => {
        users = users.map((u) => (u.id === id ? bump(u, true) : u));
      });
      loserIds.forEach((id) => {
        users = users.map((u) => (u.id === id ? bump(u, false) : u));
      });
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      persistAppState();
      return { users, currentUser };
    }),

  reverseMatchStats: (winnerIds, loserIds) =>
    set((state) => {
      const bump = (u: User, won: boolean) => ({
        ...u,
        wins: Math.max(0, u.wins - (won ? 1 : 0)),
        losses: Math.max(0, u.losses - (won ? 0 : 1)),
        totalGames: Math.max(0, u.totalGames - 1),
      });
      let users = state.users;
      winnerIds.forEach((id) => {
        users = users.map((u) => (u.id === id ? bump(u, true) : u));
      });
      loserIds.forEach((id) => {
        users = users.map((u) => (u.id === id ? bump(u, false) : u));
      });
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      persistAppState();
      return { users, currentUser };
    }),

  attendanceRecords: isSupabaseEnabled() ? [] : MOCK_ATTENDANCE,

  checkIn: (userId, options) => {
    if (!isActivityTime()) {
      return {
        success: false,
        message: '지금은 활동 시간이 아니라 출석이 취소됐어요.',
      };
    }
    if (!options?.skipGeoFence && !useAppStore.getState().checkGeoFence()) {
      return {
        success: false,
        message: `${GYM_LOCATION.name} 반경 ${GYM_LOCATION.radiusMeters}m 안에서만 출석할 수 있어요.`,
      };
    }
    const today = todayKey();
    const existing = get().attendanceRecords.find(
      (r) => r.userId === userId && r.date === today
    );
    if (existing) {
      return { success: false, message: '오늘은 이미 출석했어요.' };
    }
    const record: AttendanceRecord = {
      id: `att-${Date.now()}`,
      userId,
      date: today,
      checkedInAt: new Date().toISOString(),
    };
    set((state) => ({
      attendanceRecords: [record, ...state.attendanceRecords],
    }));

    const user = get().users.find((u) => u.id === userId);
    if (user) {
      const pts = getAttendancePoints(user.membershipTier);
      const isSelf = get().currentUser?.id === userId;
      const isAdminProxy = isSupabaseEnabled() && !isSelf;

      if (!isAdminProxy) {
        applyPointChangeLocalOnly(userId, pts, 'check_in', '체육관 출석 인증 (500m 내)');
      }
      get().setUserAtGym(userId, true);

      if (isSupabaseEnabled()) {
        if (isSelf) {
          const loc = useAppStore.getState().location;
          import('@/src/services/supabase/points')
            .then(({ checkInRemote }) => checkInRemote(loc?.latitude ?? null, loc?.longitude ?? null))
            .then(() =>
              import('@/src/services/supabase/attendance').then(({ fetchAttendance }) =>
                fetchAttendance(userId).then((records) =>
                  useAuthStore.setState({ attendanceRecords: records })
                )
              )
            )
            .catch((err) => console.warn('[attendance] check-in failed', err));
        } else {
          import('@/src/services/supabase/attendance')
            .then(({ adminCheckInRemote }) => adminCheckInRemote(userId))
            .then(() =>
              Promise.all([
                import('@/src/services/supabase/attendance').then(({ fetchAttendance }) =>
                  fetchAttendance(userId).then((records) =>
                    useAuthStore.setState({ attendanceRecords: records })
                  )
                ),
                import('@/src/services/supabase/points').then(({ fetchPointTransactions }) =>
                  fetchPointTransactions(userId).then((txs) =>
                    import('@/src/stores/pointStore').then(({ usePointStore }) =>
                      usePointStore.getState().hydrate(txs)
                    )
                  )
                ),
              ])
            )
            .catch((err) => console.warn('[attendance] admin check-in failed', err));
        }
      }
    }

    const ptsAwarded = user ? getAttendancePoints(user.membershipTier) : POINT_EARN.ATTENDANCE_ASSOCIATE;
    if (user) {
      recordAdminLog({
        category: 'attendance',
        action: 'attendance.check_in',
        message: `${user.name} 출석 인증 (+${ptsAwarded}P)`,
        actorId: userId,
        actorName: user.name,
        targetId: userId,
        targetName: user.name,
      });
    }
    persistAppState();
    return { success: true, message: `출석 완료! +${ptsAwarded}P 🏸` };
  },

  adminRevokeAttendance: (recordId, adminId, reason = '운영진 취소') => {
    const record = get().attendanceRecords.find((r) => r.id === recordId);
    if (!record) {
      return { success: false, message: '출석 기록을 찾을 수 없어요.' };
    }
    const user = get().users.find((u) => u.id === record.userId);

    set((state) => ({
      attendanceRecords: state.attendanceRecords.filter((r) => r.id !== recordId),
    }));

    if (user && record.date === todayKey()) {
      const pts = getAttendancePoints(user.membershipTier);
      applyPointChange(user.id, -pts, 'admin', `출석 취소 · ${reason}`);
      get().setUserAtGym(user.id, false);
    }

    if (isSupabaseEnabled()) {
      import('@/src/services/supabase/attendance')
        .then(({ revokeAttendanceRemote }) =>
          revokeAttendanceRemote({
            recordId,
            userId: record.userId,
            date: record.date,
          })
        )
        .catch((err) => console.warn('[attendance] revoke failed', err));
    }

    recordAdminLogAsActor(adminId, {
      category: 'attendance',
      action: 'attendance.revoke',
      message: `${user?.name ?? record.userId} 출석 취소 (${record.date})`,
      targetId: record.userId,
      targetName: user?.name,
      meta: { recordId },
    });
    persistAppState();
    return {
      success: true,
      message: `${user?.name ?? '회원'}님의 출석을 취소했어요.`,
    };
  },

  adminForceCheckIn: (userId, adminId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };
    if (user.memberStatus !== 'approved') {
      return { success: false, message: '승인된 회원만 출석 처리할 수 있어요.' };
    }

    const result = get().checkIn(userId, { skipGeoFence: true });
    if (!result.success) return result;

    recordAdminLogAsActor(adminId, {
      category: 'attendance',
      action: 'attendance.admin_check_in',
      message: `${user.name} 출석 대리 인증`,
      targetId: userId,
      targetName: user.name,
    });
    return { success: true, message: `${user.name}님 출석을 처리했어요.` };
  },

  adminSetUserAtGym: (userId, atGym, adminId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };
    get().setUserAtGym(userId, atGym);
    recordAdminLogAsActor(adminId, {
      category: 'attendance',
      action: 'attendance.set_at_gym',
      message: `${user.name} 체육관 ${atGym ? '도착' : '미도착'} 처리`,
      targetId: userId,
      targetName: user.name,
    });
    persistAppState();
    return {
      success: true,
      message: `${user.name}님을 ${atGym ? '체육관 도착' : '미도착'}으로 표시했어요.`,
    };
  },

  updateUserSchedule: (userId, arrivalTime, endTime) => {
    if (!isActivityDay()) {
      return {
        success: false,
        message: '오늘은 활동일이 아니에요. 참석·도착 시간을 저장하지 않았어요.',
      };
    }
    const start = normalizeHHMM(arrivalTime.trim());
    if (!start) {
      return { success: false, message: '도착 시간을 HH:MM 형식으로 입력해 주세요. (예: 18:30)' };
    }
    const [sh, sm] = start.split(':').map(Number);
    if (sh > 23 || sm > 59) {
      return { success: false, message: '올바른 시간을 입력해 주세요.' };
    }

    let scheduledEnd: string | undefined;
    if (endTime?.trim()) {
      const end = normalizeHHMM(endTime.trim());
      if (!end) {
        return { success: false, message: '퇴장 시간을 HH:MM 형식으로 입력해 주세요.' };
      }
      const [eh, em] = end.split(':').map(Number);
      if (eh * 60 + em <= sh * 60 + sm) {
        return { success: false, message: '퇴장 시간은 도착 시간보다 늦어야 해요.' };
      }
      scheduledEnd = end;
    }

    const today = getSeoulTodayKey();
    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              scheduleDate: today,
              scheduledStart: start,
              scheduledEnd,
              attendanceIntent: 'going' as const,
              attendanceIntentDate: today,
            }
          : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    });
    if (isSupabaseEnabled()) {
      import('@/src/services/supabase/profiles')
        .then(({ syncProfilePatch }) =>
          syncProfilePatch(userId, {
            scheduleDate: today,
            scheduledStart: start,
            scheduledEnd,
            attendanceIntent: 'going',
            attendanceIntentDate: today,
          })
        )
        .catch((err) => console.warn('[profile] schedule sync failed', err));
    }
    persistAppState();
    return { success: true, message: `오늘 ${start} 도착으로 저장했어요.` };
  },

  requestLessonAccess: (userId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '사용자를 찾을 수 없어요.' };
    if (user.memberStatus !== 'approved') {
      return { success: false, message: '승인된 회원만 레슨 권한을 신청할 수 있어요.' };
    }
    if (user.lessonStatus === 'approved') {
      return { success: false, message: '이미 레슨 이용 권한이 있어요.' };
    }
    if (user.lessonStatus === 'pending') {
      return { success: false, message: '레슨 권한 승인 대기 중이에요.' };
    }

    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              lessonStatus: 'pending' as const,
              lessonRequestedAt: new Date().toISOString(),
            }
          : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    });
    syncAdminProfileRemote(get().users.find((u) => u.id === userId));
    recordAdminLog({
      category: 'lesson',
      action: 'lesson.request',
      message: `${user.name} 레슨 권한 신청`,
      actorId: userId,
      actorName: user.name,
      targetId: userId,
      targetName: user.name,
    });
    persistAppState();
    return {
      success: true,
      message: '레슨 권한 신청이 접수됐어요. 운영진 승인 후 이용할 수 있어요.',
    };
  },

  approveLessonAccess: (userId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user || user.lessonStatus !== 'pending') {
      return { success: false, message: '승인 대기 중인 레슨 신청이 없어요.' };
    }

    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId ? { ...u, lessonStatus: 'approved' as const } : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    });
    syncAdminProfileRemote(get().users.find((u) => u.id === userId));
    persistAppState();

    runtime().pushInbox({
      type: 'system',
      title: '레슨 권한 승인',
      message: '레슨 이용 권한이 부여됐어요. 대기열에 등록할 수 있습니다.',
      targetUserId: userId,
    });

    recordAdminLogAsCurrentUser({
      category: 'lesson',
      action: 'lesson.approve',
      message: `${user.name} 레슨 이용 권한 승인`,
      targetId: userId,
      targetName: user.name,
    });

    return { success: true, message: `${user.name}님에게 레슨 권한을 부여했어요.` };
  },

  rejectLessonAccess: (userId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user || user.lessonStatus !== 'pending') {
      return { success: false, message: '승인 대기 중인 레슨 신청이 없어요.' };
    }

    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId ? { ...u, lessonStatus: 'rejected' as const } : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    });
    syncAdminProfileRemote(get().users.find((u) => u.id === userId));
    persistAppState();

    runtime().pushInbox({
      type: 'system',
      title: '레슨 권한 거절',
      message: '레슨 이용 권한이 거절됐어요.',
      targetUserId: userId,
    });

    recordAdminLogAsCurrentUser({
      category: 'lesson',
      action: 'lesson.reject',
      message: `${user.name} 레슨 권한 신청 거절`,
      targetId: userId,
      targetName: user.name,
    });
    return { success: true, message: '레슨 권한 신청을 거절했어요.' };
  },

  updateUserProfile: async (userId, patch) => {
    if (isSupabaseEnabled() && 'avatarUri' in patch) {
      try {
        if (patch.avatarUri && !patch.avatarUri.startsWith('http')) {
          await uploadAvatar(userId, patch.avatarUri);
        } else if (patch.avatarUri === null) {
          await removeAvatar(userId);
        }
        const users = await fetchAllProfiles();
        const currentUser = syncCurrentUser(users, get().currentUser?.id ?? null);
        set({ users, currentUser });
        return {
          success: true,
          message: patch.avatarUri ? '프로필 사진이 저장되었어요.' : '프로필 사진을 삭제했어요.',
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : '프로필 사진 저장에 실패했어요.';
        return { success: false, message: msg };
      }
    }

    set((state) => {
      const users = state.users.map((u) => {
        if (u.id !== userId) return u;
        const next = { ...u };
        if ('avatarUri' in patch) {
          if (patch.avatarUri) next.avatarUri = patch.avatarUri;
          else delete next.avatarUri;
        }
        return next;
      });
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    });
    persistAppState();
    return { success: true, message: '프로필 사진이 저장되었어요.' };
  },

  setUserAtGym: (userId, atGym) =>
    set((state) => {
      const target = state.users.find((u) => u.id === userId);
      if (!target || target.isAtGym === atGym) return state;

      const users = state.users.map((u) =>
        u.id === userId ? { ...u, isAtGym: atGym } : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);

      if (isSupabaseEnabled()) {
        import('@/src/services/supabase/profiles')
          .then(({ syncProfilePatch }) => syncProfilePatch(userId, { isAtGym: atGym }))
          .catch((err) => console.warn('[profile] atGym sync failed', err));
      }
      return { users, currentUser };
    }),

  clearAllAtGymLocal: () =>
    set((state) => {
      if (!state.users.some((u) => u.isAtGym)) return state;
      const users = state.users.map((u) => (u.isAtGym ? { ...u, isAtGym: false } : u));
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    }),

  canPerformMemberAction: (userId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { allowed: false, reason: '사용자를 찾을 수 없어요.' };
    if (user.membershipTier === 'guest') {
      return { allowed: false, reason: '게스트는 이 기능을 사용할 수 없어요. 회원가입 후 이용해 주세요.' };
    }
    if (user.memberStatus !== 'approved') {
      if (user.memberStatus === 'suspended') {
        return { allowed: false, reason: '정지된 계정이에요. 운영진에게 문의해 주세요.' };
      }
      return { allowed: false, reason: '승인된 회원만 이용할 수 있어요.' };
    }
    return { allowed: true };
  },

  setLastCleaningBonusMonth: (month) => set({ lastCleaningBonusMonth: month }),

  adminSetMembershipTier: async (userId, tier) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };
    if (tier === 'admin') {
      return get().adminSetAdminRole(userId, true);
    }
    if (tier === 'guest') {
      return { success: false, message: '게스트 등급은 여기서 지정할 수 없어요.' };
    }

    const keepAdmin = isAdminUser(user);
    const keepOperator = !!user.isOperator || isOwnerStudentId(user.studentId);
    const prev = {
      membershipTier: user.membershipTier,
      isAdmin: user.isAdmin,
      isOperator: user.isOperator,
    };

    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              membershipTier: tier,
              isAdmin: keepAdmin,
              isOperator: keepOperator,
            }
          : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    });

    const sync = await syncAdminProfileRemote(get().users.find((u) => u.id === userId));
    if (!sync.ok) {
      set((state) => {
        const users = state.users.map((u) => (u.id === userId ? { ...u, ...prev } : u));
        const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
        return { users, currentUser };
      });
      return {
        success: false,
        message: sync.message ?? '등급 변경을 서버에 저장하지 못했어요.',
      };
    }

    const tierLabel = tier === 'full' ? '정회원' : '준회원';
    recordAdminLogAsCurrentUser({
      category: 'member',
      action: 'member.tier',
      message: `${user.name} 회원 등급 → ${tierLabel}`,
      targetId: userId,
      targetName: user.name,
      meta: { tier },
    });
    persistAppState();
    return { success: true, message: `${user.name}님을 ${tierLabel}(으)로 변경했어요. 관리자·운영자 권한은 그대로입니다.` };
  },

  adminSetMemberStatus: (userId, status, reason) => {
    const actor = get().currentUser;
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };
    if (user.membershipTier === 'admin' && status !== 'approved') {
      if (actor?.membershipTier !== 'admin') {
        return { success: false, message: '관리자 계정은 관리자만 정지·거절할 수 있어요.' };
      }
      const adminCount = get().users.filter(
        (u) => u.membershipTier === 'admin' && u.memberStatus === 'approved'
      ).length;
      if (adminCount <= 1 && user.memberStatus === 'approved') {
        return { success: false, message: '마지막 관리자 계정은 정지·거절할 수 없어요.' };
      }
    }

    const now = new Date().toISOString();
    set((state) => {
      const users = state.users.map((u) => {
        if (u.id !== userId) return u;
        const next: User = { ...u, memberStatus: status };
        if (status === 'suspended') {
          next.suspendedReason = reason?.trim() || '운영진에 의한 정지';
          next.suspendedAt = now;
        } else {
          delete next.suspendedReason;
          delete next.suspendedAt;
        }
        return next;
      });
      let currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      let isAuthenticated = state.isAuthenticated;
      if (state.currentUser?.id === userId && status !== 'approved') {
        currentUser = null;
        isAuthenticated = false;
      }
      return { users, currentUser, isAuthenticated };
    });
    syncAdminProfileRemote(get().users.find((u) => u.id === userId));

    const statusLabel =
      status === 'approved'
        ? '승인'
        : status === 'pending'
          ? '승인 대기'
          : status === 'suspended'
            ? '정지'
            : '거절';

    if (status === 'approved') {
      runtime().pushInbox({
        type: 'system',
        title: '회원 가입 승인',
        message: '회원 가입이 승인됐어요. Drop을 이용할 수 있습니다.',
        targetUserId: userId,
      });
    } else if (status === 'rejected') {
      runtime().pushInbox({
        type: 'system',
        title: '회원 가입 거절',
        message: '회원 가입이 거절됐어요.',
        targetUserId: userId,
      });
    } else if (status === 'suspended') {
      runtime().pushInbox({
        type: 'system',
        title: '계정 정지',
        message: reason?.trim()
          ? `계정이 정지됐어요. 사유: ${reason.trim()}`
          : '계정이 정지됐어요.',
        targetUserId: userId,
      });
    }

    recordAdminLogAsCurrentUser({
      category: 'member',
      action: `member.status.${status}`,
      message: `${user.name} 계정 상태 → ${statusLabel}${reason ? ` (${reason})` : ''}`,
      targetId: userId,
      targetName: user.name,
    });
    persistAppState();
    return { success: true, message: `${user.name}님의 계정 상태를 변경했어요.` };
  },

  adminSetLessonStatus: (userId, status) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };

    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              lessonStatus: status,
              lessonRequestedAt:
                status === 'pending' ? new Date().toISOString() : u.lessonRequestedAt,
            }
          : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    });
    syncAdminProfileRemote(get().users.find((u) => u.id === userId));

    const label =
      status === 'approved'
        ? '레슨 권한 부여'
        : status === 'rejected'
          ? '레슨 권한 거절'
          : status === 'pending'
            ? '레슨 승인 대기'
            : '레슨 권한 초기화';
    recordAdminLogAsCurrentUser({
      category: 'lesson',
      action: 'lesson.admin_set',
      message: `${user.name} ${label}`,
      targetId: userId,
      targetName: user.name,
    });
    persistAppState();
    return { success: true, message: `${user.name}님의 레슨 권한을 변경했어요.` };
  },

  adminSetCoach: (userId, enabled) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };

    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId ? { ...u, isCoach: enabled } : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    });
    syncAdminProfileRemote(get().users.find((u) => u.id === userId));

    runtime().pushInbox({
      type: 'system',
      title: enabled ? '코치 권한 부여' : '코치 권한 회수',
      message: enabled
        ? '코치 권한이 부여됐어요. 코칭 공지를 작성할 수 있습니다.'
        : '코치 권한이 회수됐어요.',
      targetUserId: userId,
    });

    recordAdminLogAsCurrentUser({
      category: 'lesson',
      action: enabled ? 'coach.grant' : 'coach.revoke',
      message: `${user.name} 코치 권한 ${enabled ? '부여' : '해제'}`,
      targetId: userId,
      targetName: user.name,
    });
    persistAppState();
    return {
      success: true,
      message: enabled
        ? `${user.name}님에게 코치 권한을 부여했어요.`
        : `${user.name}님의 코치 권한을 해제했어요.`,
    };
  },

  adminSetAdminRole: async (userId, enabled) => {
    const actor = get().currentUser;
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };
    if (!isAdminUser(actor) && !isOwnerStudentId(actor?.studentId)) {
      return { success: false, message: '관리자만 관리자 권한을 바꿀 수 있어요.' };
    }
    if (isOwnerStudentId(user.studentId) && !enabled) {
      return { success: false, message: '운영자 계정은 관리자 권한을 해제할 수 없어요.' };
    }
    if (!enabled) {
      const adminCount = get().users.filter((u) => isAdminUser(u) || u.isOperator).length;
      if (adminCount <= 1 && isAdminUser(user)) {
        return { success: false, message: '마지막 관리자 권한은 해제할 수 없어요.' };
      }
    }

    const prev = { isAdmin: user.isAdmin, membershipTier: user.membershipTier };
    const nextTier = user.membershipTier === 'admin' ? 'full' : user.membershipTier;

    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              isAdmin: enabled,
              membershipTier: nextTier,
              isOperator: !!u.isOperator || isOwnerStudentId(u.studentId),
            }
          : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    });

    const sync = await syncAdminProfileRemote(get().users.find((u) => u.id === userId));
    if (!sync.ok) {
      set((state) => {
        const users = state.users.map((u) => (u.id === userId ? { ...u, ...prev } : u));
        const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
        return { users, currentUser };
      });
      return { success: false, message: sync.message ?? '관리자 권한 저장에 실패했어요.' };
    }

    recordAdminLogAsCurrentUser({
      category: 'member',
      action: enabled ? 'admin.grant' : 'admin.revoke',
      message: `${user.name} 관리자 권한 ${enabled ? '부여' : '해제'}`,
      targetId: userId,
      targetName: user.name,
    });
    persistAppState();
    return {
      success: true,
      message: enabled
        ? `${user.name}님에게 관리자 권한을 줬어요.`
        : `${user.name}님의 관리자 권한을 해제했어요.`,
    };
  },

  setAttendanceIntent: (userId, intent) => {
    const today = getSeoulTodayKey();
    if (intent && !isActivityDay()) {
      return { success: false, message: '오늘은 활동일이 아니에요. 참석을 기록하지 않았어요.' };
    }
    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              attendanceIntent: intent,
              attendanceIntentDate: today,
              ...(intent === 'not_going'
                ? { scheduledStart: undefined, scheduledEnd: undefined, scheduleDate: today }
                : {}),
            }
          : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    });
    if (isSupabaseEnabled()) {
      import('@/src/services/supabase/profiles')
        .then(({ syncProfilePatch }) =>
          syncProfilePatch(userId, {
            attendanceIntent: intent,
            attendanceIntentDate: today,
            ...(intent === 'not_going'
              ? { scheduledStart: undefined, scheduledEnd: undefined, scheduleDate: today }
              : {}),
          })
        )
        .catch((err) => console.warn('[profile] attendance intent sync failed', err));
    }
    persistAppState();
    return {
      success: true,
      message:
        intent === 'going' ? '참석으로 표시했어요.' : intent === 'not_going' ? '불참으로 표시했어요.' : '참석 의사를 지웠어요.',
    };
  },

  clearAttendanceIntentsForDate: (dateISO) => {
    set((state) => {
      let changed = false;
      const users = state.users.map((u) => {
        const onDate =
          u.attendanceIntentDate === dateISO ||
          (u.scheduleDate != null && isScheduleForToday(u.scheduleDate, dateISO));
        if (!onDate) return u;
        changed = true;
        return {
          ...u,
          attendanceIntent: null,
          attendanceIntentDate: undefined,
          ...(u.scheduleDate != null && isScheduleForToday(u.scheduleDate, dateISO)
            ? { scheduleDate: undefined, scheduledStart: undefined, scheduledEnd: undefined }
            : {}),
        };
      });
      if (!changed) return state;
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    });
    persistAppState();
  },

  adminSetOperator: (userId, enabled) => {
    void userId;
    void enabled;
    return { success: false, message: '운영자 권한은 고정되어 화면에서 바꿀 수 없어요.' };
  },

  adminAdjustPoints: (userId, delta, reason) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };
    if (!Number.isFinite(delta) || delta === 0) {
      return { success: false, message: '0이 아닌 숫자를 입력해 주세요.' };
    }
    const trimmed = reason.trim();
    if (!trimmed) return { success: false, message: '조정 사유를 입력해 주세요.' };

    applyPointChange(userId, delta, 'admin', `운영진 조정 · ${trimmed}`);

    runtime().pushInbox({
      type: 'system',
      title: '포인트 조정',
      message: `운영진이 포인트를 조정했어요. (${delta >= 0 ? '+' : ''}${delta}P · ${trimmed})`,
      targetUserId: userId,
    });

    recordAdminLogAsCurrentUser({
      category: 'point',
      action: 'point.admin_adjust',
      message: `${user.name} 포인트 ${delta >= 0 ? '+' : ''}${delta}P (${trimmed})`,
      targetId: userId,
      targetName: user.name,
      meta: { delta },
    });
    persistAppState();
    return {
      success: true,
      message: `${user.name}님 포인트 ${delta >= 0 ? '+' : ''}${delta}P 반영`,
    };
  },

  adminVerifyClubFee: (userId, adminId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };
    if (user.memberStatus !== 'approved') {
      return { success: false, message: '승인된 회원만 회비 인증할 수 있어요.' };
    }
    if (user.clubFeeVerifiedAt) {
      return { success: false, message: '이미 회비 납부가 인증되었어요.' };
    }

    const verifiedAt = new Date().toISOString();
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId
          ? { ...u, clubFeeVerifiedAt: verifiedAt, clubFeeVerifiedBy: adminId }
          : u
      ),
      currentUser:
        state.currentUser?.id === userId
          ? {
              ...state.currentUser,
              clubFeeVerifiedAt: verifiedAt,
              clubFeeVerifiedBy: adminId,
            }
          : state.currentUser,
    }));
    syncAdminProfileRemote(get().users.find((u) => u.id === userId));

    applyPointChange(
      userId,
      POINT_EARN.CLUB_FEE,
      'club_fee',
      '동아리비 납부 인증 (웰컴 리워드)'
    );
    recordAdminLogAsActor(adminId, {
      category: 'point',
      action: 'point.club_fee',
      message: `${user.name} 회비 납부 인증 (+${POINT_EARN.CLUB_FEE}P)`,
      targetId: userId,
      targetName: user.name,
    });
    persistAppState();
    return {
      success: true,
      message: `${user.name}님 회비 인증 완료 (+${POINT_EARN.CLUB_FEE}P)`,
    };
  },

  adminRevokeClubFee: (userId, adminId, reason = '운영진 취소') => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };
    if (!user.clubFeeVerifiedAt) {
      return { success: false, message: '회비 인증 기록이 없어요.' };
    }

    const clubFeeTx = runtime()
      .getPointTransactions()
      .find(
        (t) =>
          t.userId === userId &&
          t.type === 'club_fee' &&
          t.amount > 0 &&
          !t.revokedAt
      );
    if (clubFeeTx) {
      runtime().revokePointTransaction(clubFeeTx.id, adminId, reason);
    } else {
      applyPointChange(userId, -POINT_EARN.CLUB_FEE, 'admin', `회비 인증 취소 · ${reason}`);
    }

    set((state) => ({
      users: state.users.map((u) => {
        if (u.id !== userId) return u;
        const next = { ...u };
        delete next.clubFeeVerifiedAt;
        delete next.clubFeeVerifiedBy;
        return next;
      }),
      currentUser:
        state.currentUser?.id === userId
          ? (() => {
              const next = { ...state.currentUser! };
              delete next.clubFeeVerifiedAt;
              delete next.clubFeeVerifiedBy;
              return next;
            })()
          : state.currentUser,
    }));
    syncAdminProfileRemote(get().users.find((u) => u.id === userId));

    recordAdminLogAsActor(adminId, {
      category: 'point',
      action: 'point.club_fee.revoke',
      message: `${user.name} 회비 인증 취소`,
      targetId: userId,
      targetName: user.name,
    });
    persistAppState();
    return { success: true, message: `${user.name}님 회비 인증을 취소했어요.` };
  },

  claimShuttlecock: (userId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '사용자를 찾을 수 없어요.' };

    const memberCheck = get().canPerformMemberAction(userId);
    if (!memberCheck.allowed) {
      return { success: false, message: memberCheck.reason ?? '수령할 수 없어요.' };
    }

    if (isPointsFeaturesEnabled()) {
      if (user.points < POINT_SPEND.SHUTTLECOCK) {
        return {
          success: false,
          message: `포인트가 부족해요. (필요: ${POINT_SPEND.SHUTTLECOCK}P)`,
        };
      }
      applyPointChange(
        userId,
        -POINT_SPEND.SHUTTLECOCK,
        'shuttlecock',
        '새 경기용 셔틀콕 수령'
      );
    }
    persistAppState();
    return {
      success: true,
      message: isPointsFeaturesEnabled()
        ? `셔틀콕 수령 완료 (-${POINT_SPEND.SHUTTLECOCK}P)`
        : '셔틀콕 수령 완료',
    };
  },

  adminAdjustElo: (userId, delta, reason) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };
    if (!Number.isFinite(delta) || delta === 0) {
      return { success: false, message: '0이 아닌 숫자를 입력해 주세요.' };
    }
    const trimmed = reason.trim();
    if (!trimmed) return { success: false, message: '조정 사유를 입력해 주세요.' };

    get().updateUserElo(userId, delta);
    get().syncUserRank(userId);
    const updated = get().users.find((u) => u.id === userId);
    if (updated && isSupabaseEnabled()) {
      import('@/src/services/supabase/profiles')
        .then(({ updateProfileStatsRemote }) =>
          updateProfileStatsRemote(userId, { elo: updated.elo, rank: updated.rank })
        )
        .catch((err) => console.warn('[profile] elo sync failed', err));
    }
    recordAdminLogAsCurrentUser({
      category: 'member',
      action: 'member.elo_adjust',
      message: `${user.name} Elo ${delta >= 0 ? '+' : ''}${delta} (${trimmed})`,
      targetId: userId,
      targetName: user.name,
      meta: { delta },
    });
    persistAppState();
    return {
      success: true,
      message: `${user.name}님 Elo ${delta >= 0 ? '+' : ''}${delta} 반영`,
    };
  },

  adminPlaceRank: (userId, rank) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };

    const startElo = RANK_THRESHOLDS[rank].min;
    set((state) => {
      const users = state.users.map((u) =>
        u.id === userId ? { ...u, elo: startElo, rank: getRankFromElo(startElo) } : u
      );
      const currentUser = syncCurrentUser(users, state.currentUser?.id ?? null);
      return { users, currentUser };
    });

    if (isSupabaseEnabled()) {
      import('@/src/services/supabase/profiles')
        .then(({ updateProfileStatsRemote }) =>
          updateProfileStatsRemote(userId, { elo: startElo, rank: getRankFromElo(startElo) })
        )
        .catch((err) => console.warn('[profile] rank placement sync failed', err));
    }

    recordAdminLogAsCurrentUser({
      category: 'member',
      action: 'member.rank_place',
      message: `${user.name} 시작 랭크 배치 → ${RANK_THRESHOLDS[rank].label} (Elo ${startElo})`,
      targetId: userId,
      targetName: user.name,
      meta: { rank, elo: startElo },
    });
    persistAppState();
    return {
      success: true,
      message: `${user.name}님을 ${RANK_THRESHOLDS[rank].label}(Elo ${startElo})에 배치했어요.`,
    };
  },

  adminSetAdminNote: (userId, note) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };

    set((state) => {
      const users = state.users.map((u) => {
        if (u.id !== userId) return u;
        const next = { ...u };
        const trimmed = note.trim();
        if (trimmed) next.adminNote = trimmed;
        else delete next.adminNote;
        return next;
      });
      return { users };
    });
    syncAdminProfileRemote(get().users.find((u) => u.id === userId));
    recordAdminLogAsCurrentUser({
      category: 'member',
      action: 'member.note',
      message: `${user.name} 운영 메모 ${note.trim() ? '저장' : '삭제'}`,
      targetId: userId,
      targetName: user.name,
    });
    persistAppState();
    return { success: true, message: '운영 메모를 저장했어요.' };
  },

  adminSendSystemNotice: (userId, title, message) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '회원을 찾을 수 없어요.' };
    const t = title.trim();
    const m = message.trim();
    if (!t || !m) return { success: false, message: '제목과 내용을 입력해 주세요.' };

    runtime().pushInbox({
      type: 'system',
      title: t,
      message: m,
      targetUserId: userId,
    });
    recordAdminLogAsCurrentUser({
      category: 'system',
      action: 'system.direct_message',
      message: `${user.name}에게 알림: ${t}`,
      targetId: userId,
      targetName: user.name,
    });
    return { success: true, message: `${user.name}님에게 알림을 보냈어요.` };
  },
}));

interface AppState {
  isActivityTime: boolean;
  activityRemaining: string | null;
  nextActivityTime: number | null;
  isAtGym: boolean;
  location: GeoLocation | null;
  locationError: string | null;
  demoMode: boolean;
  /** 개발자 모드: ON 시 대량 포인트 부여, OFF 시 원래 포인트로 복귀 */
  infinitePoints: boolean;
  infinitePointsSnapshot: number | null;
  /** 가입 즉시 승인 (OFF면 승인 대기) — 운영진 설정 */
  openRegistration: boolean;
  setActivityTime: (value: boolean) => void;
  setLocation: (location: GeoLocation | null) => void;
  setLocationError: (error: string | null) => void;
  setDemoMode: (value: boolean) => void;
  setInfinitePoints: (value: boolean) => void;
  setOpenRegistration: (value: boolean) => Promise<{ success: boolean; message: string }>;
  checkGeoFence: () => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  isActivityTime: true,
  activityRemaining: null,
  nextActivityTime: null,
  isAtGym: false,
  location: null,
  locationError: null,
  demoMode: false,
  infinitePoints: false,
  infinitePointsSnapshot: null,
  openRegistration: true,

  setActivityTime: (value) => {
    if (get().isActivityTime === value) return;
    set({ isActivityTime: value });
  },
  setLocation: (location) => {
    const atGym = location ? isWithinGymFence(location) : false;
    const demo = get().demoMode;
    set({ location, isAtGym: atGym || demo, locationError: null });
    const currentUser = useAuthStore.getState().currentUser;
    // 활동 시간 밖에서는 체육관 표시를 올리지 않음 (종료 후 잔상 방지)
    if (currentUser && !demo && get().isActivityTime) {
      useAuthStore.getState().setUserAtGym(currentUser.id, atGym);
    }
  },
  setLocationError: (error) => set({ locationError: error }),
  setDemoMode: (value) => {
    if (value) {
      set({
        demoMode: true,
        isAtGym: true,
        location: {
          latitude: GYM_LOCATION.latitude,
          longitude: GYM_LOCATION.longitude,
        },
        locationError: null,
      });
      return;
    }
    set({
      demoMode: false,
      isAtGym: false,
      location: null,
    });
  },
  setOpenRegistration: async (value) => {
    const prev = get().openRegistration;
    set({ openRegistration: value });
    if (isSupabaseEnabled()) {
      try {
        const { setOpenRegistrationRemote } = await import('@/src/services/supabase/club');
        await setOpenRegistrationRemote(value);
      } catch (err) {
        set({ openRegistration: prev });
        return {
          success: false,
          message: err instanceof Error ? err.message : '설정 저장에 실패했어요.',
        };
      }
    }
    return {
      success: true,
      message: value
        ? '가입 즉시 승인이 켜졌어요. 새 회원은 바로 이용할 수 있어요.'
        : '가입 즉시 승인이 꺼졌어요. 새 회원은 승인 대기가 됩니다.',
    };
  },
  setInfinitePoints: (value) => {
    if (get().infinitePoints === value) return;

    const auth = useAuthStore.getState();
    const user = auth.currentUser;
    if (!user) return;

    if (value) {
      const snapshot = user.points;
      set({ infinitePoints: true, infinitePointsSnapshot: snapshot });
      const delta = INFINITE_DEV_POINTS - snapshot;
      if (delta !== 0) {
        auth.adminAdjustPoints(user.id, delta, '개발자 무한 포인트 모드 ON');
      }
      return;
    }

    const snapshot = get().infinitePointsSnapshot;
    if (snapshot != null) {
      const current =
        useAuthStore.getState().users.find((u) => u.id === user.id)?.points ?? user.points;
      const delta = snapshot - current;
      if (delta !== 0) {
        auth.adminAdjustPoints(user.id, delta, '개발자 무한 포인트 모드 OFF (복귀)');
      }
    }
    set({ infinitePoints: false, infinitePointsSnapshot: null });
  },
  checkGeoFence: () => {
    const { demoMode, location } = get();
    if (demoMode) return true;
    if (!location) return false;
    return isWithinGymFence(location);
  },
}));
