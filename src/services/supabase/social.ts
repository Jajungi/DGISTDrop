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
    const la = (friendships[a] ??= []);
    const lb = (friendships[b] ??= []);
    if (!la.includes(b)) la.push(b);
    if (!lb.includes(a)) lb.push(a);
  };
  rows
    .filter((r) => r.status === 'accepted')
    .forEach((r) => addPair(r.fromUserId, r.toUserId));
  return { requests: rows, friendships };
}

export async function sendFriendRequestRemote(req: FriendRequest): Promise<string | null> {
  const sb = getSupabase();
  const { data: existing, error: findErr } = await sb
    .from('friend_requests')
    .select('*')
    .or(
      `and(from_user_id.eq.${req.fromUserId},to_user_id.eq.${req.toUserId}),and(from_user_id.eq.${req.toUserId},to_user_id.eq.${req.fromUserId})`
    );
  if (findErr) throw findErr;

  const rows = (existing as DbFriendRequest[]) ?? [];
  if (rows.some((r) => r.status === 'accepted')) return null;

  const minePending = rows.find(
    (r) => r.status === 'pending' && r.from_user_id === req.fromUserId
  );
  if (minePending) return minePending.id;

  if (rows.some((r) => r.status === 'pending' && r.from_user_id === req.toUserId)) {
    return null;
  }

  // 거절·기타 같은 방향 행이 있으면 insert 대신 pending으로 재사용 (038 unique)
  const mineSame = rows.find(
    (r) => r.from_user_id === req.fromUserId && r.to_user_id === req.toUserId
  );
  if (mineSame) {
    const now = new Date().toISOString();
    const { data, error } = await sb
      .from('friend_requests')
      .update({
        status: 'pending',
        from_user_name: req.fromUserName,
        to_user_name: req.toUserName,
        created_at: now,
        responded_at: null,
      })
      .eq('id', mineSame.id)
      .select('id')
      .single();
    if (error) throw error;
    return (data as { id: string })?.id ?? mineSame.id;
  }

  const { data, error } = await sb
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
  const sb = getSupabase();
  const { data: row, error: getErr } = await sb
    .from('friend_requests')
    .select('*')
    .eq('id', id)
    .single();
  if (getErr) throw getErr;

  const { error } = await sb
    .from('friend_requests')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;

  if (status === 'accepted' && row) {
    const r = row as DbFriendRequest;
    const { error: delErr } = await sb
      .from('friend_requests')
      .delete()
      .eq('status', 'pending')
      .eq('from_user_id', r.to_user_id)
      .eq('to_user_id', r.from_user_id);
    if (delErr) throw delErr;
  }
}

export async function deleteFriendRequestRemote(id: string): Promise<void> {
  const { error } = await getSupabase().from('friend_requests').delete().eq('id', id);
  if (error) throw error;
}

/** 두 사용자 사이의 친구 행(수락·남은 신청) 삭제 — 친구 해제 */
export async function removeFriendRemote(userA: string, userB: string): Promise<void> {
  const { error } = await getSupabase()
    .from('friend_requests')
    .delete()
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
  active_since?: string | null;
};

function mapQueueEntry(r: DbLessonQueue): LessonQueueEntry {
  return {
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    position: r.position,
    status: r.status,
    joinedAt: r.joined_at,
    activeSince: r.active_since ?? undefined,
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
  patch: Partial<Pick<LessonQueueEntry, 'position' | 'status' | 'activeSince'>>
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.position != null) row.position = patch.position;
  if (patch.status != null) row.status = patch.status;
  if (patch.activeSince !== undefined) row.active_since = patch.activeSince;
  const { error } = await getSupabase().from('lesson_queue').update(row).eq('id', id);
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
  join_requests?: TeamRoom['joinRequests'];
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
    joinRequests: Array.isArray(r.join_requests) ? r.join_requests : [],
  };
}

export async function fetchTeamRooms(): Promise<TeamRoom[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('team_rooms_public')
    .select('*')
    .neq('status', 'closed')
    .order('created_at', { ascending: false });
  if (!error) {
    return (data as DbTeamRoom[]).map(mapTeamRoom);
  }

  // 023 미적용 시: 비밀번호 제외 컬럼만 직접 조회 시도
  const fallback = await sb
    .from('team_rooms')
    .select(
      'id, host_id, host_name, title, min_rank, max_rank, members, min_members, max_members, status, created_at, join_requests'
    )
    .neq('status', 'closed')
    .order('created_at', { ascending: false });
  if (!fallback.error && fallback.data) {
    return (fallback.data as DbTeamRoom[]).map((r) =>
      mapTeamRoom({ ...r, has_password: false })
    );
  }

  // join_requests 컬럼 없는 구버전
  const legacy = await sb
    .from('team_rooms')
    .select(
      'id, host_id, host_name, title, min_rank, max_rank, members, min_members, max_members, status, created_at'
    )
    .neq('status', 'closed')
    .order('created_at', { ascending: false });
  if (!legacy.error && legacy.data) {
    return (legacy.data as DbTeamRoom[]).map((r) =>
      mapTeamRoom({ ...r, has_password: false, join_requests: [] })
    );
  }

  if (__DEV__) console.warn('[fetchTeamRooms]', error.message, error.code);
  return [];
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
  const base = {
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
  };
  const withJoin = { ...base, join_requests: room.joinRequests ?? [] };
  const { data, error } = await getSupabase()
    .from('team_rooms')
    .insert(withJoin)
    .select('id')
    .single();
  if (!error) return (data as { id: string })?.id ?? null;
  if (error.message?.includes('join_requests') || error.code === '42703') {
    const retry = await getSupabase().from('team_rooms').insert(base).select('id').single();
    if (retry.error) throw retry.error;
    return (retry.data as { id: string })?.id ?? null;
  }
  throw error;
}

export async function updateTeamRoomRemote(
  id: string,
  patch: {
    members?: TeamMember[];
    status?: TeamRoom['status'];
    hostId?: string;
    hostName?: string;
    joinRequests?: TeamRoom['joinRequests'];
  }
): Promise<void> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.members !== undefined) dbPatch.members = patch.members;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.hostId !== undefined) dbPatch.host_id = patch.hostId;
  if (patch.hostName !== undefined) dbPatch.host_name = patch.hostName;
  if (patch.joinRequests !== undefined) dbPatch.join_requests = patch.joinRequests;
  const { error } = await getSupabase().from('team_rooms').update(dbPatch).eq('id', id);
  if (error) {
    // 027 미적용: join_requests 빼고 재시도
    if (patch.joinRequests !== undefined && (error.message?.includes('join_requests') || error.code === '42703')) {
      const { join_requests: _jr, ...rest } = dbPatch;
      if (Object.keys(rest).length === 0) return;
      const retry = await getSupabase().from('team_rooms').update(rest).eq('id', id);
      if (retry.error) throw retry.error;
      return;
    }
    throw error;
  }
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
