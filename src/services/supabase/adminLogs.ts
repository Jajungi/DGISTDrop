import { getSupabase } from '@/src/lib/supabase';
import type { AdminLogEntry, AdminLogCategory } from '@/src/types';
import { DATA_RETENTION } from '@/src/constants/dataRetention';

export async function clearAdminLogsRemote(): Promise<void> {
  const supabase = getSupabase();
  const { error: rpcError } = await supabase.rpc('rpc_clear_admin_logs');
  if (!rpcError) return;

  const { error: deleteError } = await supabase.from('admin_logs').delete().not('id', 'is', null);
  if (!deleteError) return;

  throw deleteError ?? rpcError;
}

type DbAdminLog = {
  id: string;
  category: string;
  action: string;
  message: string;
  actor_id: string | null;
  actor_name: string | null;
  target_id: string | null;
  target_name: string | null;
  meta: Record<string, string | number> | null;
  created_at: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapAdminLogRow(row: DbAdminLog): AdminLogEntry {
  return {
    id: row.id,
    category: (row.category as AdminLogCategory) ?? 'system',
    action: row.action,
    message: row.message,
    actorId: row.actor_id ?? undefined,
    actorName: row.actor_name ?? undefined,
    targetId: row.target_id ?? undefined,
    targetName: row.target_name ?? undefined,
    meta: row.meta ?? undefined,
    createdAt: row.created_at,
  };
}

export async function insertAdminLogRemote(entry: AdminLogEntry): Promise<void> {
  const { error } = await getSupabase().from('admin_logs').insert({
    category: entry.category,
    action: entry.action,
    message: entry.message,
    // actor_id 는 profiles FK — 유효한 uuid 만 전달
    actor_id: entry.actorId && UUID_RE.test(entry.actorId) ? entry.actorId : null,
    actor_name: entry.actorName ?? null,
    target_id: entry.targetId ?? null,
    target_name: entry.targetName ?? null,
    meta: entry.meta ?? null,
  });
  if (error) throw error;
}

export async function fetchAdminLogs(): Promise<AdminLogEntry[]> {
  const { data, error } = await getSupabase()
    .from('admin_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(DATA_RETENTION.adminLogsDisplay);
  if (error) throw error;
  return (data as DbAdminLog[]).map(mapAdminLogRow);
}
