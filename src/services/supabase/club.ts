import { getSupabase, isSupabaseEnabled } from '@/src/lib/supabase';
import type { ActivitySession } from '@/src/types';
import { normalizeSchedule } from '@/src/utils/activitySchedule';

export async function fetchOpenRegistration(): Promise<boolean> {
  if (!isSupabaseEnabled()) return true;
  const { data, error } = await getSupabase()
    .from('club_metadata')
    .select('open_registration')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    console.warn('[club] fetchOpenRegistration', error.message);
    return true;
  }
  return (data as { open_registration?: boolean } | null)?.open_registration ?? true;
}

export async function setOpenRegistrationRemote(enabled: boolean): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('rpc_set_open_registration', {
    p_enabled: enabled,
  });
  if (error) throw error;
  return Boolean(data ?? enabled);
}

export async function fetchActivitySchedule(): Promise<ActivitySession[] | null> {
  if (!isSupabaseEnabled()) return null;
  const { data, error } = await getSupabase()
    .from('club_metadata')
    .select('activity_schedule')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    console.warn('[club] fetchActivitySchedule', error.message);
    return null;
  }
  const raw = (data as { activity_schedule?: unknown } | null)?.activity_schedule;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return normalizeSchedule(raw as ActivitySession[]);
}

export async function setActivityScheduleRemote(sessions: ActivitySession[]): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('rpc_set_activity_schedule', {
    p_schedule: sessions,
  });
  if (error) throw error;
  return Boolean(data ?? true);
}
