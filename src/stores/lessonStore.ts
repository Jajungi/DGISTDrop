import { create } from 'zustand';
import type { LessonApplication, LessonQueueEntry } from '@/src/types';
import { MOCK_LESSON_APPLICATIONS, MOCK_LESSON_QUEUE } from '@/src/services/mockData';
import { useNotificationStore } from './notificationStore';
import { useAuthStore } from './authStore';
import { persistAppState } from '@/src/services/persistGate';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import { runWhenRemoteId } from '@/src/utils/localId';
import { isLessonTurnEnabled } from '@/src/stores/notificationPrefsStore';

function persistLessonQueue() {
  persistAppState();
}

function remoteQueueEntry(
  entryId: string,
  fn: (remoteId: string, m: typeof import('@/src/services/supabase/social')) => Promise<unknown>
) {
  if (!isSupabaseEnabled()) return;
  runWhenRemoteId(
    () => useLessonStore.getState().lessonQueue.find((e) => e.id === entryId)?.id ?? entryId,
    (remoteId) =>
      import('@/src/services/supabase/social')
        .then(async (m) => {
          await fn(remoteId, m);
        })
        .catch((err) => console.warn('[lesson] sync failed', err))
  );
}

/** 대기열 재정렬 후 원격 행들의 position·status 를 반영 */
function syncQueueRemote(entries: LessonQueueEntry[]) {
  if (!isSupabaseEnabled()) return;
  entries.forEach((e) => {
    remoteQueueEntry(e.id, (id, m) =>
      m.updateLessonQueueRemote(id, { position: e.position, status: e.status })
    );
  });
}

function normalizeQueue(entries: LessonQueueEntry[]): LessonQueueEntry[] {
  const active = entries.filter((e) => e.status === 'active');
  const next = entries.find((e) => e.status === 'next');
  const waiting = entries
    .filter((e) => e.status === 'waiting')
    .sort((a, b) => a.position - b.position);
  const done = entries.filter((e) => e.status === 'done');

  const ordered: LessonQueueEntry[] = [];
  if (next) ordered.push(next);
  ordered.push(...waiting);
  ordered.push(...active);
  ordered.push(...done);

  let pos = 1;
  return ordered.map((e) => ({
    ...e,
    position: e.status === 'done' ? e.position : pos++,
  }));
}

interface LessonState {
  applications: LessonApplication[];
  lessonQueue: LessonQueueEntry[];
  hydrate: (applications: LessonApplication[], lessonQueue: LessonQueueEntry[]) => void;
  requestLessonAccess: (userId: string) => { success: boolean; message: string };
  approveApplication: (applicationId: string, adminId: string) => { success: boolean; message: string };
  rejectApplication: (applicationId: string, adminId: string) => { success: boolean; message: string };
  hasLessonAccess: (userId: string) => boolean;
  getApplication: (userId: string) => LessonApplication | undefined;
  getQueueEntry: (userId: string) => LessonQueueEntry | undefined;
  joinQueue: (userId: string) => { success: boolean; message: string };
  leaveQueue: (userId: string) => { success: boolean; message: string };
  canReserveCoachCourt: (userId: string) => { allowed: boolean; reason?: string };
  /** 관리자: 대기 중인 사람을 다음 차례로 */
  setNextInQueue: (entryId: string) => void;
  /** 관리자: 레슨 시작 */
  startLesson: (entryId: string) => void;
  /** 관리자: 레슨 완료 → 다음 사람에게 사이렌 */
  completeLesson: (entryId: string) => void;
  /** 관리자: 대기열에서 제거 */
  adminRemoveFromQueue: (entryId: string) => { success: boolean; message: string };
  notifyIfNext: (userId: string) => void;
}

export const useLessonStore = create<LessonState>((set, get) => ({
  applications: MOCK_LESSON_APPLICATIONS,
  lessonQueue: MOCK_LESSON_QUEUE,

  hydrate: (applications, lessonQueue) =>
    set({ applications, lessonQueue: normalizeQueue(lessonQueue) }),

  requestLessonAccess: (userId) => useAuthStore.getState().requestLessonAccess(userId),

  approveApplication: (_applicationId, adminId) => {
    void adminId;
    return { success: false, message: '관리자 패널에서 회원 레슨 권한을 승인해 주세요.' };
  },

  rejectApplication: (_applicationId, adminId) => {
    void adminId;
    return { success: false, message: '관리자 패널에서 회원 레슨 권한을 거절해 주세요.' };
  },

  hasLessonAccess: (userId) => {
    const user = useAuthStore.getState().users.find((u) => u.id === userId);
    return user?.lessonStatus === 'approved';
  },

  getApplication: (userId) => {
    const user = useAuthStore.getState().users.find((u) => u.id === userId);
    if (!user || user.lessonStatus === 'none') return undefined;
    return {
      id: `la-${userId}`,
      userId,
      userName: user.name,
      studentId: user.studentId,
      status:
        user.lessonStatus === 'approved'
          ? ('approved' as const)
          : user.lessonStatus === 'rejected'
            ? ('rejected' as const)
            : ('pending' as const),
      requestedAt: user.lessonRequestedAt ?? user.createdAt,
    };
  },

  getQueueEntry: (userId) =>
    get().lessonQueue.find(
      (e) => e.userId === userId && e.status !== 'done'
    ),

  joinQueue: (userId) => {
    if (!get().hasLessonAccess(userId)) {
      return {
        success: false,
        message: '레슨 권한이 없어요. 먼저 레슨 권한을 신청하고 운영진 승인을 받아 주세요.',
      };
    }

    const user = useAuthStore.getState().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '사용자를 찾을 수 없어요.' };

    const existing = get().getQueueEntry(userId);
    if (existing) {
      return { success: false, message: '이미 대기열에 등록되어 있어요.' };
    }

    const activeQueue = get().lessonQueue.filter((e) => e.status !== 'done');
    const hasNext = activeQueue.some((e) => e.status === 'next');
    const maxPos = activeQueue.reduce((m, e) => Math.max(m, e.position), 0);

    const entry: LessonQueueEntry = {
      id: `lq-${Date.now()}`,
      userId,
      userName: user.name,
      position: maxPos + 1,
      status: hasNext ? 'waiting' : 'next',
      joinedAt: new Date().toISOString(),
    };

    const nextQueue = normalizeQueue([...get().lessonQueue, entry]);
    set({ lessonQueue: nextQueue });
    persistLessonQueue();

    if (isSupabaseEnabled()) {
      import('@/src/services/supabase/social')
        .then(({ insertLessonQueueRemote }) =>
          insertLessonQueueRemote(entry).then((remoteId) => {
            if (!remoteId) return;
            set((state) => ({
              lessonQueue: state.lessonQueue.map((e) =>
                e.id === entry.id ? { ...e, id: remoteId } : e
              ),
            }));
          })
        )
        .catch((err) => console.warn('[lesson] join failed', err));
    }

    if (entry.status === 'next') {
      get().notifyIfNext(userId);
    }

    return {
      success: true,
      message:
        entry.status === 'next'
          ? '대기열 1번! 곧 레슨 차례 알림을 받을 수 있어요.'
          : `대기열 ${entry.position}번으로 등록됐어요.`,
    };
  },

  leaveQueue: (userId) => {
    const entry = get().getQueueEntry(userId);
    if (!entry) return { success: false, message: '대기열에 없어요.' };
    if (entry.status === 'active') {
      return { success: false, message: '레슨 진행 중에는 대기열을 취소할 수 없어요.' };
    }

    const wasNext = entry.status === 'next';
    const remaining = get().lessonQueue.filter((e) => e.id !== entry.id);
    let nextQueue = normalizeQueue(remaining);

    if (wasNext) {
      const firstWaiting = nextQueue.find((e) => e.status === 'waiting');
      if (firstWaiting) {
        nextQueue = nextQueue.map((e) =>
          e.id === firstWaiting.id ? { ...e, status: 'next' as const } : e
        );
        nextQueue = normalizeQueue(nextQueue);
        get().notifyIfNext(firstWaiting.userId);
      }
    }

    set({ lessonQueue: nextQueue });
    persistLessonQueue();
    remoteQueueEntry(entry.id, (id, m) => m.deleteLessonQueueRemote(id));
    syncQueueRemote(nextQueue);
    return { success: true, message: '대기열에서 빠졌어요.' };
  },

  canReserveCoachCourt: (userId) => {
    if (!get().hasLessonAccess(userId)) {
      return {
        allowed: false,
        reason: '레슨 권한 신청·운영진 승인 후 코치 코트를 예약할 수 있어요.',
      };
    }
    const entry = get().getQueueEntry(userId);
    if (!entry || (entry.status !== 'next' && entry.status !== 'active')) {
      return {
        allowed: false,
        reason: `레슨 대기 순서가 되어야 예약할 수 있어요. (현재 ${entry ? `${entry.position}번 대기` : '대기열 미등록'})`,
      };
    }
    return { allowed: true };
  },

  setNextInQueue: (entryId) => {
    const target = get().lessonQueue.find((e) => e.id === entryId);
    if (!target || target.status === 'done' || target.status === 'active') return;

    const nextQueue = get().lessonQueue.map((e) => {
      if (e.id === entryId) return { ...e, status: 'next' as const };
      if (e.status === 'next') return { ...e, status: 'waiting' as const };
      return e;
    });
    const normalized = normalizeQueue(nextQueue);
    set({ lessonQueue: normalized });
    persistLessonQueue();
    syncQueueRemote(normalized);
    get().notifyIfNext(target.userId);
  },

  startLesson: (entryId) => {
    const target = get().lessonQueue.find((e) => e.id === entryId);
    if (!target) return;

    const nextQueue = get().lessonQueue.map((e) => {
      if (e.id === entryId) return { ...e, status: 'active' as const };
      if (e.status === 'next' && e.id !== entryId) return { ...e, status: 'waiting' as const };
      return e;
    });
    const normalized = normalizeQueue(nextQueue);
    set({ lessonQueue: normalized });
    persistLessonQueue();
    syncQueueRemote(normalized);
  },

  completeLesson: (entryId) => {
    const target = get().lessonQueue.find((e) => e.id === entryId);
    if (!target) return;

    let nextQueue = get().lessonQueue.map((e) =>
      e.id === entryId ? { ...e, status: 'done' as const } : e
    );

    const firstWaiting = nextQueue.find((e) => e.status === 'waiting');
    if (firstWaiting) {
      nextQueue = nextQueue.map((e) =>
        e.id === firstWaiting.id ? { ...e, status: 'next' as const } : e
      );
    }

    nextQueue = normalizeQueue(nextQueue);
    set({ lessonQueue: nextQueue });
    persistLessonQueue();
    syncQueueRemote(nextQueue);

    if (firstWaiting) {
      get().notifyIfNext(firstWaiting.userId);
    }
  },

  adminRemoveFromQueue: (entryId) => {
    const entry = get().lessonQueue.find((e) => e.id === entryId);
    if (!entry) {
      return { success: false, message: '대기열 항목을 찾을 수 없어요.' };
    }
    if (entry.status === 'done') {
      return { success: false, message: '이미 완료된 레슨이에요.' };
    }

    const wasNext = entry.status === 'next';
    let remaining = get().lessonQueue.filter((e) => e.id !== entryId);

    if (wasNext) {
      const firstWaiting = remaining.find((e) => e.status === 'waiting');
      if (firstWaiting) {
        remaining = remaining.map((e) =>
          e.id === firstWaiting.id ? { ...e, status: 'next' as const } : e
        );
      }
    }

    const nextQueue = normalizeQueue(remaining);
    set({ lessonQueue: nextQueue });
    persistLessonQueue();
    remoteQueueEntry(entryId, (id, m) => m.deleteLessonQueueRemote(id));
    syncQueueRemote(nextQueue);

    if (wasNext) {
      const promoted = nextQueue.find((e) => e.status === 'next');
      if (promoted) get().notifyIfNext(promoted.userId);
    }

    return { success: true, message: `${entry.userName}님을 대기열에서 제거했어요.` };
  },

  notifyIfNext: (userId) => {
    const entry = get().lessonQueue.find((e) => e.userId === userId && e.status === 'next');
    if (!entry) return;
    if (!isLessonTurnEnabled()) return;

    const notify = useNotificationStore.getState();
    notify.showSiren('다음 레슨 차례입니다', '코치 코트로 이동해 셔틀콕을 준비해 주세요.');
    notify.pushInbox({
      type: 'coach',
      title: '사이렌 오더',
      message: `${entry.position}번 — 다음 레슨 차례입니다. 코치 코트(3번)로 이동해 주세요.`,
      targetUserId: userId,
    });
  },
}));
