import { create } from 'zustand';
import type { TeamRoom, TeamMember, TeamRoomJoinRequest } from '@/src/types';
import { MOCK_TEAM_ROOMS } from '@/src/services/mockData';
import { isRankEligible } from '@/src/services/elo';
import type { RankTier } from '@/src/types';
import { saveRooms } from '@/src/services/persistence';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import { runWhenRemoteId } from '@/src/utils/localId';
import { filterExpiredLobbyRooms } from '@/src/utils/lobbyExpiry';
import { useAuthStore } from './authStore';
import { useNotificationStore } from './notificationStore';
import { useLobbyExpiryStore } from './lobbyExpiryStore';
import { isGuestUser } from '@/src/utils/guestAccess';
import { getT } from '@/src/i18n/useI18n';
import { resolveUserLocale } from '@/src/i18n/resolveUserLocale';

function remoteRoom(
  roomId: string,
  fn: (remoteId: string, m: typeof import('@/src/services/supabase/social')) => Promise<unknown>
) {
  if (!isSupabaseEnabled()) return;
  runWhenRemoteId(
    () => useLobbyStore.getState().rooms.find((r) => r.id === roomId)?.id ?? roomId,
    (remoteId) =>
      import('@/src/services/supabase/social')
        .then(async (m) => {
          await fn(remoteId, m);
        })
        .catch((err) => console.warn('[lobby] sync failed', err))
  );
}

function withJoinRequests(room: TeamRoom): TeamRoom {
  return { ...room, joinRequests: room.joinRequests ?? [] };
}

interface LobbyState {
  rooms: TeamRoom[];
  createRoom: (params: {
    hostId: string;
    hostName: string;
    hostRank: RankTier;
    hostAvatarColor: string;
    title: string;
    minRank?: RankTier;
    maxRank?: RankTier;
    password?: string;
  }) => { success: boolean; message: string };
  /** @deprecated 승인제 — requestJoinRoom 사용 */
  joinRoom: (
    roomId: string,
    member: TeamMember,
    password?: string
  ) => { success: boolean; message: string };
  requestJoinRoom: (
    roomId: string,
    member: TeamMember,
    password?: string
  ) => Promise<{ success: boolean; message: string }>;
  acceptJoinRequest: (
    roomId: string,
    requestId: string,
    actorId: string
  ) => { success: boolean; message: string };
  rejectJoinRequest: (
    roomId: string,
    requestId: string,
    actorId: string
  ) => { success: boolean; message: string };
  /** 방장 초대 — 상대가 수락하면 바로 입장 (승인 생략) */
  inviteFriendToRoom: (
    roomId: string,
    hostId: string,
    friendId: string
  ) => { success: boolean; message: string };
  acceptInvite: (
    roomId: string,
    userId: string
  ) => { success: boolean; message: string };
  leaveRoom: (roomId: string, userId: string) => void;
  markRoomReserved: (roomId: string, courtId: number) => void;
  adminCloseRoom: (roomId: string) => { success: boolean; message: string };
  expireStaleRooms: () => number;
  hydrateRooms: (rooms: TeamRoom[]) => void;
}

function persistRooms(rooms: TeamRoom[]) {
  if (isSupabaseEnabled()) return;
  saveRooms(rooms).catch(() => {});
}

function addMemberToRoom(room: TeamRoom, member: TeamMember): TeamRoom {
  const members = [...room.members, member];
  return {
    ...room,
    members,
    joinRequests: (room.joinRequests ?? []).filter((r) => r.userId !== member.userId),
    status: members.length >= room.minMembers ? ('ready' as const) : room.status,
  };
}

export const useLobbyStore = create<LobbyState>((set, get) => ({
  rooms: MOCK_TEAM_ROOMS.map(withJoinRequests),

  hydrateRooms: (rooms) => set({ rooms: rooms.map(withJoinRequests) }),

  createRoom: (params) => {
    const host = useAuthStore.getState().users.find((u) => u.id === params.hostId);
    if (isGuestUser(host)) {
      return { success: false, message: '게스트는 모집방을 만들 수 없어요. 회원가입 후 이용해 주세요.' };
    }
    const memberCheck = useAuthStore.getState().canPerformMemberAction(params.hostId);
    if (!memberCheck.allowed) {
      return { success: false, message: memberCheck.reason ?? '모집방을 만들 수 없어요.' };
    }

    const hostMember: TeamMember = {
      userId: params.hostId,
      name: params.hostName,
      rank: params.hostRank,
      avatarColor: params.hostAvatarColor,
    };
    const newRoom: TeamRoom = {
      id: `room-${Date.now()}`,
      hostId: params.hostId,
      hostName: params.hostName,
      title: params.title,
      minRank: params.minRank,
      maxRank: params.maxRank,
      members: [hostMember],
      minMembers: 2,
      maxMembers: 4,
      status: 'open',
      createdAt: new Date().toISOString(),
      password: params.password || undefined,
      hasPassword: Boolean(params.password),
      joinRequests: [],
    };
    const rooms = [newRoom, ...get().rooms];
    set({ rooms });
    persistRooms(rooms);

    if (isSupabaseEnabled()) {
      import('@/src/services/supabase/social')
        .then(({ insertTeamRoomRemote }) =>
          insertTeamRoomRemote(newRoom).then((remoteId) => {
            if (!remoteId) return;
            set((state) => ({
              rooms: state.rooms.map((r) => (r.id === newRoom.id ? { ...r, id: remoteId } : r)),
            }));
          })
        )
        .catch((err) => console.warn('[lobby] create failed', err));
    }

    return { success: true, message: '모집방이 생성되었어요.' };
  },

  joinRoom: (roomId, member, _password) => {
    const room = get().rooms.find((r) => r.id === roomId);
    if (!room) return { success: false, message: '방을 찾을 수 없어요.' };
    if (room.members.length >= room.maxMembers) {
      return { success: false, message: '방이 가득 찼어요.' };
    }
    if (!isRankEligible(member.rank, room.minRank, room.maxRank)) {
      return { success: false, message: '랭크 조건에 맞지 않아요.' };
    }
    if (room.members.some((m) => m.userId === member.userId)) {
      return { success: false, message: '이미 참여 중이에요.' };
    }

    const rooms = get().rooms.map((r) =>
      r.id === roomId ? addMemberToRoom(withJoinRequests(r), member) : r
    );
    set({ rooms });
    persistRooms(rooms);
    const updated = rooms.find((r) => r.id === roomId);
    if (updated) {
      remoteRoom(roomId, (id, m) =>
        m.updateTeamRoomRemote(id, {
          members: updated.members,
          status: updated.status,
          joinRequests: updated.joinRequests,
        })
      );
    }
    return { success: true, message: '방에 참여했어요!' };
  },

  requestJoinRoom: async (roomId, member, password) => {
    const room = get().rooms.find((r) => r.id === roomId);
    if (!room) return { success: false, message: '방을 찾을 수 없어요.' };
    if (room.status === 'reserved' || room.status === 'closed') {
      return { success: false, message: '참여할 수 없는 방이에요.' };
    }
    if (room.members.length >= room.maxMembers) {
      return { success: false, message: '방이 가득 찼어요.' };
    }
    if (!isRankEligible(member.rank, room.minRank, room.maxRank)) {
      return { success: false, message: '랭크 조건에 맞지 않아요.' };
    }
    if (room.members.some((m) => m.userId === member.userId)) {
      return { success: false, message: '이미 참여 중이에요.' };
    }
    const requests = room.joinRequests ?? [];
    if (requests.some((r) => r.userId === member.userId)) {
      return { success: false, message: '이미 참가 신청했어요. 방장 승인을 기다려 주세요.' };
    }

    if (room.hasPassword) {
      if (!isSupabaseEnabled()) {
        if (!password || password !== room.password) {
          return { success: false, message: '비밀번호가 일치하지 않아요.' };
        }
      } else {
        try {
          const { verifyTeamRoomPasswordRemote } = await import('@/src/services/supabase/social');
          const ok = await verifyTeamRoomPasswordRemote(roomId, password);
          if (!ok) return { success: false, message: '비밀번호가 일치하지 않아요.' };
        } catch {
          return { success: false, message: '비밀번호 확인에 실패했어요.' };
        }
      }
    }

    const request: TeamRoomJoinRequest = {
      id: `lr-${Date.now()}`,
      userId: member.userId,
      name: member.name,
      rank: member.rank,
      avatarColor: member.avatarColor,
      requestedAt: new Date().toISOString(),
    };

    const rooms = get().rooms.map((r) =>
      r.id === roomId
        ? { ...withJoinRequests(r), joinRequests: [...(r.joinRequests ?? []), request] }
        : r
    );
    set({ rooms });
    persistRooms(rooms);
    const updated = rooms.find((r) => r.id === roomId);
    if (updated) {
      remoteRoom(roomId, (id, m) =>
        m.updateTeamRoomRemote(id, { joinRequests: updated.joinRequests })
      );
    }

    useNotificationStore.getState().pushInbox({
      type: 'join',
      title: '모집방 참가 신청',
      message: `${member.name}님이 「${room.title}」 참가를 신청했어요`,
      targetUserId: room.hostId,
      roomId,
      joinRequestId: request.id,
    });

    return { success: true, message: '참가 신청을 보냈어요. 방장 승인을 기다려 주세요.' };
  },

  acceptJoinRequest: (roomId, requestId, actorId) => {
    const room = get().rooms.find((r) => r.id === roomId);
    if (!room) return { success: false, message: '방을 찾을 수 없어요.' };
    if (room.hostId !== actorId) {
      return { success: false, message: '방장만 승인할 수 있어요.' };
    }
    const request = (room.joinRequests ?? []).find((r) => r.id === requestId);
    if (!request) return { success: false, message: '신청을 찾을 수 없어요.' };
    if (room.members.length >= room.maxMembers) {
      return { success: false, message: '방이 가득 찼어요.' };
    }

    const member: TeamMember = {
      userId: request.userId,
      name: request.name,
      rank: request.rank,
      avatarColor: request.avatarColor,
    };
    const result = get().joinRoom(roomId, member);
    if (result.success) {
      useNotificationStore.getState().pushInbox({
        type: 'join',
        title: '모집방 참가 승인',
        message: `「${room.title}」 참가가 승인됐어요.`,
        targetUserId: request.userId,
        roomId,
      });
    }
    return result;
  },

  rejectJoinRequest: (roomId, requestId, actorId) => {
    const room = get().rooms.find((r) => r.id === roomId);
    if (!room) return { success: false, message: '방을 찾을 수 없어요.' };
    if (room.hostId !== actorId) {
      return { success: false, message: '방장만 거절할 수 있어요.' };
    }
    const request = (room.joinRequests ?? []).find((r) => r.id === requestId);
    if (!request) return { success: false, message: '신청을 찾을 수 없어요.' };

    const rooms = get().rooms.map((r) =>
      r.id === roomId
        ? {
            ...withJoinRequests(r),
            joinRequests: (r.joinRequests ?? []).filter((x) => x.id !== requestId),
          }
        : r
    );
    set({ rooms });
    persistRooms(rooms);
    const updated = rooms.find((r) => r.id === roomId);
    if (updated) {
      remoteRoom(roomId, (id, m) =>
        m.updateTeamRoomRemote(id, { joinRequests: updated.joinRequests })
      );
    }
    useNotificationStore.getState().pushInbox({
      type: 'join',
      title: '모집방 참가 거절',
      message: `「${room.title}」 참가가 거절됐어요.`,
      targetUserId: request.userId,
      roomId,
    });
    return { success: true, message: `${request.name}님 신청을 거절했어요.` };
  },

  inviteFriendToRoom: (roomId, hostId, friendId) => {
    const room = get().rooms.find((r) => r.id === roomId);
    if (!room) return { success: false, message: '방을 찾을 수 없어요.' };
    if (room.hostId !== hostId && !room.members.some((m) => m.userId === hostId)) {
      return { success: false, message: '참여 중인 모집방에서만 초대할 수 있어요.' };
    }
    if (room.status === 'reserved' || room.status === 'closed') {
      return { success: false, message: '초대할 수 없는 방이에요.' };
    }
    if (room.members.some((m) => m.userId === friendId)) {
      return { success: false, message: '이미 방에 있는 친구예요.' };
    }
    if (room.members.length >= room.maxMembers) {
      return { success: false, message: '방이 가득 찼어요.' };
    }

    const friend = useAuthStore.getState().users.find((u) => u.id === friendId);
    if (!friend) return { success: false, message: '친구를 찾을 수 없어요.' };
    if (!isRankEligible(friend.rank, room.minRank, room.maxRank)) {
      return { success: false, message: '친구 랭크가 방 조건에 맞지 않아요.' };
    }

    const inviter = useAuthStore.getState().users.find((u) => u.id === hostId);
    const locale = resolveUserLocale(friendId);
    const t = getT(locale);
    const title = t('notifications.lobbyInviteTitle', { name: inviter?.name ?? '친구' });
    const message = t('notifications.lobbyInviteMessage', { room: room.title });

    useNotificationStore.getState().pushInbox({
      type: 'friend',
      title,
      message,
      targetUserId: friendId,
      roomId,
    });
    return { success: true, message: `${friend.name}님에게 초대를 보냈어요.` };
  },

  acceptInvite: (roomId, userId) => {
    const room = get().rooms.find((r) => r.id === roomId);
    if (!room) return { success: false, message: '방을 찾을 수 없어요. 이미 종료됐을 수 있어요.' };
    const user = useAuthStore.getState().users.find((u) => u.id === userId);
    if (!user) return { success: false, message: '사용자를 찾을 수 없어요.' };
    if (room.members.some((m) => m.userId === userId)) {
      return { success: true, message: '이미 참여 중이에요.' };
    }
    if (!isRankEligible(user.rank, room.minRank, room.maxRank)) {
      return { success: false, message: '랭크 조건에 맞지 않아요.' };
    }
    const member: TeamMember = {
      userId: user.id,
      name: user.name,
      rank: user.rank,
      avatarColor: user.avatarColor,
    };
    const result = get().joinRoom(roomId, member);
    if (result.success) {
      const hostLocale = resolveUserLocale(room.hostId);
      const t = getT(hostLocale);
      useNotificationStore.getState().pushInbox({
        type: 'friend',
        title: t('notifications.lobbyInviteAcceptedTitle'),
        message: t('notifications.lobbyInviteAcceptedMessage', {
          name: user.name,
          room: room.title,
        }),
        targetUserId: room.hostId,
        roomId,
      });
    }
    return result;
  },

  leaveRoom: (roomId, userId) => {
    const rooms = get().rooms
      .map((r) => {
        if (r.id !== roomId) return r;
        const members = r.members.filter((m) => m.userId !== userId);
        if (members.length === 0) return null;
        const isHost = r.hostId === userId;
        return {
          ...withJoinRequests(r),
          hostId: isHost ? members[0].userId : r.hostId,
          hostName: isHost ? members[0].name : r.hostName,
          members,
          status: members.length < r.minMembers ? ('open' as const) : r.status,
        };
      })
      .filter(Boolean) as TeamRoom[];
    set({ rooms });
    persistRooms(rooms);

    const remaining = rooms.find((r) => r.id === roomId);
    if (!remaining) {
      remoteRoom(roomId, (id, m) => m.deleteTeamRoomRemote(id));
    } else {
      remoteRoom(roomId, (id, m) =>
        m.updateTeamRoomRemote(id, {
          members: remaining.members,
          status: remaining.status,
          hostId: remaining.hostId,
          hostName: remaining.hostName,
          joinRequests: remaining.joinRequests,
        })
      );
    }
  },

  markRoomReserved: (roomId, _courtId) => {
    const rooms = get().rooms.map((r) =>
      r.id === roomId ? { ...r, status: 'reserved' as const } : r
    );
    set({ rooms });
    persistRooms(rooms);
    remoteRoom(roomId, (id, m) => m.updateTeamRoomRemote(id, { status: 'reserved' }));
  },

  adminCloseRoom: (roomId) => {
    const room = get().rooms.find((r) => r.id === roomId);
    if (!room) return { success: false, message: '모집방을 찾을 수 없어요.' };
    const rooms = get().rooms.filter((r) => r.id !== roomId);
    set({ rooms });
    persistRooms(rooms);
    remoteRoom(roomId, (id, m) => m.deleteTeamRoomRemote(id));
    return { success: true, message: `「${room.title}」 모집방을 종료했어요.` };
  },

  expireStaleRooms: () => {
    const config = useLobbyExpiryStore.getState().config;
    const { kept, expired } = filterExpiredLobbyRooms(get().rooms, config);
    if (!expired.length) return 0;
    set({ rooms: kept });
    persistRooms(kept);
    expired.forEach((room) => {
      remoteRoom(room.id, (id, m) => m.deleteTeamRoomRemote(id));
    });
    return expired.length;
  },
}));
