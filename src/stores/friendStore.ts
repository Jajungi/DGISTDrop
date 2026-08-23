import { create } from 'zustand';
import type { FriendRequest } from '@/src/types';
import { persistAppState } from '@/src/services/persistGate';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import { runWhenRemoteId } from '@/src/utils/localId';
import { useAuthStore } from './authStore';
import { useNotificationStore } from './notificationStore';

function remoteFriend(fn: (m: typeof import('@/src/services/supabase/social')) => Promise<unknown>) {
  if (!isSupabaseEnabled()) return;
  import('@/src/services/supabase/social')
    .then(fn)
    .catch((err) => console.warn('[friend] sync failed', err));
}

function remoteFriendRequest(
  requestId: string,
  fn: (remoteId: string, m: typeof import('@/src/services/supabase/social')) => Promise<unknown>
) {
  if (!isSupabaseEnabled()) return;
  runWhenRemoteId(
    () =>
      useFriendStore.getState().friendRequests.find((r) => r.id === requestId)?.id ?? requestId,
    (remoteId) =>
      import('@/src/services/supabase/social')
        .then((m) => fn(remoteId, m))
        .catch((err) => console.warn('[friend] sync failed', err))
  );
}

export type FriendRelationStatus = 'none' | 'pending_out' | 'pending_in' | 'friends';
export type { FriendState };

interface FriendState {
  friendships: Record<string, string[]>;
  friendRequests: FriendRequest[];
  hydrate: (friendships: Record<string, string[]>, requests: FriendRequest[]) => void;
  getFriendIds: (userId: string) => string[];
  getRelationStatus: (userId: string, otherId: string) => FriendRelationStatus;
  getIncomingRequests: (userId: string) => FriendRequest[];
  getOutgoingRequests: (userId: string) => FriendRequest[];
  sendFriendRequest: (
    fromUserId: string,
    toUserId: string
  ) => { success: boolean; message: string };
  acceptFriendRequest: (
    requestId: string,
    userId: string
  ) => { success: boolean; message: string };
  rejectFriendRequest: (requestId: string, userId: string) => { success: boolean; message: string };
  cancelFriendRequest: (requestId: string, userId: string) => { success: boolean; message: string };
  removeFriend: (userId: string, friendId: string) => { success: boolean; message: string };
  /** 관리자: 대기 중 친구 신청 거절 처리 */
  adminDismissFriendRequest: (requestId: string) => { success: boolean; message: string };
}

function addFriendPair(map: Record<string, string[]>, a: string, b: string) {
  if (!map[a]) map[a] = [];
  if (!map[b]) map[b] = [];
  if (!map[a].includes(b)) map[a].push(b);
  if (!map[b].includes(a)) map[b].push(a);
}

function removeFriendPair(map: Record<string, string[]>, a: string, b: string) {
  map[a] = (map[a] ?? []).filter((id) => id !== b);
  map[b] = (map[b] ?? []).filter((id) => id !== a);
}

const EMPTY_FRIEND_IDS: string[] = [];

export const useFriendStore = create<FriendState>((set, get) => ({
  friendships: {},
  friendRequests: [],

  hydrate: (friendships, friendRequests) => set({ friendships, friendRequests }),

  getFriendIds: (userId) => get().friendships[userId] ?? EMPTY_FRIEND_IDS,

  getRelationStatus: (userId, otherId) => {
    if (get().friendships[userId]?.includes(otherId)) return 'friends';
    const pending = get().friendRequests.find(
      (r) =>
        r.status === 'pending' &&
        ((r.fromUserId === userId && r.toUserId === otherId) ||
          (r.fromUserId === otherId && r.toUserId === userId))
    );
    if (!pending) return 'none';
    return pending.fromUserId === userId ? 'pending_out' : 'pending_in';
  },

  getIncomingRequests: (userId) =>
    get()
      .friendRequests.filter((r) => r.status === 'pending' && r.toUserId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),

  getOutgoingRequests: (userId) =>
    get()
      .friendRequests.filter((r) => r.status === 'pending' && r.fromUserId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),

  sendFriendRequest: (fromUserId, toUserId) => {
    if (fromUserId === toUserId) {
      return { success: false, message: '자기 자신에게는 보낼 수 없어요.' };
    }
    const memberCheck = useAuthStore.getState().canPerformMemberAction(fromUserId);
    if (!memberCheck.allowed) {
      return { success: false, message: memberCheck.reason ?? '친구 신청을 할 수 없어요.' };
    }
    const status = get().getRelationStatus(fromUserId, toUserId);
    if (status === 'friends') return { success: false, message: '이미 친구예요.' };
    if (status === 'pending_out') return { success: false, message: '이미 친구 신청을 보냈어요.' };
    if (status === 'pending_in') return { success: false, message: '상대가 먼저 신청했어요. 받은 신청을 확인해 주세요.' };

    const from = useAuthStore.getState().users.find((u) => u.id === fromUserId);
    const to = useAuthStore.getState().users.find((u) => u.id === toUserId);
    if (!from || !to) return { success: false, message: '사용자를 찾을 수 없어요.' };
    if (to.memberStatus !== 'approved') {
      return { success: false, message: '승인된 회원에게만 신청할 수 있어요.' };
    }

    const req: FriendRequest = {
      id: `fr-${Date.now()}`,
      fromUserId,
      fromUserName: from.name,
      toUserId,
      toUserName: to.name,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    set((state) => ({ friendRequests: [req, ...state.friendRequests] }));
    persistAppState();

    if (isSupabaseEnabled()) {
      import('@/src/services/supabase/social')
        .then(({ sendFriendRequestRemote }) =>
          sendFriendRequestRemote(req).then((remoteId) => {
            if (!remoteId) return;
            set((state) => ({
              friendRequests: state.friendRequests.map((r) =>
                r.id === req.id ? { ...r, id: remoteId } : r
              ),
            }));
          })
        )
        .catch((err) => console.warn('[friend] send failed', err));
    }

    useNotificationStore.getState().pushInbox({
      type: 'friend',
      title: '친구 신청',
      message: `${from.name}님이 친구 신청을 보냈어요`,
      targetUserId: toUserId,
    });

    return { success: true, message: `${to.name}님에게 친구 신청을 보냈어요.` };
  },

  acceptFriendRequest: (requestId, userId) => {
    const req = get().friendRequests.find((r) => r.id === requestId);
    if (!req || req.toUserId !== userId || req.status !== 'pending') {
      return { success: false, message: '신청을 찾을 수 없어요.' };
    }

    set((state) => {
      const friendships = { ...state.friendships };
      addFriendPair(friendships, req.fromUserId, req.toUserId);
      return {
        friendships,
        friendRequests: state.friendRequests.map((r) =>
          r.id === requestId ? { ...r, status: 'accepted' as const } : r
        ),
      };
    });
    persistAppState();
    remoteFriendRequest(requestId, (id, m) => m.respondFriendRequestRemote(id, 'accepted'));

    const toUser = useAuthStore.getState().users.find((u) => u.id === userId);
    useNotificationStore.getState().pushInbox({
      type: 'friend',
      title: '친구 수락',
      message: `${toUser?.name ?? '상대'}님이 친구 신청을 수락했어요`,
      targetUserId: req.fromUserId,
    });

    return { success: true, message: `${req.fromUserName}님과 친구가 되었어요!` };
  },

  rejectFriendRequest: (requestId, userId) => {
    const req = get().friendRequests.find((r) => r.id === requestId);
    if (!req || req.toUserId !== userId || req.status !== 'pending') {
      return { success: false, message: '신청을 찾을 수 없어요.' };
    }
    set((state) => ({
      friendRequests: state.friendRequests.map((r) =>
        r.id === requestId ? { ...r, status: 'rejected' as const } : r
      ),
    }));
    persistAppState();
    remoteFriendRequest(requestId, (id, m) => m.respondFriendRequestRemote(id, 'rejected'));
    useNotificationStore.getState().pushInbox({
      type: 'friend',
      title: '친구 거절',
      message: `${req.toUserName}님이 친구 신청을 거절했어요.`,
      targetUserId: req.fromUserId,
    });
    return { success: true, message: '친구 신청을 거절했어요.' };
  },

  cancelFriendRequest: (requestId, userId) => {
    const req = get().friendRequests.find((r) => r.id === requestId);
    if (!req || req.fromUserId !== userId || req.status !== 'pending') {
      return { success: false, message: '신청을 찾을 수 없어요.' };
    }
    set((state) => ({
      friendRequests: state.friendRequests.filter((r) => r.id !== requestId),
    }));
    persistAppState();
    remoteFriendRequest(requestId, (id, m) => m.deleteFriendRequestRemote(id));
    return { success: true, message: '친구 신청을 취소했어요.' };
  },

  removeFriend: (userId, friendId) => {
    if (!get().friendships[userId]?.includes(friendId)) {
      return { success: false, message: '친구 목록에 없어요.' };
    }
    set((state) => {
      const friendships = { ...state.friendships };
      removeFriendPair(friendships, userId, friendId);
      return { friendships };
    });
    persistAppState();
    remoteFriend((m) => m.removeFriendRemote(userId, friendId));
    return { success: true, message: '친구를 삭제했어요.' };
  },

  adminDismissFriendRequest: (requestId) => {
    const req = get().friendRequests.find((r) => r.id === requestId && r.status === 'pending');
    if (!req) {
      return { success: false, message: '신청을 찾을 수 없어요.' };
    }
    set((state) => ({
      friendRequests: state.friendRequests.map((r) =>
        r.id === requestId ? { ...r, status: 'rejected' as const } : r
      ),
    }));
    persistAppState();
    remoteFriendRequest(requestId, (id, m) => m.respondFriendRequestRemote(id, 'rejected'));
    return { success: true, message: '친구 신청을 거절 처리했어요.' };
  },
}));
