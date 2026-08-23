import { getSupabase, isSupabaseEnabled } from '@/src/lib/supabase';
import type { ActivitySession, ClubEvent, LobbyExpiryConfig, SiteOverlay } from '@/src/types';
import { normalizeSchedule } from '@/src/utils/activitySchedule';
import { normalizeClubEvents, normalizeOverlays } from '@/src/utils/siteOps';
import { normalizeLobbyExpiry } from '@/src/utils/lobbyExpiry';
import { normalizePeakHours } from '@/src/utils/peakHours';

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

export async function fetchEloFeaturesEnabled(): Promise<boolean> {
  if (!isSupabaseEnabled()) return true;
  const { data, error } = await getSupabase()
    .from('club_metadata')
    .select('elo_features_enabled')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    if (__DEV__ && !isMissingColumnError(error.message)) {
      console.warn('[club] fetchEloFeaturesEnabled', error.message);
    }
    return true;
  }
  const raw = (data as { elo_features_enabled?: boolean | null } | null)?.elo_features_enabled;
  return raw !== false;
}

export async function fetchReservationEnabled(): Promise<boolean> {
  if (!isSupabaseEnabled()) return false;
  const { data, error } = await getSupabase()
    .from('club_metadata')
    .select('reservation_enabled')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    if (__DEV__ && !isMissingColumnError(error.message)) {
      console.warn('[club] fetchReservationEnabled', error.message);
    }
    return false;
  }
  const raw = (data as { reservation_enabled?: boolean | null } | null)?.reservation_enabled;
  return raw === true;
}

export async function fetchPointsFeaturesEnabled(): Promise<boolean> {
  if (!isSupabaseEnabled()) return true;
  const { data, error } = await getSupabase()
    .from('club_metadata')
    .select('points_features_enabled')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    if (__DEV__ && !isMissingColumnError(error.message)) {
      console.warn('[club] fetchPointsFeaturesEnabled', error.message);
    }
    return true;
  }
  const raw = (data as { points_features_enabled?: boolean | null } | null)?.points_features_enabled;
  return raw !== false;
}

export async function setEloFeaturesEnabledRemote(enabled: boolean): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('rpc_set_elo_features_enabled', {
    p_enabled: enabled,
  });
  if (error) {
    if (isMissingColumnError(error.message) || error.message?.includes('rpc_set_elo_features_enabled')) {
      throw new Error(
        'Elo 기능 스위치 DB가 아직 없어요. Supabase에서 030_elo_features.sql 을 실행해 주세요.'
      );
    }
    throw error;
  }
  return Boolean(data ?? enabled);
}

export async function setReservationEnabledRemote(enabled: boolean): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('rpc_set_reservation_enabled', {
    p_enabled: enabled,
  });
  if (error) {
    if (isMissingColumnError(error.message) || error.message?.includes('rpc_set_reservation_enabled')) {
      throw new Error(
        '코트 현황 모드 DB가 아직 없어요. Supabase에서 034_roles_occupancy_attendance.sql 을 실행해 주세요.'
      );
    }
    throw error;
  }
  return Boolean(data ?? enabled);
}

export async function setPointsFeaturesEnabledRemote(enabled: boolean): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('rpc_set_points_features_enabled', {
    p_enabled: enabled,
  });
  if (error) {
    if (
      isMissingColumnError(error.message) ||
      error.message?.includes('rpc_set_points_features_enabled')
    ) {
      throw new Error(
        '포인트 기능 스위치 DB가 아직 없어요. Supabase에서 034_roles_occupancy_attendance.sql 을 실행해 주세요.'
      );
    }
    throw error;
  }
  return Boolean(data ?? enabled);
}

export async function purgeStaleGuestsRemote(): Promise<number> {
  const { data, error } = await getSupabase().rpc('rpc_purge_stale_guests');
  if (error) {
    if (isMissingColumnError(error.message) || error.message?.includes('rpc_purge_stale_guests')) {
      return 0;
    }
    throw error;
  }
  const raw = data as { deleted?: number } | null;
  return raw?.deleted ?? 0;
}

export function subscribeClubFlags(onChange: () => void): () => void {
  const client = getSupabase();
  const channel = client
    .channel('club-metadata-flags')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'club_metadata' }, () => {
      onChange();
    })
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
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
        '휴관·배너 DB 설정이 아직 없어요. Supabase에서 026_site_overlays_events_wait.sql 을 실행해 주세요.'
      );
    }
    throw error;
  }
  return Boolean(data ?? true);
}

export async function fetchLobbyExpiry(): Promise<LobbyExpiryConfig | null> {
  if (!isSupabaseEnabled()) return null;
  const { data, error } = await getSupabase()
    .from('club_metadata')
    .select('lobby_expiry')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    if (__DEV__ && !isMissingColumnError(error.message)) {
      console.warn('[club] fetchLobbyExpiry', error.message);
    }
    return null;
  }
  const raw = (data as { lobby_expiry?: unknown } | null)?.lobby_expiry;
  if (raw == null) return null;
  return normalizeLobbyExpiry(raw);
}

export async function setLobbyExpiryRemote(config: LobbyExpiryConfig): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('rpc_set_lobby_expiry', {
    p_expiry: config,
  });
  if (error) {
    if (isMissingColumnError(error.message) || error.message?.includes('rpc_set_lobby_expiry')) {
      throw new Error(
        '모집방 만료 DB 설정이 아직 없어요. Supabase에서 027_lobby_join_expiry.sql 을 실행해 주세요.'
      );
    }
    throw error;
  }
  return Boolean(data ?? true);
}

export async function fetchPeakHours(): Promise<number[] | null> {
  if (!isSupabaseEnabled()) return null;
  const { data, error } = await getSupabase()
    .from('club_metadata')
    .select('peak_hours')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    if (__DEV__ && !isMissingColumnError(error.message)) {
      console.warn('[club] fetchPeakHours', error.message);
    }
    return null;
  }
  const raw = (data as { peak_hours?: unknown } | null)?.peak_hours;
  if (raw == null) return null;
  return normalizePeakHours(raw);
}

export async function setPeakHoursRemote(hours: number[]): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('rpc_set_peak_hours', {
    p_hours: hours,
  });
  if (error) {
    if (isMissingColumnError(error.message) || error.message?.includes('rpc_set_peak_hours')) {
      throw new Error(
        '피크 시간 DB 설정이 아직 없어요. Supabase에서 031_peak_hours.sql 을 실행해 주세요.'
      );
    }
    throw error;
  }
  return Boolean(data ?? true);
}

