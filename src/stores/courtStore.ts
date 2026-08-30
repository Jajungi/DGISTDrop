import { create } from 'zustand';
import type { Court, CourtPlayer, GameMode, NantaHalf } from '@/src/types';
import { GAME_COUNT_OPTIONS, COACH_COURT_ID } from '@/src/constants/court';
import { MIN_PLAYERS_FOR_GAME } from '@/src/constants';
import { courtStatusForSetup, type OccupancySetupState } from '@/src/utils/occupancyCourt';
import {
  createEmptyCourts,
  userToCourtPlayer,
  userHasActiveCourt,
  canJoinWaitQueue,
} from '@/src/services/courtService';
import { createMockCourts } from '@/src/services/mockData';
import { getReservationCost, isPeakTime, canReserve, isCenterCourtId } from '@/src/services/points';
import { isReservationEnabled, isPointsFeaturesEnabled } from '@/src/stores/featureFlagsStore';
import { useAuthStore } from './authStore';
import { useAppStore } from './authStore';
import { useNotificationStore } from './notificationStore';
import { useLessonStore } from './lessonStore';
import { saveCourts } from '@/src/services/persistence';
import { applyPointChange, applyPointChangeLocalOnly } from '@/src/services/pointLedger';
import { usePointStore } from './pointStore';
import { applyCourtMaintenance } from '@/src/services/courtMaintenance';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import { upsertCourt } from '@/src/services/supabase/courts';
import { isGuestUser } from '@/src/utils/guestAccess';

/**
 * Supabase 모드에서 서버 hydrate 전에 mock/빈 상태를 upsert 하지 않도록 막음.
 * (로컬 mock 코트가 프로덕션 DB를 덮어쓰는 사고 방지)
 */
let allowRemoteCourtWrite = !isSupabaseEnabled();

export function setRemoteCourtWriteEnabled(enabled: boolean) {
  allowRemoteCourtWrite = enabled;
}

interface CourtState {
  courts: Court[];
  selectedCourtId: number | null;
  lastUpdated: string;
  selectCourt: (id: number | null) => void;
  reserveCourt: (
    courtId: number,
    userId: string,
    gameCount: number,
    gameMode?: GameMode,
    nantaHalf?: NantaHalf,
    teamPlayers?: CourtPlayer[]
  ) => { success: boolean; message: string };
  reserveCourtForTeam: (
    courtId: number,
    hostUserId: string,
    memberUserIds: string[],
    gameCount: number
  ) => { success: boolean; message: string };
  startGame: (courtId: number) => { success: boolean; message: string };
  completeGame: (courtId: number) => { success: boolean; message: string; sessionEnded: boolean };
  returnCourt: (courtId: number) => void;
  cancelReservation: (courtId: number, userId: string) => { success: boolean; message: string };
  adminRemovePlayer: (courtId: number, userId: string) => { success: boolean; message: string };
  adminRefundAndReturn: (courtId: number) => { success: boolean; message: string };
  requestJoin: (courtId: number, userId: string, userName: string, rank: CourtPlayer['rank']) => { success: boolean; message: string };
  acceptJoin: (courtId: number, requestId: string) => { success: boolean; message: string };
  rejectJoin: (courtId: number, requestId: string) => void;
  adminClearJoinRequests: (courtId: number) => { success: boolean; message: string };
  joinWaitQueue: (courtId: number, userId: string, userName: string) => { success: boolean; message: string };
  leaveWaitQueue: (courtId: number, userId: string) => { success: boolean; message: string };
  removeWaitEntry: (courtId: number, entryId: string) => { success: boolean; message: string };
  adminClearWaitQueue: (courtId: number) => { success: boolean; message: string };
  refreshCourts: () => void;
  hydrateCourts: (courts: Court[]) => void;
  setCourtOccupancy: (courtId: number, occupied: boolean) => { success: boolean; message: string };
  setCourtSetupState: (
    courtId: number,
    state: OccupancySetupState
  ) => { success: boolean; message: string };
}

function persistCourts(courts: Court[]) {
  if (isSupabaseEnabled()) {
    if (!allowRemoteCourtWrite) return;
    courts.forEach((court) => {
      void upsertCourt(court).catch(() => {});
    });
    return;
  }
  saveCourts(courts).catch(() => {});
}

export const useCourtStore = create<CourtState>((set, get) => ({
  // Supabase 사용 시 mock 시드 금지 — 빈 코트로 시작 후 서버 hydrate
  courts: isSupabaseEnabled() ? createEmptyCourts() : createMockCourts(),
  selectedCourtId: null,
  lastUpdated: new Date().toISOString(),

  selectCourt: (id) => set({ selectedCourtId: id }),

  hydrateCourts: (courts) => {
    if (!courts?.length) return;
    const normalized = courts.map((c) => ({
      ...c,
      joinRequests: c.joinRequests ?? [],
      waitQueue: c.waitQueue ?? [],
    }));
    set({ courts: normalized, lastUpdated: new Date().toISOString() });
  },

  setCourtSetupState: (courtId, state) => {
    const court = get().courts.find((c) => c.id === courtId);
    if (!court) return { success: false, message: '코트를 찾을 수 없어요.' };

    const targetStatus = courtStatusForSetup(state);
    if (court.status === targetStatus) {
      const labels = { unset: '미설치', ready: '설치됨', active: '사용 중' } as const;
      return { success: false, message: `이미 ${labels[state]} 상태예요.` };
    }

    const now = new Date().toISOString();
    const nextCourts = get().courts.map((c) => {
      if (c.id !== courtId) return c;
      if (state === 'unset') {
        return {
          ...c,
          status: 'empty' as const,
          reservedBy: undefined,
          reservedAt: undefined,
          startedAt: undefined,
          finishedAt: undefined,
          players: [],
          joinRequests: [],
          waitQueue: [],
          gamesCompleted: 0,
          maxGames: 0,
          gameMode: undefined,
          nantaHalf: undefined,
        };
      }
      if (state === 'ready') {
        return {
          ...c,
          status: 'reserved' as const,
          reservedBy: undefined,
          reservedAt: now,
          startedAt: undefined,
          finishedAt: undefined,
          players: [],
          joinRequests: [],
          waitQueue: [],
          gamesCompleted: 0,
          maxGames: 0,
          gameMode: undefined,
          nantaHalf: undefined,
        };
      }
      return {
        ...c,
        status: 'playing' as const,
        reservedBy: undefined,
        reservedAt: c.reservedAt ?? now,
        startedAt: c.startedAt ?? now,
        finishedAt: undefined,
        players: [],
        joinRequests: [],
        waitQueue: [],
        gamesCompleted: 0,
        maxGames: 0,
        gameMode: undefined,
        nantaHalf: undefined,
      };
    });
    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });

    const messages = {
      unset: `${court.name}을 미설치로 표시했어요.`,
      ready: `${court.name}을 설치됨(대기)으로 표시했어요.`,
      active: `${court.name}을 사용 중으로 표시했어요.`,
    } as const;

    if (isSupabaseEnabled()) {
      import('@/src/services/supabase/courts')
        .then(async ({ setCourtSetupStateRemote, mapCourtRpcError, fetchCourts }) => {
          try {
            await setCourtSetupStateRemote(courtId, state);
            const fresh = await fetchCourts();
            if (fresh.length) get().hydrateCourts(fresh);
          } catch (err) {
            useNotificationStore.getState().showToast({
              type: 'warning',
              title: '',
              message: mapCourtRpcError(err),
            });
            try {
              const fresh = await fetchCourts();
              if (fresh.length) get().hydrateCourts(fresh);
            } catch {
              /* ignore */
            }
          }
        })
        .catch(() => {});
    } else {
      persistCourts(nextCourts);
    }

    return { success: true, message: messages[state] };
  },

  setCourtOccupancy: (courtId, occupied) => {
    return get().setCourtSetupState(courtId, occupied ? 'active' : 'unset');
  },

  reserveCourt: (courtId, userId, gameCount, gameMode = 'casual', nantaHalf = 'near', teamPlayers) => {
    if (!isReservationEnabled()) {
      return { success: false, message: '지금은 현황 모드예요. 예약할 수 없어요.' };
    }

    const appStore = useAppStore.getState();
    if (!appStore.checkGeoFence()) {
      return { success: false, message: '체육관 근처에서만 예약할 수 있어요.' };
    }

    if (!GAME_COUNT_OPTIONS.includes(gameCount as (typeof GAME_COUNT_OPTIONS)[number])) {
      return { success: false, message: '게임 수를 선택해주세요.' };
    }

    const authStore = useAuthStore.getState();
    const user = authStore.users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '사용자를 찾을 수 없어요.' };

    const isGuest = isGuestUser(user);

    const court = get().courts.find((c) => c.id === courtId);
    if (!court || court.status !== 'empty') {
      return { success: false, message: '이 코트는 예약할 수 없어요.' };
    }

    if (isGuest) {
      if (court.isCoachCourt || courtId === COACH_COURT_ID) {
        return { success: false, message: '게스트는 코치 코트를 예약할 수 없어요.' };
      }
    } else {
      const memberCheck = authStore.canPerformMemberAction(userId);
      if (!memberCheck.allowed) {
        return { success: false, message: memberCheck.reason ?? '예약할 수 없어요.' };
      }
    }

    const peak = isPeakTime();
    const hasActiveCourt = userHasActiveCourt(userId, get().courts);
    if (!isGuest) {
      const reserveCheck = canReserve(user.peakTimeReservations, peak, hasActiveCourt);
      if (!reserveCheck.allowed) {
        return { success: false, message: reserveCheck.reason ?? '예약할 수 없어요.' };
      }
    } else if (hasActiveCourt) {
      return { success: false, message: '이미 사용 중인 코트가 있어요.' };
    }

    if (!isGuest && (court.isCoachCourt || courtId === COACH_COURT_ID)) {
      const lessonCheck = useLessonStore.getState().canReserveCoachCourt(userId);
      if (!lessonCheck.allowed) {
        return { success: false, message: lessonCheck.reason ?? '코치 코트를 예약할 수 없어요.' };
      }
    }

    const cost = isGuest || !isPointsFeaturesEnabled() ? 0 : getReservationCost(user.rank, isCenterCourtId(courtId));
    if (!isGuest && user.points < cost) {
      return { success: false, message: `포인트가 부족해요. (필요: ${cost}P)` };
    }

    const modeLabel = gameMode === 'nanta' ? '난타' : '경기';
    const peakNote = peak ? ' · 피크타임' : '';
    const players = teamPlayers && teamPlayers.length ? teamPlayers : [userToCourtPlayer(user)];
    const reserveDesc = `${court.name} 예약 · ${modeLabel} ${gameCount}게임${peakNote}`;

    const nextCourts = get().courts.map((c) =>
      c.id === courtId
        ? {
            ...c,
            status: 'reserved' as const,
            reservedBy: userId,
            reservedAt: new Date().toISOString(),
            maxGames: gameCount,
            gamesCompleted: 0,
            players,
            joinRequests: [],
            gameMode,
            nantaHalf: gameMode === 'nanta' ? nantaHalf : undefined,
          }
        : c
    );

    if (isSupabaseEnabled()) {
      if (!isGuest && cost > 0) {
        applyPointChangeLocalOnly(userId, -cost, 'court_reserve', reserveDesc, { courtId });
      }
      if (peak && !isGuest) authStore.incrementPeakReservations(userId);
      set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
      const loc = useAppStore.getState().location;
      import('@/src/services/supabase/courts')
        .then(async ({ reserveCourtRemote, mapCourtRpcError, fetchCourts }) => {
          try {
            await reserveCourtRemote({
              courtId,
              gameCount,
              gameMode,
              nantaHalf: gameMode === 'nanta' ? nantaHalf : undefined,
              players,
              lat: loc?.latitude ?? null,
              lng: loc?.longitude ?? null,
            });
          } catch (err) {
            useNotificationStore.getState().showToast({
              type: 'warning',
              title: '',
              message: mapCourtRpcError(err),
            });
            try {
              const fresh = await fetchCourts();
              if (fresh.length) get().hydrateCourts(fresh);
            } catch {
              /* ignore */
            }
          }
        })
        .catch((err) => console.warn('[court] reserve failed', err));
    } else {
      if (cost > 0) {
        applyPointChange(userId, -cost, 'court_reserve', reserveDesc, { courtId });
      }
      if (peak && !isGuest) authStore.incrementPeakReservations(userId);
      set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
      persistCourts(nextCourts);
    }

    const costNote = cost > 0 ? ` (-${cost}P)` : '';
    return {
      success: true,
      message: `${court.name} · ${modeLabel} · ${gameCount}게임 예약됨${costNote}`,
    };
  },

  reserveCourtForTeam: (courtId, hostUserId, memberUserIds, gameCount) => {
    const uniqueIds = [...new Set([hostUserId, ...memberUserIds])];
    const authStore = useAuthStore.getState();
    const host = authStore.users.find((u) => u.id === hostUserId);
    if (!host) return { success: false, message: '방장 정보를 찾을 수 없어요.' };

    const players = uniqueIds
      .map((id) => authStore.users.find((u) => u.id === id))
      .filter(Boolean)
      .map((u) => userToCourtPlayer(u!));

    if (players.length < MIN_PLAYERS_FOR_GAME) {
      return { success: false, message: `최소 ${MIN_PLAYERS_FOR_GAME}명이 필요해요.` };
    }

    // 팀 전체를 예약 RPC 에 원자적으로 전달 (서버가 상태·포인트를 한 번에 처리)
    const result = get().reserveCourt(courtId, hostUserId, gameCount, 'casual', 'near', players);
    if (!result.success) return result;

    return { success: true, message: `${courtId}번 코트 · 팀 ${players.length}명 예약 완료` };
  },

  startGame: (courtId) => {
    const court = get().courts.find((c) => c.id === courtId);
    if (!court || court.status !== 'reserved') {
      return { success: false, message: '게임을 시작할 수 없어요.' };
    }
    if (court.players.length < MIN_PLAYERS_FOR_GAME) {
      return { success: false, message: `최소 ${MIN_PLAYERS_FOR_GAME}명이 필요해요.` };
    }

    const nextCourts = get().courts.map((c) =>
      c.id === courtId
        ? { ...c, status: 'playing' as const, startedAt: new Date().toISOString() }
        : c
    );
    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);
    return { success: true, message: '게임이 시작되었어요.' };
  },

  completeGame: (courtId) => {
    const court = get().courts.find((c) => c.id === courtId);
    if (!court || court.status !== 'playing') {
      return { success: false, message: '진행 중인 게임이 없어요.', sessionEnded: false };
    }

    const newGames = court.gamesCompleted + 1;
    const sessionEnded = newGames >= court.maxGames;

    const nextCourts = get().courts.map((c) => {
      if (c.id !== courtId) return c;
      if (sessionEnded) {
        return {
          ...c,
          gamesCompleted: newGames,
          status: 'just_finished' as const,
          finishedAt: new Date().toISOString(),
        };
      }
      return { ...c, gamesCompleted: newGames };
    });

    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);

    return {
      success: true,
      message: sessionEnded ? '모든 게임 완료! 결과를 입력해주세요.' : `게임 ${newGames}/${court.maxGames} 완료`,
      sessionEnded,
    };
  },

  returnCourt: (courtId) => {
    const prev = get().courts.find((c) => c.id === courtId);
    const waiters = prev?.waitQueue ?? [];
    const nextCourts = get().courts.map((c) =>
      c.id === courtId
        ? {
            ...c,
            status: 'empty' as const,
            players: [],
            gamesCompleted: 0,
            maxGames: 0,
            joinRequests: [],
            waitQueue: [],
            reservedBy: undefined,
            reservedAt: undefined,
            startedAt: undefined,
            finishedAt: undefined,
            gameMode: undefined,
            nantaHalf: undefined,
          }
        : c
    );
    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);

    waiters.forEach((w, i) => {
      useNotificationStore.getState().pushInbox({
        type: 'system',
        title: i === 0 ? '코트 비었어요 · 1번 대기' : `코트 비었어요 · ${i + 1}번 대기`,
        message:
          i === 0
            ? `${courtId}번 코트가 비었어요. 지금 예약하면 다음으로 이용할 수 있어요.`
            : `${courtId}번 코트가 비었어요. 대기 순번은 ${i + 1}번이었어요.`,
        targetUserId: w.userId,
        courtId,
      });
    });
  },

  adminRemovePlayer: (courtId, userId) => {
    const court = get().courts.find((c) => c.id === courtId);
    if (!court) return { success: false, message: '코트를 찾을 수 없어요.' };
    const player = court.players.find((p) => p.userId === userId);
    if (!player) return { success: false, message: '해당 참가자가 없어요.' };

    const nextPlayers = court.players.filter((p) => p.userId !== userId);
    const nextCourts = get().courts.map((c) => {
      if (c.id !== courtId) return c;
      return {
        ...c,
        players: nextPlayers,
        reservedBy:
          c.reservedBy === userId
            ? nextPlayers[0]?.userId ?? undefined
            : c.reservedBy,
        status:
          nextPlayers.length === 0 && c.status === 'playing'
            ? ('reserved' as const)
            : c.status,
      };
    });
    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);
    return { success: true, message: `${player.name}님을 코트에서 냈어요.` };
  },

  adminRefundAndReturn: (courtId) => {
    const court = get().courts.find((c) => c.id === courtId);
    if (!court || court.status === 'empty') {
      return { success: false, message: '반납할 코트가 없어요.' };
    }

    const payerId = court.reservedBy ?? court.players[0]?.userId;
    let refunded = 0;
    if (payerId) {
      if (isSupabaseEnabled()) {
        import('@/src/services/supabase/points')
          .then(({ adminRefundCourtRemote }) =>
            adminRefundCourtRemote(courtId, payerId).then((amount) => {
              if (amount > 0) {
                useAuthStore.getState().updateUserPoints(payerId, amount);
              }
            })
          )
          .catch((err) => console.warn('[court] admin refund failed', err));
        const tx = usePointStore
          .getState()
          .transactions.find(
            (t) =>
              t.userId === payerId &&
              t.type === 'court_reserve' &&
              t.meta?.courtId === courtId &&
              t.amount < 0 &&
              !t.revokedAt
          );
        if (tx) refunded = -tx.amount;
      } else {
        const tx = usePointStore
          .getState()
          .transactions.find(
            (t) =>
              t.userId === payerId &&
              t.type === 'court_reserve' &&
              t.meta?.courtId === courtId &&
              t.amount < 0
          );
        if (tx) {
          refunded = -tx.amount;
          applyPointChange(payerId, refunded, 'admin', `코트 ${courtId} 예약 환불 (운영진)`, {
            courtId,
          });
        }
      }
    }

    get().returnCourt(courtId);
    return {
      success: true,
      message:
        refunded > 0
          ? `코트를 반납하고 ${refunded}P를 환불했어요.`
          : '코트를 반납했어요.',
    };
  },

  cancelReservation: (courtId, userId) => {
    const court = get().courts.find((c) => c.id === courtId);
    if (!court) return { success: false, message: '코트를 찾을 수 없어요.' };
    if (court.status !== 'reserved') {
      return { success: false, message: '예약 상태에서만 취소할 수 있어요.' };
    }

    const isOwner =
      court.reservedBy === userId || court.players[0]?.userId === userId;
    if (!isOwner) {
      return { success: false, message: '예약한 본인만 취소할 수 있어요.' };
    }

    let refunded = 0;
    const tx = usePointStore
      .getState()
      .transactions.find(
        (t) =>
          t.userId === userId &&
          t.type === 'court_reserve' &&
          t.meta?.courtId === courtId &&
          t.amount < 0
      );
    if (tx) {
      refunded = -tx.amount;
      // 로컬 낙관 반영 후 서버 검증 환불(rpc_refund_court)이 실제 금액을 처리
      applyPointChangeLocalOnly(userId, refunded, 'court_reserve', `코트 ${courtId} 예약 취소 환불`, {
        courtId,
      });
      if (isSupabaseEnabled()) {
        import('@/src/services/supabase/points')
          .then(({ refundCourtRemote }) => refundCourtRemote(courtId))
          .catch((err) => console.warn('[court] refund failed', err));
      }
    }

    get().returnCourt(courtId);
    return {
      success: true,
      message:
        refunded > 0
          ? `예약을 취소하고 ${refunded}P를 환불했어요.`
          : '예약을 취소했어요.',
    };
  },

  requestJoin: (courtId, userId, userName, rank) => {
    const court = get().courts.find((c) => c.id === courtId);
    if (!court || court.status !== 'playing') {
      return { success: false, message: '합류할 수 있는 코트가 아니에요.' };
    }
    if (court.players.length >= 4) {
      return { success: false, message: '코트가 가득 찼어요.' };
    }
    if (court.players.some((p) => p.userId === userId)) {
      return { success: false, message: '이미 참가 중이에요.' };
    }
    if (court.joinRequests.some((r) => r.userId === userId)) {
      return { success: false, message: '이미 합류 신청했어요.' };
    }
    if (userHasActiveCourt(userId, get().courts)) {
      return { success: false, message: '이미 다른 코트를 이용 중이에요.' };
    }

    const requestId = `jr-${Date.now()}`;
    const nextCourts = get().courts.map((c) =>
      c.id === courtId
        ? {
            ...c,
            joinRequests: [
              ...c.joinRequests,
              {
                id: requestId,
                userId,
                userName,
                rank,
                requestedAt: new Date().toISOString(),
              },
            ],
          }
        : c
    );
    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);

    const hostId = court.reservedBy ?? court.players[0]?.userId;
    if (hostId && hostId !== userId) {
      useNotificationStore.getState().pushInbox({
        type: 'join',
        title: '참가 요청',
        message: `${userName}님이 ${courtId}번 코트 합류를 요청했어요`,
        courtId,
        joinRequestId: requestId,
        targetUserId: hostId,
      });
    }

    return { success: true, message: '합류 신청이 접수되었어요.' };
  },

  acceptJoin: (courtId, requestId) => {
    const authStore = useAuthStore.getState();
    const court = get().courts.find((c) => c.id === courtId);
    if (!court) return { success: false, message: '코트를 찾을 수 없어요.' };
    if (court.players.length >= 4) {
      return { success: false, message: '코트가 가득 찼어요.' };
    }

    const request = court.joinRequests.find((r) => r.id === requestId);
    if (!request) return { success: false, message: '신청을 찾을 수 없어요.' };

    const user = authStore.users.find((u) => u.id === request.userId);
    if (!user) return { success: false, message: '사용자를 찾을 수 없어요.' };
    if (userHasActiveCourt(request.userId, get().courts)) {
      return { success: false, message: '이미 다른 코트를 이용 중인 회원이에요.' };
    }

    const nextCourts = get().courts.map((c) => {
      if (c.id !== courtId) return c;
      return {
        ...c,
        players: [...c.players, userToCourtPlayer(user)],
        joinRequests: c.joinRequests.filter((r) => r.id !== requestId),
      };
    });

    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);
    useNotificationStore.getState().pushInbox({
      type: 'join',
      title: '합류 수락',
      message: `${courtId}번 코트 합류가 수락됐어요.`,
      targetUserId: request.userId,
      courtId,
    });
    return { success: true, message: `${request.userName}님이 합류했어요.` };
  },

  rejectJoin: (courtId, requestId) => {
    const court = get().courts.find((c) => c.id === courtId);
    const request = court?.joinRequests.find((r) => r.id === requestId);
    const nextCourts = get().courts.map((c) =>
      c.id === courtId
        ? { ...c, joinRequests: c.joinRequests.filter((r) => r.id !== requestId) }
        : c
    );
    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);
    if (request) {
      useNotificationStore.getState().pushInbox({
        type: 'join',
        title: '합류 거절',
        message: `${courtId}번 코트 합류가 거절됐어요.`,
        targetUserId: request.userId,
        courtId,
      });
    }
  },

  adminClearJoinRequests: (courtId) => {
    const court = get().courts.find((c) => c.id === courtId);
    if (!court) return { success: false, message: '코트를 찾을 수 없어요.' };
    if (court.joinRequests.length === 0) {
      return { success: false, message: '삭제할 합류 신청이 없어요.' };
    }
    const nextCourts = get().courts.map((c) =>
      c.id === courtId ? { ...c, joinRequests: [] } : c
    );
    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);
    return { success: true, message: '합류 신청을 모두 삭제했어요.' };
  },

  joinWaitQueue: (courtId, userId, userName) => {
    const appStore = useAppStore.getState();
    if (!appStore.checkGeoFence()) {
      return { success: false, message: '체육관 근처에서만 대기할 수 있어요.' };
    }
    const court = get().courts.find((c) => c.id === courtId);
    if (!court || !canJoinWaitQueue(court)) {
      return { success: false, message: '예약·경기 중인 코트만 대기할 수 있어요.' };
    }
    if (court.players.some((p) => p.userId === userId) || court.reservedBy === userId) {
      return { success: false, message: '이미 이 코트를 이용 중이에요.' };
    }
    const queue = court.waitQueue ?? [];
    if (queue.some((w) => w.userId === userId)) {
      return { success: false, message: '이미 대기열에 있어요.' };
    }
    if (userHasActiveCourt(userId, get().courts)) {
      return { success: false, message: '다른 코트를 이용 중이면 대기할 수 없어요.' };
    }

    const entryId = `wq-${Date.now()}`;
    const nextCourts = get().courts.map((c) =>
      c.id === courtId
        ? {
            ...c,
            waitQueue: [
              ...(c.waitQueue ?? []),
              { id: entryId, userId, userName, joinedAt: new Date().toISOString() },
            ],
          }
        : c
    );
    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);

    const position = (court.waitQueue?.length ?? 0) + 1;
    const hostId = court.reservedBy ?? court.players[0]?.userId;
    if (hostId && hostId !== userId) {
      useNotificationStore.getState().pushInbox({
        type: 'system',
        title: '대기열 등록',
        message: `${userName}님이 ${courtId}번 코트 대기열에 올랐어요 (${position}번)`,
        targetUserId: hostId,
        courtId,
      });
    }
    return { success: true, message: `${position}번으로 대기열에 등록됐어요.` };
  },

  leaveWaitQueue: (courtId, userId) => {
    const court = get().courts.find((c) => c.id === courtId);
    if (!court?.waitQueue?.some((w) => w.userId === userId)) {
      return { success: false, message: '대기열에 없어요.' };
    }
    const nextCourts = get().courts.map((c) =>
      c.id === courtId
        ? { ...c, waitQueue: (c.waitQueue ?? []).filter((w) => w.userId !== userId) }
        : c
    );
    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);
    return { success: true, message: '대기열에서 나왔어요.' };
  },

  removeWaitEntry: (courtId, entryId) => {
    const court = get().courts.find((c) => c.id === courtId);
    const entry = court?.waitQueue?.find((w) => w.id === entryId);
    if (!entry) return { success: false, message: '대기자를 찾을 수 없어요.' };
    const nextCourts = get().courts.map((c) =>
      c.id === courtId
        ? { ...c, waitQueue: (c.waitQueue ?? []).filter((w) => w.id !== entryId) }
        : c
    );
    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);
    useNotificationStore.getState().pushInbox({
      type: 'system',
      title: '대기열 제외',
      message: `${courtId}번 코트 대기열에서 제외됐어요.`,
      targetUserId: entry.userId,
      courtId,
    });
    return { success: true, message: `${entry.userName}님을 대기열에서 제외했어요.` };
  },

  adminClearWaitQueue: (courtId) => {
    const court = get().courts.find((c) => c.id === courtId);
    if (!court) return { success: false, message: '코트를 찾을 수 없어요.' };
    if (!(court.waitQueue?.length)) {
      return { success: false, message: '비울 대기열이 없어요.' };
    }
    const nextCourts = get().courts.map((c) =>
      c.id === courtId ? { ...c, waitQueue: [] } : c
    );
    set({ courts: nextCourts, lastUpdated: new Date().toISOString() });
    persistCourts(nextCourts);
    return { success: true, message: '대기열을 비웠어요.' };
  },

  refreshCourts: () => {
    const maintained = applyCourtMaintenance(get().courts);
    if (maintained !== get().courts) {
      set({ courts: maintained, lastUpdated: new Date().toISOString() });
      persistCourts(maintained);
    } else {
      set({ lastUpdated: new Date().toISOString() });
    }
  },
}));
