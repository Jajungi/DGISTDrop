import { getSupabase, isSupabaseEnabled } from '@/src/lib/supabase';

export interface UserNotificationPrefs {
  activityEvening: boolean;
  lessonTurn: boolean;
  coachNotice: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: UserNotificationPrefs = {
  activityEvening: true,
  lessonTurn: true,
  coachNotice: true,
};

function isMissingRelation(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes('does not exist') ||
    m.includes('could not find') ||
    m.includes('42p01') ||
    m.includes('42703')
  );
}

export async function fetchNotificationPrefs(userId: string): Promise<UserNotificationPrefs> {
  if (!isSupabaseEnabled()) return DEFAULT_NOTIFICATION_PREFS;
  const { data, error } = await getSupabase()
    .from('user_notification_prefs')
    .select('activity_evening, lesson_turn, coach_notice')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    if (!isMissingRelation(error.message) && __DEV__) {
      console.warn('[notif-prefs] fetch', error.message);
    }
    return DEFAULT_NOTIFICATION_PREFS;
  }
  if (!data) return DEFAULT_NOTIFICATION_PREFS;
  const row = data as {
    activity_evening?: boolean;
    lesson_turn?: boolean;
    coach_notice?: boolean;
  };
  return {
    activityEvening: row.activity_evening ?? true,
    lessonTurn: row.lesson_turn ?? true,
    coachNotice: row.coach_notice ?? true,
  };
}

export async function saveNotificationPrefs(
  userId: string,
  prefs: UserNotificationPrefs
): Promise<void> {
  if (!isSupabaseEnabled()) return;
  const { error } = await getSupabase().from('user_notification_prefs').upsert(
    {
      user_id: userId,
      activity_evening: prefs.activityEvening,
      lesson_turn: prefs.lessonTurn,
      coach_notice: prefs.coachNotice,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error && !isMissingRelation(error.message)) throw error;
}

export async function fetchArrivalNotifyFriendIds(userId: string): Promise<string[]> {
  if (!isSupabaseEnabled()) return [];
  const { data, error } = await getSupabase()
    .from('friend_arrival_notify')
    .select('friend_id')
    .eq('user_id', userId);
  if (error) {
    if (!isMissingRelation(error.message) && __DEV__) {
      console.warn('[arrival-notify] fetch', error.message);
    }
    return [];
  }
  return (data ?? []).map((r: { friend_id: string }) => r.friend_id);
}

export async function setArrivalNotifyRemote(
  userId: string,
  friendId: string,
  on: boolean
): Promise<void> {
  if (!isSupabaseEnabled()) return;
  if (on) {
    const { error } = await getSupabase()
      .from('friend_arrival_notify')
      .upsert({ user_id: userId, friend_id: friendId }, { onConflict: 'user_id,friend_id' });
    if (error && !isMissingRelation(error.message)) throw error;
    return;
  }
  const { error } = await getSupabase()
    .from('friend_arrival_notify')
    .delete()
    .eq('user_id', userId)
    .eq('friend_id', friendId);
  if (error && !isMissingRelation(error.message)) throw error;
}
