import { getSupabase } from '@/src/lib/supabase';
import type { AppNotification, AppNotificationType } from '@/src/types';
import { DATA_RETENTION } from '@/src/constants/dataRetention';

type DbNotification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  kind: string;
  court_id: number | null;
  room_id: string | null;
  read_at: string | null;
  created_at: string;
};

function mapNotificationRow(row: DbNotification): AppNotification {
  return {
    id: row.id,
    type: (row.kind as AppNotificationType) ?? 'system',
    title: row.title,
    message: row.message,
    read: row.read_at != null,
    createdAt: row.created_at,
    courtId: row.court_id ?? undefined,
    roomId: row.room_id ?? undefined,
    targetUserId: row.user_id,
  };
}

/** 알림 전송 — 타인에게는 rpc_send_notification 사용 */
export async function insertNotificationRemote(n: AppNotification): Promise<void> {
  if (!n.targetUserId) return;

  const { data: session } = await getSupabase().auth.getSession();
  const actorId = session.session?.user.id;

  if (actorId && n.targetUserId === actorId) {
    const { error } = await getSupabase().from('notifications').insert({
      user_id: n.targetUserId,
      title: n.title,
      message: n.message,
      kind: n.type,
      court_id: n.courtId ?? null,
      room_id: n.roomId ?? null,
    });
    if (error) throw error;
    return;
  }

  const { error } = await getSupabase().rpc('rpc_send_notification', {
    p_target_user_id: n.targetUserId,
    p_title: n.title,
    p_message: n.message,
    p_kind: n.type,
    p_court_id: n.courtId ?? null,
    p_room_id: n.roomId ?? null,
  });
  if (error) throw error;
}

export async function markNotificationReadRemote(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsReadRemote(userId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throw error;
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await getSupabase()
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(DATA_RETENTION.inboxDisplay);
  if (error) throw error;
  return (data as DbNotification[]).map(mapNotificationRow);
}
