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
