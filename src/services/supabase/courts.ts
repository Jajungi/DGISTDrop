import { getSupabase } from '@/src/lib/supabase';
import { mapCourtRow, mapCourtToDb, type DbCourt } from '@/src/services/supabase/mappers';
import type { Court, CourtPlayer, GameMode, NantaHalf } from '@/src/types';

export async function fetchCourts(): Promise<Court[]> {
  const { data, error } = await getSupabase().from('courts').select('*').order('id');
  if (error) throw error;
  return (data as DbCourt[]).map(mapCourtRow);
}

/** 코트 예약 — 서버가 지오펜스·비용·중복·자격을 검증하고 포인트를 원자 차감 (rpc_reserve_court) */
export async function reserveCourtRemote(params: {
  courtId: number;
  gameCount: number;
  gameMode: GameMode;
  nantaHalf?: NantaHalf;
  players: CourtPlayer[];
  lat: number | null;
  lng: number | null;
}): Promise<void> {
  const { error } = await getSupabase().rpc('rpc_reserve_court', {
    p_court_id: params.courtId,
    p_game_count: params.gameCount,
    p_game_mode: params.gameMode,
    p_nanta_half: params.nantaHalf ?? null,
    p_players: params.players,
    p_lat: params.lat,
    p_lng: params.lng,
  });
  if (error) throw error;
}

export async function setCourtOccupancyRemote(courtId: number, occupied: boolean): Promise<void> {
  const { error } = await getSupabase().rpc('rpc_set_court_occupancy', {
    p_court_id: courtId,
    p_occupied: occupied,
  });
  if (error) throw error;
}

export type CourtSetupState = 'unset' | 'ready' | 'active';

export async function setCourtSetupStateRemote(
  courtId: number,
  state: CourtSetupState
): Promise<void> {
  const { error } = await getSupabase().rpc('rpc_set_court_setup_state', {
    p_court_id: courtId,
    p_state: state,
  });
  if (error) throw error;
}

export function mapCourtRpcError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const m = raw.toLowerCase();
  if (m.includes('reservation disabled')) return '지금은 현황 모드예요. 예약할 수 없어요.';
  if (m.includes('already has an active court')) {
    return '이미 다른 코트를 이용 중이에요. 반납한 뒤 다시 예약해 주세요.';
  }
  if (m.includes('court not available') || m.includes('court already in use')) {
    return '이 코트는 이미 사용 중이에요.';
  }
  if (m.includes('staff only')) return '운영진만 코트 현황을 바꿀 수 있어요.';
  if (
    m.includes('rpc_set_court_setup_state') ||
    m.includes('pgrst202') ||
    m.includes('could not find the function')
  ) {
    return '코트 3단계 현황 DB가 아직 없어요. Supabase에서 048_court_setup_and_lesson_timer.sql 을 실행해 주세요.';
  }
  if (m.includes('insufficient points')) return '포인트가 부족해요.';
  if (m.includes('outside gym fence') || m.includes('location required')) {
    return '체육관 근처에서만 예약할 수 있어요.';
  }
  if (m.includes('peak reservation')) return '피크타임 예약 횟수를 모두 썼어요.';
  if (m.includes('034_')) return raw;
  return raw.replace(/^.*error:\s*/i, '') || '코트 요청에 실패했어요.';
}

export async function upsertCourt(court: Court): Promise<void> {
  const row = mapCourtToDb(court);
  // 9개 코트는 고정 행이므로 UPDATE만 (RLS INSERT 권한 불필요)
  const { error } = await getSupabase().from('courts').update(row).eq('id', court.id);
  if (!error) return;
  const msg = error.message?.toLowerCase() ?? '';
  // 026 미적용: wait_queue 컬럼 없음 → 해당 필드만 빼고 재시도
  if (msg.includes('wait_queue') || msg.includes('42703')) {
    const { wait_queue: _wq, ...rest } = row as Record<string, unknown>;
    const { error: retryErr } = await getSupabase().from('courts').update(rest).eq('id', court.id);
    if (retryErr) throw retryErr;
    return;
  }
  throw error;
}

export function subscribeCourts(onChange: (courts: Court[]) => void): () => void {
  const client = getSupabase();
  let active = true;

  const reload = async () => {
    try {
      const courts = await fetchCourts();
      if (active && courts.length) onChange(courts);
    } catch {
      /* ignore transient errors */
    }
  };

  void reload();

  const channel = client
    .channel('courts-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'courts' }, () => {
      void reload();
    })
    .subscribe();

  return () => {
    active = false;
    void client.removeChannel(channel);
  };
}

export function subscribeProfiles(onChange: () => void): () => void {
  const client = getSupabase();
  const channel = client
    .channel('profiles-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
      onChange();
    })
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
