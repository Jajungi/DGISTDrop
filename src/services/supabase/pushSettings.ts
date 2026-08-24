import { getSupabase, isSupabaseEnabled } from '@/src/lib/supabase';

/** 웹 푸시는 사람당 최근 구독 1개만 유지 (PC·폰 웹 합산). */
export const MAX_WEB_PUSH_PER_USER = 1;

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

export type PushTokenKind = 'app' | 'web' | 'other';

export type PushTokenHeavyUser = {
  userId: string;
  name: string;
  total: number;
  app: number;
  web: number;
};

export type PushTokenStats = {
  total: number;
  users: number;
  app: number;
  web: number;
  other: number;
  android: number;
  removable: number;
  extraWeb: number;
  heavy: PushTokenHeavyUser[];
};

type PushTokenRow = {
  token: string;
  platform?: string | null;
  user_id: string;
  updated_at?: string | null;
  created_at?: string | null;
};

type ProfileLite = {
  id: string;
  name?: string | null;
  member_status?: string | null;
  membership_tier?: string | null;
};

export function classifyPushToken(token: string, platform?: string | null): PushTokenKind {
  if (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')) return 'app';
  if (token.startsWith('{') && token.includes('"endpoint"')) return 'web';
  if (platform === 'web') return 'web';
  if (platform === 'android' || platform === 'ios') return 'app';
  return 'other';
}

function isApprovedMember(profile: ProfileLite | undefined): boolean {
  if (!profile) return false;
  if (profile.member_status !== 'approved') return false;
  return (profile.membership_tier ?? 'guest') !== 'guest';
}

function tokenTime(row: PushTokenRow): number {
  const raw = row.updated_at || row.created_at;
  const ms = raw ? Date.parse(raw) : 0;
  return Number.isFinite(ms) ? ms : 0;
}

/** 사람당 웹 구독이 MAX_WEB_PUSH_PER_USER를 넘으면 최근 것만 남기고 나머지를 반환 */
export function extraWebTokens(rows: PushTokenRow[]): string[] {
  const byUser = new Map<string, PushTokenRow[]>();
  for (const row of rows) {
    if (classifyPushToken(row.token, row.platform) !== 'web') continue;
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }
  const extra: string[] = [];
  for (const list of byUser.values()) {
    if (list.length <= MAX_WEB_PUSH_PER_USER) continue;
    list.sort((a, b) => tokenTime(b) - tokenTime(a));
    extra.push(...list.slice(MAX_WEB_PUSH_PER_USER).map((row) => row.token));
  }
  return extra;
}

function summarizeTokens(rows: PushTokenRow[], profiles: ProfileLite[]): PushTokenStats {
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  let app = 0;
  let web = 0;
  let other = 0;
  let removable = 0;
  const perUser = new Map<string, PushTokenHeavyUser>();

  for (const row of rows) {
    const kind = classifyPushToken(row.token, row.platform);
    if (kind === 'app') app += 1;
    else if (kind === 'web') web += 1;
    else other += 1;

    const profile = profileById.get(row.user_id);
    if (!isApprovedMember(profile)) removable += 1;

    const current = perUser.get(row.user_id) ?? {
      userId: row.user_id,
      name: profile?.name?.trim() || '이름 없음',
      total: 0,
      app: 0,
      web: 0,
    };
    current.total += 1;
    if (kind === 'app') current.app += 1;
    if (kind === 'web') current.web += 1;
    perUser.set(row.user_id, current);
  }

  const heavy = [...perUser.values()]
    .filter((u) => u.total >= 2)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return {
    total: rows.length,
    users: perUser.size,
    app,
    web,
    other,
    android: app,
    removable,
    extraWeb: extraWebTokens(rows).length,
    heavy,
  };
}

async function fetchTokenRows(): Promise<PushTokenRow[]> {
  const { data, error } = await getSupabase()
    .from('push_tokens')
    .select('token, platform, user_id, updated_at, created_at');
  if (error) throw error;
  return (data ?? []) as PushTokenRow[];
}

async function fetchProfileLites(userIds: string[]): Promise<ProfileLite[]> {
  if (!userIds.length) return [];
  const unique = [...new Set(userIds)];
  const rows: ProfileLite[] = [];
  for (let i = 0; i < unique.length; i += 80) {
    const { data, error } = await getSupabase()
      .from('profiles')
      .select('id, name, member_status, membership_tier')
      .in('id', unique.slice(i, i + 80));
    if (error) throw error;
    rows.push(...((data ?? []) as ProfileLite[]));
  }
  return rows;
}

export async function fetchPushTokenStats(): Promise<PushTokenStats> {
  const rows = await fetchTokenRows();
  const profiles = await fetchProfileLites([...new Set(rows.map((r) => r.user_id))]);
  return summarizeTokens(rows, profiles);
}

async function deleteTokenChunks(tokens: string[]): Promise<number> {
  const unique = [...new Set(tokens.filter(Boolean))];
  if (!unique.length) return 0;
  let removed = 0;
  for (let i = 0; i < unique.length; i += 80) {
    const chunk = unique.slice(i, i + 80);
    const { error, count } = await getSupabase()
      .from('push_tokens')
      .delete({ count: 'exact' })
      .in('token', chunk);
    if (error) throw error;
    removed += count ?? chunk.length;
  }
  return removed;
}

export async function prunePushTokens(): Promise<{
  unapproved: number;
  invalid: number;
  extraWeb: number;
  old_logs: number;
  removed: number;
}> {
  const { data, error } = await getSupabase().rpc('rpc_prune_push_tokens');
  if (error) throw error;
  const raw = (data ?? {}) as Record<string, unknown>;
  const unapproved = Number(raw.unapproved) || 0;
  const rpcExtraWeb = Number(raw.extra_web ?? raw.duplicates) || 0;
  const oldLogs = Number(raw.old_logs) || 0;

  const rows = await fetchTokenRows();
  const invalid = rows
    .filter((row) => classifyPushToken(row.token, row.platform) === 'other')
    .map((row) => row.token);
  // RPC가 아직 구버전이면 클라이언트에서 사람당 웹 1개로 한 번 더 정리
  const leftoverExtra = extraWebTokens(rows.filter((row) => !invalid.includes(row.token)));
  await deleteTokenChunks([...invalid, ...leftoverExtra]);
  const extraWeb = rpcExtraWeb + leftoverExtra.length;

  return {
    unapproved,
    invalid: invalid.length,
    extraWeb,
    old_logs: oldLogs,
    removed: unapproved + extraWeb + invalid.length,
  };
}

export async function invokeBroadcastPush(input: {
  title: string;
  message: string;
  type?: string;
}): Promise<{ sent: number; expo?: number; web?: number; pruned?: number }> {
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
