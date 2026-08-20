import { create } from 'zustand';
import type { ToastMessage, SirenAlert, MatchResult, CleaningSubmission, AppNotification, GameMode } from '@/src/types';
import {
  MOCK_MATCH_RESULTS,
  MOCK_CLEANING_LEADERBOARD,
} from '@/src/services/mockData';
import { calculateEloChange } from '@/src/services/elo';
import { isEloFeaturesEnabled } from '@/src/stores/featureFlagsStore';
import {
  calculateWinPoints,
  calculateLossPoints,
  calculateCleaningPoints,
  calculateNetSetupPoints,
} from '@/src/services/points';
import { AUTO_RATED_MATCH_DAILY_LIMIT } from '@/src/constants/points';
import { useAuthStore } from './authStore';
import { usePointStore } from './pointStore';
import { applyPointChange, applyPointChangeLocalOnly } from '@/src/services/pointLedger';
import { persistAppState } from '@/src/services/appState';
import { recordAdminLogAsActor } from '@/src/services/adminLog';
import { pushLocalNotification } from '@/src/services/localNotifications';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import { runWhenRemoteId } from '@/src/utils/localId';

type NotificationGet = () => NotificationState;
type NotificationSet = (
  partial:
    | Partial<NotificationState>
    | ((state: NotificationState) => Partial<NotificationState>)
) => void;

/** 랭크전 확정/철회 후 대상 회원 전적·엘로를 프로필에 반영 */
function syncMatchStatsRemote(matchId: string) {
  if (!isSupabaseEnabled()) return;
  runWhenRemoteId(
    () => {
      const state = useNotificationStore.getState();
      return (
        state.pendingMatches.find((m) => m.id === matchId)?.id ??
        state.matchHistory.find((m) => m.id === matchId)?.id ??
        matchId
      );
    },
    (remoteId) =>
      import('@/src/services/supabase/matches').then(({ syncMatchStatsRemote: sync }) =>
        sync(remoteId)
      )
  );
}

/** 경기 상태 변경(확정/취소/철회)을 Supabase 에 반영 (fire-and-forget) */
function syncMatchPatchRemote(matchId: string, patch: Partial<MatchResult>) {
  if (!isSupabaseEnabled()) return;
  runWhenRemoteId(
    () => {
      const state = useNotificationStore.getState();
      return (
        state.pendingMatches.find((m) => m.id === matchId)?.id ??
        state.matchHistory.find((m) => m.id === matchId)?.id ??
        matchId
      );
    },
    (remoteId) =>
      import('@/src/services/supabase/matches').then(({ updateMatchRemote }) =>
        updateMatchRemote(remoteId, patch)
      )
  );
}

/**
 * 승/패에 따라 Elo·전적·포인트를 실제로 반영하고, 적용된 Elo 변동을 반환한다.
 * (즉시 반영 경로와 관리자 승인 경로가 공유)
 */
function applyMatchOutcome(match: MatchResult, matchId: string): Record<string, number> {
  const authStore = useAuthStore.getState();
  const winners = match.winner === 'A' ? match.teamA : match.teamB;
  const losers = match.winner === 'A' ? match.teamB : match.teamA;
  const eloChanges: Record<string, number> = {};

  const winPts = calculateWinPoints();
  const lossPts = calculateLossPoints();

  winners.forEach((userId) => {
    const user = authStore.users.find((u) => u.id === userId);
    if (!user) return;
    const loserElos = losers.map((id) => authStore.users.find((u) => u.id === id)?.elo ?? 1000);
    const avgLoserElo = loserElos.reduce((a, b) => a + b, 0) / (loserElos.length || 1);
    const { winnerChange } = calculateEloChange(user.elo, avgLoserElo);
    if (isEloFeaturesEnabled()) {
      eloChanges[userId] = winnerChange;
      authStore.updateUserElo(userId, winnerChange);
    }
    if (winPts > 0) {
      applyPointChange(userId, winPts, 'match_win', '경기 승리 (팀원 지급)', { matchId });
    }
  });

  losers.forEach((userId) => {
    const user = authStore.users.find((u) => u.id === userId);
    if (!user) return;
    const winnerElos = winners.map((id) => authStore.users.find((u) => u.id === id)?.elo ?? 1000);
    const avgWinnerElo = winnerElos.reduce((a, b) => a + b, 0) / (winnerElos.length || 1);
    const { loserChange } = calculateEloChange(avgWinnerElo, user.elo);
    if (isEloFeaturesEnabled()) {
      eloChanges[userId] = loserChange;
      authStore.updateUserElo(userId, loserChange);
    }
    if (lossPts > 0) {
      applyPointChange(userId, lossPts, 'match_loss', '경기 참여 (위로 지급)', { matchId });
    }
  });

  authStore.recordMatchStats(winners, losers);
  return eloChanges;
}

/** 참가자 중 오늘 Elo가 반영된(확정) 경기 수의 최댓값 — 일일 한도 판단용 */
function ratedMatchesTodayForUsers(history: MatchResult[], userIds: string[]): number {
  const today = new Date().toDateString();
  let max = 0;
  for (const uid of userIds) {
    let count = 0;
    for (const m of history) {
      if (m.status !== 'confirmed' || !m.eloChanges) continue;
      if (new Date(m.playedAt).toDateString() !== today) continue;
      if (m.teamA.includes(uid) || m.teamB.includes(uid)) count += 1;
    }
    if (count > max) max = count;
  }
  return max;
}

/** 난타(친선)를 제외한 '경기'만 Elo·전적 반영 대상 */
function isRatedMode(gameMode?: GameMode): boolean {
  return gameMode !== 'nanta';
}

/** 청소·네트·콕 인증을 서버 검증 RPC(rpc_submit_cleaning)로 저장 — 서버가 포인트 금액을 강제 */
function syncCleaningRemote(
  set: NotificationSet,
  entry: CleaningSubmission
) {
  if (!isSupabaseEnabled()) return;
  const kind = (entry.kind ?? 'cleaning') === 'net_setup' ? 'net_setup' : 'cleaning';
  import('@/src/services/supabase/points')
    .then(({ submitCleaningRemote }) =>
      submitCleaningRemote(kind, entry.area, entry.participantCount ?? 1).then((remoteId) => {
        if (!remoteId) return;
        set((state) => ({
          cleaningLeaderboard: state.cleaningLeaderboard.map((c) =>
            c.id === entry.id ? { ...c, id: remoteId } : c
          ),
        }));
      })
    )
    .catch((err) => console.warn('[cleaning] submit failed', err));
}

function revokeServiceSubmission(
  get: NotificationGet,
  set: NotificationSet,
  submissionId: string,
  adminId: string,
  kind: 'cleaning' | 'net_setup',
  reason: string
) {
  const entry = get().cleaningLeaderboard.find(
    (c) => c.id === submissionId && !c.revokedAt && (c.kind ?? 'cleaning') === kind
  );
  if (!entry) {
    return {
      success: false,
      message: kind === 'cleaning' ? '취소할 청소 기록을 찾을 수 없어요.' : '취소할 네트 기록을 찾을 수 없어요.',
    };
  }

  const label = kind === 'cleaning' ? '청소 인증' : '네트 인증';
  const useRemote =
    isSupabaseEnabled() &&
    !submissionId.startsWith('clean-') &&
    !submissionId.startsWith('net-') &&
    !submissionId.startsWith('cock-');

  if (useRemote) {
    import('@/src/services/supabase/submissions')
      .then(({ revokeCleaningRemote }) => revokeCleaningRemote(submissionId, adminId, reason))
      .catch((err) => console.warn('[cleaning] revoke failed', err));
    useAuthStore.getState().updateUserPoints(entry.userId, -entry.points);
  } else {
    applyPointChange(entry.userId, -entry.points, 'admin', `${label} 취소 · ${reason}`);
  }

  if (kind === 'cleaning') {
    useAuthStore.setState((state) => ({
      users: state.users.map((u) =>
        u.id === entry.userId
          ? { ...u, cleaningContributions: Math.max(0, u.cleaningContributions - 1) }
          : u
      ),
      currentUser:
        state.currentUser?.id === entry.userId
          ? {
              ...state.currentUser,
              cleaningContributions: Math.max(0, state.currentUser.cleaningContributions - 1),
            }
          : state.currentUser,
    }));
  }

  const revokedAt = new Date().toISOString();
  set((state) => ({
    cleaningLeaderboard: state.cleaningLeaderboard.map((c) =>
      c.id === submissionId ? { ...c, revokedAt, revokedBy: adminId } : c
    ),
  }));
  recordAdminLogAsActor(adminId, {
    category: 'point',
    action: kind === 'cleaning' ? 'cleaning.revoke' : 'net_setup.revoke',
    message: `${entry.userName} ${label} 취소 (${entry.area})`,
    targetId: entry.userId,
    targetName: entry.userName,
  });
  persistAppState();
  return { success: true, message: `${label}을 취소하고 포인트를 회수했어요.` };
}

/** 경기 결과 제출 결과 — 즉시 Elo 반영 / 친선 / 승인 대기 구분 */
export interface MatchSubmitResult {
  /** 결과가 기록되었는지 (동점 등으로 무시되면 false) */
  recorded: boolean;
  /** Elo 반영 대상 경기인지 (난타=false) */
  rated: boolean;
  /** Elo·포인트가 즉시 반영되었는지 */
  applied: boolean;
  /** 일일 한도 초과로 관리자 승인이 필요한지 */
  requiresApproval: boolean;
}

interface NotificationState {
  toasts: ToastMessage[];
  siren: SirenAlert;
  pendingMatches: MatchResult[];
  matchHistory: MatchResult[];
  cleaningLeaderboard: CleaningSubmission[];
  inbox: AppNotification[];
  hydrate: (data: {
    pendingMatches: MatchResult[];
    matchHistory: MatchResult[];
    cleaningLeaderboard: CleaningSubmission[];
    inbox: AppNotification[];
  }) => void;
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  showSiren: (title: string, message: string) => void;
  hideSiren: () => void;
  confirmMatch: (matchId: string, adminId: string) => void;
  adminCancelPendingMatch: (
    matchId: string,
    adminId: string,
    reason?: string
  ) => { success: boolean; message: string };
  adminRevokeConfirmedMatch: (
    matchId: string,
    adminId: string,
    reason?: string
  ) => { success: boolean; message: string };
  adminRevokeCleaning: (
    submissionId: string,
    adminId: string,
    reason?: string
  ) => { success: boolean; message: string };
  adminRevokeNetSetup: (
    submissionId: string,
    adminId: string,
    reason?: string
  ) => { success: boolean; message: string };
  adminBroadcastNotice: (
    adminId: string,
    title: string,
    message: string
  ) => { success: boolean; message: string };
  submitMatchResult: (
    courtId: number,
    teamA: string[],
    teamB: string[],
    scoreA: number,
    scoreB: number,
    gameMode?: GameMode
  ) => MatchSubmitResult;
  submitCleaning: (submission: Omit<CleaningSubmission, 'id' | 'submittedAt' | 'points'>) => void;
  submitNetSetup: (submission: Omit<CleaningSubmission, 'id' | 'submittedAt' | 'points' | 'kind'>) => void;
  submitShuttlecockCarry: (submission: Omit<CleaningSubmission, 'id' | 'submittedAt' | 'points' | 'kind'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId?: string) => void;
  pushInbox: (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'> & { id?: string }) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  toasts: [],
  siren: { visible: false, title: '', message: '' },
  pendingMatches: MOCK_MATCH_RESULTS.filter((m) => m.status === 'pending'),
  matchHistory: MOCK_MATCH_RESULTS,
  cleaningLeaderboard: MOCK_CLEANING_LEADERBOARD,
  inbox: [
    {
      id: 'n1',
      type: 'join',
      title: '참가 요청',
      message: '서연님이 2번 코트 합류를 요청했어요',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      courtId: 2,
    },
    {
      id: 'n2',
      type: 'coach',
      title: '코칭 안내',
      message: '19:30 코치 코트 레슨이 곧 시작됩니다.',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
    {
      id: 'n3',
      type: 'system',
      title: '활동 안내',
      message: '오늘 정기 활동은 21:50까지입니다.',
      read: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
  ] as AppNotification[],

  hydrate: (data) =>
    set({
      pendingMatches: data.pendingMatches,
      matchHistory: data.matchHistory,
      cleaningLeaderboard: data.cleaningLeaderboard,
      inbox: data.inbox,
    }),

  showToast: (toast) => {
    const id = `toast-${Date.now()}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    setTimeout(() => get().dismissToast(id), toast.duration ?? 2500);
  },

  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  showSiren: (title, message) => {
    set({ siren: { visible: true, title, message } });
    void pushLocalNotification(title, message, 'coach');
  },

  hideSiren: () =>
    set({ siren: { visible: false, title: '', message: '' } }),

  confirmMatch: (matchId, adminId) => {
    const match = get().pendingMatches.find((m) => m.id === matchId);
    if (!match) return;

    const winners = match.winner === 'A' ? match.teamA : match.teamB;
    const losers = match.winner === 'A' ? match.teamB : match.teamA;

    const rated = isRatedMode(match.gameMode);
    const eloChanges = rated ? applyMatchOutcome(match, matchId) : undefined;

    const confirmedAt = new Date().toISOString();
    const patch = {
      status: 'confirmed' as const,
      confirmedBy: adminId,
      confirmedAt,
      eloChanges,
    };

    set((state) => ({
      pendingMatches: state.pendingMatches.map((m) =>
        m.id === matchId ? { ...m, ...patch } : m
      ),
      matchHistory: state.matchHistory.map((m) =>
        m.id === matchId ? { ...m, ...patch } : m
      ),
    }));
    syncMatchPatchRemote(matchId, patch);
    if (rated) syncMatchStatsRemote(matchId);

    const participants = [...match.teamA, ...match.teamB];
    for (const uid of participants) {
      get().pushInbox({
        type: 'system',
        title: '경기 확정',
        message:
          rated && isEloFeaturesEnabled()
            ? `코트 ${match.courtId} 경기가 확정됐어요. Elo가 반영됩니다.`
            : `코트 ${match.courtId} 경기가 확정됐어요.`,
        targetUserId: uid,
        courtId: match.courtId,
      });
    }

    recordAdminLogAsActor(adminId, {
      category: 'match',
      action: 'match.confirm',
      message: `코트 ${match.courtId} 경기 결과 확정 (A ${match.scoreA}:${match.scoreB} B)`,
      targetId: matchId,
      meta: { courtId: match.courtId },
    });
    persistAppState();
  },

  adminCancelPendingMatch: (matchId, adminId, reason = '운영진 취소') => {
    const match = get().pendingMatches.find((m) => m.id === matchId && m.status === 'pending');
    if (!match) {
      return { success: false, message: '취소할 대기 경기를 찾을 수 없어요.' };
    }
    const patch = {
      status: 'cancelled' as const,
      cancelledAt: new Date().toISOString(),
      cancelledBy: adminId,
      cancelReason: reason,
    };
    set((state) => ({
      pendingMatches: state.pendingMatches.map((m) =>
        m.id === matchId ? { ...m, ...patch } : m
      ),
      matchHistory: state.matchHistory.map((m) =>
        m.id === matchId ? { ...m, ...patch } : m
      ),
    }));
    syncMatchPatchRemote(matchId, patch);
    for (const uid of [...match.teamA, ...match.teamB]) {
      get().pushInbox({
        type: 'system',
        title: '경기 취소',
        message: `코트 ${match.courtId} 경기가 취소됐어요.`,
        targetUserId: uid,
        courtId: match.courtId,
      });
    }
    recordAdminLogAsActor(adminId, {
      category: 'match',
      action: 'match.cancel',
      message: `코트 ${match.courtId} 경기 제출 취소 (A ${match.scoreA}:${match.scoreB} B)`,
      targetId: matchId,
      meta: { courtId: match.courtId },
    });
    persistAppState();
    return { success: true, message: '경기 제출을 취소했어요.' };
  },

  adminRevokeConfirmedMatch: (matchId, adminId, reason = '운영진 철회') => {
    const match = get().matchHistory.find((m) => m.id === matchId && m.status === 'confirmed');
    if (!match) {
      return { success: false, message: '철회할 확정 경기를 찾을 수 없어요.' };
    }

    const authStore = useAuthStore.getState();
    const winners = match.winner === 'A' ? match.teamA : match.teamB;
    const losers = match.winner === 'A' ? match.teamB : match.teamA;
    const rated = !!match.eloChanges;

    if (rated && match.eloChanges) {
      Object.entries(match.eloChanges).forEach(([userId, delta]) => {
        authStore.updateUserElo(userId, -delta);
      });
      authStore.reverseMatchStats(winners, losers);
    }

    const relatedTx = usePointStore.getState().transactions.filter(
      (t) => t.meta?.matchId === matchId && t.amount > 0 && !t.revokedAt
    );
    relatedTx.forEach((tx) => {
      usePointStore.getState().adminRevokeTransaction(tx.id, adminId, reason);
    });

    const patch = {
      status: 'revoked' as const,
      cancelledAt: new Date().toISOString(),
      cancelledBy: adminId,
      cancelReason: reason,
    };
    set((state) => ({
      pendingMatches: state.pendingMatches.map((m) =>
        m.id === matchId ? { ...m, ...patch } : m
      ),
      matchHistory: state.matchHistory.map((m) =>
        m.id === matchId ? { ...m, ...patch } : m
      ),
    }));
    syncMatchPatchRemote(matchId, patch);
    if (rated) syncMatchStatsRemote(matchId);
    for (const uid of [...match.teamA, ...match.teamB]) {
      get().pushInbox({
        type: 'system',
        title: '경기 무효',
        message: `코트 ${match.courtId} 경기가 무효 처리됐어요.`,
        targetUserId: uid,
        courtId: match.courtId,
      });
    }
    recordAdminLogAsActor(adminId, {
      category: 'match',
      action: 'match.revoke',
      message: `코트 ${match.courtId} 확정 경기 철회`,
      targetId: matchId,
      meta: { courtId: match.courtId },
    });
    persistAppState();
    return { success: true, message: '확정 경기를 철회하고 반영분을 되돌렸어요.' };
  },

  adminRevokeCleaning: (submissionId, adminId, reason = '운영진 취소') => {
    return revokeServiceSubmission(get, set, submissionId, adminId, 'cleaning', reason);
  },

  adminRevokeNetSetup: (submissionId, adminId, reason = '운영진 취소') => {
    return revokeServiceSubmission(get, set, submissionId, adminId, 'net_setup', reason);
  },

  adminBroadcastNotice: (adminId, title, message) => {
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    if (!trimmedTitle || !trimmedMessage) {
      return { success: false, message: '제목과 내용을 입력해 주세요.' };
    }

    const recipients = useAuthStore
      .getState()
      .users.filter((u) => u.memberStatus === 'approved' && u.membershipTier !== 'guest');

    recipients.forEach((u) => {
      get().pushInbox({
        type: 'system',
        title: trimmedTitle,
        message: trimmedMessage,
        targetUserId: u.id,
      });
    });

    recordAdminLogAsActor(adminId, {
      category: 'system',
      action: 'notice.broadcast',
      message: `전체 공지: ${trimmedTitle}`,
      meta: { count: recipients.length },
    });
    persistAppState();
    return {
      success: true,
      message: `승인 회원 ${recipients.length}명에게 공지를 보냈어요.`,
    };
  },

  submitMatchResult: (courtId, teamA, teamB, scoreA, scoreB, gameMode = 'casual') => {
    if (scoreA === scoreB) {
      return { recorded: false, rated: false, applied: false, requiresApproval: false };
    }
    const winner: 'A' | 'B' = scoreA > scoreB ? 'A' : 'B';
    const rated = isRatedMode(gameMode);
    const matchId = `match-${Date.now()}`;
    const playedAt = new Date().toISOString();

    // 난타(친선)는 Elo 미반영으로 바로 확정 기록.
    // 경기는 점수 입력 즉시 Elo 반영하되, 하루 한도를 넘으면 관리자 승인 대기로 전환.
    const participants = [...teamA, ...teamB];
    const overDailyLimit =
      rated && ratedMatchesTodayForUsers(get().matchHistory, participants) >= AUTO_RATED_MATCH_DAILY_LIMIT;
    const requiresApproval = rated && overDailyLimit;
    const applyNow = rated && !overDailyLimit;

    const match: MatchResult = {
      id: matchId,
      courtId,
      teamA,
      teamB,
      scoreA,
      scoreB,
      winner,
      status: requiresApproval ? 'pending' : 'confirmed',
      playedAt,
      gameMode,
      confirmedAt: requiresApproval ? undefined : playedAt,
      // 자동 확정(승인 없이 반영)은 confirmedBy 를 비워 시스템 처리로 표시
      confirmedBy: undefined,
    };

    if (applyNow) {
      match.eloChanges = applyMatchOutcome(match, matchId);
    }

    set((state) => ({
      // 승인이 필요한 경기만 관리자 대기 목록에 추가
      pendingMatches: requiresApproval ? [match, ...state.pendingMatches] : state.pendingMatches,
      matchHistory: [match, ...state.matchHistory],
    }));

    if (isSupabaseEnabled()) {
      import('@/src/services/supabase/matches')
        .then(({ insertMatchRemote }) =>
          insertMatchRemote(match).then((remoteId) => {
            if (!remoteId) return;
            set((state) => ({
              pendingMatches: state.pendingMatches.map((m) =>
                m.id === match.id ? { ...m, id: remoteId } : m
              ),
              matchHistory: state.matchHistory.map((m) =>
                m.id === match.id ? { ...m, id: remoteId } : m
              ),
            }));
          })
        )
        .catch((err) => console.warn('[match] insert failed', err));
      if (applyNow) syncMatchStatsRemote(matchId);
    }
    persistAppState();

    return { recorded: true, rated, applied: applyNow, requiresApproval };
  },

  submitCleaning: (submission) => {
    const authStore = useAuthStore.getState();
    const user = authStore.users.find((u) => u.id === submission.userId);
    const points = calculateCleaningPoints();

    const newEntry: CleaningSubmission = {
      ...submission,
      kind: 'cleaning',
      id: `clean-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      points,
    };

    if (user) {
      applyPointChangeLocalOnly(user.id, points, 'cleaning', `청소·정리 인증 · ${submission.area}`);
      useAuthStore.setState((state) => ({
        users: state.users.map((u) =>
          u.id === user.id ? { ...u, cleaningContributions: u.cleaningContributions + 1 } : u
        ),
        currentUser:
          state.currentUser?.id === user.id
            ? {
                ...state.currentUser,
                cleaningContributions: state.currentUser.cleaningContributions + 1,
              }
            : state.currentUser,
      }));
    }

    set((state) => ({
      cleaningLeaderboard: [newEntry, ...state.cleaningLeaderboard].slice(0, 20),
    }));
    syncCleaningRemote(set, newEntry);
    persistAppState();
  },

  submitNetSetup: (submission) => {
    const authStore = useAuthStore.getState();
    const user = authStore.users.find((u) => u.id === submission.userId);
    const points = calculateNetSetupPoints();

    const newEntry: CleaningSubmission = {
      ...submission,
      kind: 'net_setup',
      id: `net-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      points,
    };

    if (user) {
      applyPointChangeLocalOnly(
        user.id,
        points,
        'net_setup',
        `네트 설치·철거 인증 · ${submission.area}`
      );
    }

    set((state) => ({
      cleaningLeaderboard: [newEntry, ...state.cleaningLeaderboard].slice(0, 20),
    }));
    syncCleaningRemote(set, newEntry);
    persistAppState();
  },

  submitShuttlecockCarry: (submission) => {
    const authStore = useAuthStore.getState();
    const user = authStore.users.find((u) => u.id === submission.userId);
    const points = calculateNetSetupPoints();

    const newEntry: CleaningSubmission = {
      ...submission,
      kind: 'net_setup',
      id: `cock-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      points,
    };

    if (user) {
      applyPointChangeLocalOnly(
        user.id,
        points,
        'net_setup',
        `셔틀콕 운반 인증 · ${submission.area}`
      );
    }

    set((state) => ({
      cleaningLeaderboard: [newEntry, ...state.cleaningLeaderboard].slice(0, 20),
    }));
    syncCleaningRemote(set, newEntry);
    persistAppState();
  },

  markNotificationRead: (id) => {
    set((state) => ({
      inbox: state.inbox.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
    if (isSupabaseEnabled()) {
      import('@/src/services/supabase/notifications')
        .then(({ markNotificationReadRemote }) => markNotificationReadRemote(id))
        .catch((err) => console.warn('[notif] mark read failed', err));
    }
    persistAppState();
  },

  markAllNotificationsRead: (userId?: string) => {
    set((state) => ({
      inbox: state.inbox.map((n) => {
        if (!userId) return { ...n, read: true };
        if (!n.targetUserId || n.targetUserId === userId) return { ...n, read: true };
        return n;
      }),
    }));
    if (isSupabaseEnabled() && userId) {
      import('@/src/services/supabase/notifications')
        .then(({ markAllNotificationsReadRemote }) => markAllNotificationsReadRemote(userId))
        .catch((err) => console.warn('[notif] mark all read failed', err));
    }
    persistAppState();
  },

  pushInbox: (n) => {
    const item: AppNotification = {
      id: n.id ?? `n-${Date.now()}`,
      type: n.type,
      title: n.title,
      message: n.message,
      courtId: n.courtId,
      joinRequestId: n.joinRequestId,
      targetUserId: n.targetUserId,
      read: false,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ inbox: [item, ...state.inbox] }));
    if (isSupabaseEnabled()) {
      import('@/src/services/supabase/notifications')
        .then(({ insertNotificationRemote }) => insertNotificationRemote(item))
        .catch((err) => console.warn('[notif] insert failed', err));
    }
    persistAppState();
  },
}));
