import { getSupabase, isSupabaseEnabled } from '@/src/lib/supabase';
import type { ActivitySession, ClubEvent, SiteOverlay } from '@/src/types';
import { normalizeSchedule } from '@/src/utils/activitySchedule';
import { normalizeClubEvents, normalizeOverlays } from '@/src/utils/siteOps';

function isMissingColumnError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes('does not exist') || m.includes('could not find') || m.includes('42703');
}

export async function fetchOpenRegistration(): Promise<boolean> {
  if (!isSupabaseEnabled()) return true;
  const { data, error } = await getSupabase()
    .from('club_metadata')
    .select('open_registration')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    if (__DEV__) console.warn('[club] fetchOpenRegistration', error.message);
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
    if (__DEV__ && !isMissingColumnError(error.message)) {
      console.warn('[club] fetchActivitySchedule', error.message);
    }
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
  if (error) {
    if (isMissingColumnError(error.message) || error.message?.includes('rpc_set_activity_schedule')) {
      throw new Error(
        '활동 시간 DB 설정이 아직 없어요. Supabase에서 024_activity_schedule.sql 을 실행해 주세요.'
      );
    }
    throw error;
  }
  return Boolean(data ?? true);
}

export async function fetchSiteOverlays(): Promise<SiteOverlay[] | null> {
  if (!isSupabaseEnabled()) return null;
  const { data, error } = await getSupabase()
    .from('club_metadata')
    .select('site_overlays')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    if (__DEV__ && !isMissingColumnError(error.message)) {
      console.warn('[club] fetchSiteOverlays', error.message);
    }
    return null;
  }
  const raw = (data as { site_overlays?: unknown } | null)?.site_overlays;
  return normalizeOverlays(raw);
}

export async function setSiteOverlaysRemote(overlays: SiteOverlay[]): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('rpc_set_site_overlays', {
    p_overlays: overlays,
  });
  if (error) {
    if (isMissingColumnError(error.message) || error.message?.includes('rpc_set_site_overlays')) {
      throw new Error(
        '화면 공지 DB 설정이 아직 없어요. Supabase에서 026_site_overlays_events_wait.sql 을 실행해 주세요.'
      );
    }
    throw error;
  }
  return Boolean(data ?? true);
}

export async function fetchClubEvents(): Promise<ClubEvent[] | null> {
  if (!isSupabaseEnabled()) return null;
  const { data, error } = await getSupabase()
    .from('club_metadata')
    .select('club_events')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    if (__DEV__ && !isMissingColumnError(error.message)) {
      console.warn('[club] fetchClubEvents', error.message);
    }
    return null;
  }
  const raw = (data as { club_events?: unknown } | null)?.club_events;
  return normalizeClubEvents(raw);
}

export async function setClubEventsRemote(events: ClubEvent[]): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('rpc_set_club_events', {
    p_events: events,
  });
  if (error) {
    if (isMissingColumnError(error.message) || error.message?.includes('rpc_set_club_events')) {
      throw new Error(
        '휴관·특강 DB 설정이 아직 없어요. Supabase에서 026_site_overlays_events_wait.sql 을 실행해 주세요.'
      );
    }
    throw error;
  }
  return Boolean(data ?? true);
}
