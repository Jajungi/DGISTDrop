import { getSupabase } from '@/src/lib/supabase';
import type {
  FriendRequest,
  FriendRequestStatus,
  CoachAnnouncement,
  LessonQueueEntry,
  TeamRoom,
  TeamMember,
  RankTier,
} from '@/src/types';

// ===================== 친구 =====================

type DbFriendRequest = {
  id: string;
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  status: FriendRequestStatus;
  created_at: string;
};

function mapFriendRequest(r: DbFriendRequest): FriendRequest {
  return {
    id: r.id,
    fromUserId: r.from_user_id,
    fromUserName: r.from_user_name,
    toUserId: r.to_user_id,
    toUserName: r.to_user_name,
    status: r.status,
    createdAt: r.created_at,
  };
}

/** 로그인 사용자와 관련된 친구 신청 + 파생 친구관계 맵을 반환 */
export async function fetchFriendData(
  userId: string
): Promise<{ requests: FriendRequest[]; friendships: Record<string, string[]> }> {
  const { data, error } = await getSupabase()
    .from('friend_requests')
    .select('*')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data as DbFriendRequest[]).map(mapFriendRequest);
  const friendships: Record<string, string[]> = {};
  const addPair = (a: string, b: string) => {
    (friendships[a] ??= []).push(b);
    (friendships[b] ??= []).push(a);
  };
  rows
    .filter((r) => r.status === 'accepted')
    .forEach((r) => addPair(r.fromUserId, r.toUserId));
  return { requests: rows, friendships };
}

export async function sendFriendRequestRemote(req: FriendRequest): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('friend_requests')
    .insert({
      from_user_id: req.fromUserId,
      from_user_name: req.fromUserName,
      to_user_id: req.toUserId,
      to_user_name: req.toUserName,
      status: 'pending',
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string })?.id ?? null;
}

export async function respondFriendRequestRemote(
  id: string,
  status: FriendRequestStatus
): Promise<void> {
  const { error } = await getSupabase()
    .from('friend_requests')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteFriendRequestRemote(id: string): Promise<void> {
  const { error } = await getSupabase().from('friend_requests').delete().eq('id', id);
  if (error) throw error;
}

/** 두 사용자 사이의 수락된(=친구) 신청 행 삭제 — 친구 해제 */
export async function removeFriendRemote(userA: string, userB: string): Promise<void> {
  const { error } = await getSupabase()
    .from('friend_requests')
    .delete()
    .eq('status', 'accepted')
    .or(
      `and(from_user_id.eq.${userA},to_user_id.eq.${userB}),and(from_user_id.eq.${userB},to_user_id.eq.${userA})`
    );
  if (error) throw error;
}

// ===================== 코치 공지 =====================

type DbCoachAnnouncement = {
  id: string;
  author_id: string | null;
  author_name: string;
  title: string;
  message: string;
  pinned: boolean;
  created_at: string;
};

function mapAnnouncement(r: DbCoachAnnouncement): CoachAnnouncement {
  return {
    id: r.id,
    authorId: r.author_id ?? '',
    authorName: r.author_name,
    title: r.title,
    message: r.message,
    pinned: r.pinned,
    createdAt: r.created_at,
  };
}

export async function fetchCoachAnnouncements(): Promise<CoachAnnouncement[]> {
  const { data, error } = await getSupabase()
    .from('coach_announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data as DbCoachAnnouncement[]).map(mapAnnouncement);
}

export async function insertCoachAnnouncementRemote(
  a: CoachAnnouncement
): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('coach_announcements')
    .insert({
      author_id: a.authorId || null,
      author_name: a.authorName,
      title: a.title,
      message: a.message,
      pinned: a.pinned ?? false,
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string })?.id ?? null;
}

export async function deleteCoachAnnouncementRemote(id: string): Promise<void> {
  const { error } = await getSupabase().from('coach_announcements').delete().eq('id', id);
  if (error) throw error;
}

// ===================== 레슨 대기열 =====================

type DbLessonQueue = {
  id: string;
  user_id: string;
  user_name: string;
  position: number;
  status: LessonQueueEntry['status'];
  joined_at: string;
};

function mapQueueEntry(r: DbLessonQueue): LessonQueueEntry {
  return {
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    position: r.position,
    status: r.status,
    joinedAt: r.joined_at,
  };
}

export async function fetchLessonQueue(): Promise<LessonQueueEntry[]> {
  const { data, error } = await getSupabase()
    .from('lesson_queue')
    .select('*')
    .neq('status', 'done')
    .order('position', { ascending: true });
  if (error) throw error;
  return (data as DbLessonQueue[]).map(mapQueueEntry);
}

export async function insertLessonQueueRemote(entry: LessonQueueEntry): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('lesson_queue')
    .insert({
      user_id: entry.userId,
      user_name: entry.userName,
      position: entry.position,
      status: entry.status,
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string })?.id ?? null;
}

export async function updateLessonQueueRemote(
  id: string,
  patch: Partial<Pick<LessonQueueEntry, 'position' | 'status'>>
): Promise<void> {
  const { error } = await getSupabase().from('lesson_queue').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteLessonQueueRemote(id: string): Promise<void> {
  const { error } = await getSupabase().from('lesson_queue').delete().eq('id', id);
  if (error) throw error;
}

// ===================== 파트너 모집방 =====================

type DbTeamRoom = {
  id: string;
  host_id: string;
  host_name: string;
  title: string;
  min_rank: string | null;
  max_rank: string | null;
  members: TeamMember[];
  min_members: number;
  max_members: number;
  status: TeamRoom['status'];
  password?: string | null;
  has_password?: boolean;
  created_at: string;
};

function mapTeamRoom(r: DbTeamRoom): TeamRoom {
  return {
    id: r.id,
    hostId: r.host_id,
    hostName: r.host_name,
    title: r.title,
    minRank: (r.min_rank as RankTier | null) ?? undefined,
    maxRank: (r.max_rank as RankTier | null) ?? undefined,
    members: Array.isArray(r.members) ? r.members : [],
    minMembers: r.min_members,
    maxMembers: r.max_members,
    status: r.status,
    createdAt: r.created_at,
    hasPassword: Boolean(r.has_password ?? r.password),
  } as TeamRoom;
}

export async function fetchTeamRooms(): Promise<TeamRoom[]> {
  const { data, error } = await getSupabase()
    .from('team_rooms_public')
    .select('*')
    .neq('status', 'closed')
    .order('created_at', { ascending: false });
  if (error) {
    // 마이그레이션 미적용·권한 오류 시 로비만 빈 목록으로 두고 앱은 계속 동작
    if (__DEV__) console.warn('[fetchTeamRooms]', error.message, error.code);
    return [];
  }
  return (data as DbTeamRoom[]).map(mapTeamRoom);
}

export async function verifyTeamRoomPasswordRemote(
  roomId: string,
  password?: string
): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('rpc_verify_team_room_password', {
    p_room_id: roomId,
    p_password: password ?? null,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function insertTeamRoomRemote(room: TeamRoom): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('team_rooms')
    .insert({
      host_id: room.hostId,
      host_name: room.hostName,
      title: room.title,
      min_rank: room.minRank ?? null,
      max_rank: room.maxRank ?? null,
      members: room.members,
      min_members: room.minMembers,
      max_members: room.maxMembers,
      status: room.status,
      password: (room as { password?: string }).password ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string })?.id ?? null;
}

export async function updateTeamRoomRemote(
  id: string,
  patch: {
    members?: TeamMember[];
    status?: TeamRoom['status'];
    hostId?: string;
    hostName?: string;
  }
): Promise<void> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.members !== undefined) dbPatch.members = patch.members;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.hostId !== undefined) dbPatch.host_id = patch.hostId;
  if (patch.hostName !== undefined) dbPatch.host_name = patch.hostName;
  const { error } = await getSupabase().from('team_rooms').update(dbPatch).eq('id', id);
  if (error) throw error;
}

export async function deleteTeamRoomRemote(id: string): Promise<void> {
  const { error } = await getSupabase().from('team_rooms').delete().eq('id', id);
  if (error) throw error;
}

// ===================== Realtime =====================

function subscribeTable(channelName: string, table: string, onChange: () => void): () => void {
  const client = getSupabase();
  const channel = client
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange())
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

export function subscribeFriendRequests(onChange: () => void): () => void {
  return subscribeTable('friend-requests-realtime', 'friend_requests', onChange);
}

export function subscribeCoachAnnouncements(onChange: () => void): () => void {
  return subscribeTable('coach-announcements-realtime', 'coach_announcements', onChange);
}

export function subscribeLessonQueue(onChange: () => void): () => void {
  return subscribeTable('lesson-queue-realtime', 'lesson_queue', onChange);
}

export function subscribeTeamRooms(onChange: () => void): () => void {
  return subscribeTable('team-rooms-realtime', 'team_rooms', onChange);
}

export function subscribeNotifications(userId: string, onChange: () => void): () => void {
  const client = getSupabase();
  const channel = client
    .channel('notifications-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      () => onChange()
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

export function subscribeMatchResults(onChange: () => void): () => void {
  return subscribeTable('match-results-realtime', 'match_results', onChange);
}

export function subscribeCleaningSubmissions(onChange: () => void): () => void {
  return subscribeTable('cleaning-realtime', 'cleaning_submissions', onChange);
}

export function subscribeAdminLogs(onChange: () => void): () => void {
  return subscribeTable('admin-logs-realtime', 'admin_logs', onChange);
}
