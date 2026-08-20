import { getSupabase, isSupabaseEnabled } from '@/src/lib/supabase';

export interface PushNotifySettings {
  enabled: boolean;
  auto_notify_enabled: boolean;
  notify_time: string;
  message_template: string;
  cancel_today: boolean;
  cancel_message: string;
  last_auto_sent_date: string | null;
}

export interface PushNotifyLog {
  id: string;
  type: string;
  title: string;
  message: string;
  recipient_count: number;
  sent_by: string | null;
  sent_at: string;
}

export const DEFAULT_PUSH_SETTINGS: PushNotifySettings = {
  enabled: true,
  auto_notify_enabled: true,
  notify_time: '18:00',
  message_template: '🏸 오늘 {time}부터 활동 있습니다! 앱에서 출석·코트를 확인하세요.',
  cancel_today: false,
  cancel_message: '❌ 오늘 활동이 취소되었습니다.',
  last_auto_sent_date: null,
};

function normalizeSettings(raw: unknown): PushNotifySettings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<PushNotifySettings>;
  return {
    enabled: s.enabled ?? DEFAULT_PUSH_SETTINGS.enabled,
    auto_notify_enabled: s.auto_notify_enabled ?? DEFAULT_PUSH_SETTINGS.auto_notify_enabled,
    notify_time: s.notify_time ?? DEFAULT_PUSH_SETTINGS.notify_time,
    message_template: s.message_template ?? DEFAULT_PUSH_SETTINGS.message_template,
    cancel_today: s.cancel_today ?? DEFAULT_PUSH_SETTINGS.cancel_today,
    cancel_message: s.cancel_message ?? DEFAULT_PUSH_SETTINGS.cancel_message,
    last_auto_sent_date: s.last_auto_sent_date ?? null,
  };
}

export async function fetchPushNotifySettings(): Promise<PushNotifySettings> {
  if (!isSupabaseEnabled()) return DEFAULT_PUSH_SETTINGS;
  const { data, error } = await getSupabase()
    .from('club_metadata')
    .select('push_notify_settings')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return normalizeSettings(
    (data as { push_notify_settings?: unknown } | null)?.push_notify_settings
  );
}

export async function savePushNotifySettings(
  settings: PushNotifySettings
): Promise<PushNotifySettings> {
  const { error } = await getSupabase().rpc('rpc_set_push_notify_settings', {
    p_settings: settings,
  });
  if (error) throw error;
  return settings;
}

export async function toggleActivityCancelToday(cancel: boolean): Promise<PushNotifySettings> {
  const { data, error } = await getSupabase().rpc('rpc_toggle_activity_cancel_today', {
    p_cancel: cancel,
  });
  if (error) throw error;
  return normalizeSettings(data);
}

export async function fetchPushNotifyLogs(limit = 20): Promise<PushNotifyLog[]> {
  const { data, error } = await getSupabase()
    .from('push_notify_log')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PushNotifyLog[];
}

export async function fetchPushTokenStats(): Promise<{ total: number; android: number; web: number }> {
  const { data, error } = await getSupabase().from('push_tokens').select('platform');
  if (error) throw error;
  const rows = data ?? [];
  return {
    total: rows.length,
    android: rows.filter((r) => r.platform === 'android').length,
    web: rows.filter((r) => r.platform === 'web').length,
  };
}

export async function invokeBroadcastPush(input: {
  title: string;
  message: string;
  type?: string;
}): Promise<{ sent: number; expo?: number; web?: number }> {
  const { data, error } = await getSupabase().functions.invoke('broadcast-push', {
    body: input,
  });
  if (error) {
    const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
    let detail = error.message;
    try {
      const body = ctx && typeof ctx.json === 'function' ? await ctx.json() : null;
      if (body && typeof body === 'object' && 'error' in body) {
        detail = String((body as { error: unknown }).error);
      }
    } catch {
      /* keep message */
    }
    throw new Error(detail);
  }
  return (data ?? { sent: 0 }) as { sent: number; expo?: number; web?: number };
}
