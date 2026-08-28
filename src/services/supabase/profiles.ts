import { getSupabase, isSupabaseEnabled } from '@/src/lib/supabase';
import { AVATAR_LIMITS } from '@/src/constants/dataRetention';
import { compressAvatarForUpload, avatarStoragePath } from '@/src/services/avatarImage';
import { mapProfileRow, type DbProfile } from '@/src/services/supabase/mappers';
import type { User } from '@/src/types';

export async function fetchAllProfiles(): Promise<User[]> {
  const { data, error } = await getSupabase().from('profiles').select('*').order('name');
  if (error) throw error;
  return (data as DbProfile[]).map(mapProfileRow);
}

export async function fetchProfileById(id: string): Promise<User | null> {
  const { data, error } = await getSupabase().from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProfileRow(data as DbProfile);
}

export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const compressed = await compressAvatarForUpload(localUri);
  const path = avatarStoragePath(userId);

  const blob = await uriToBlob(compressed.uri);
  const { error: uploadError } = await getSupabase()
    .storage
    .from(AVATAR_LIMITS.storageBucket)
    .upload(path, blob, {
      upsert: true,
      contentType: 'image/jpeg',
      cacheControl: '3600',
    });

  if (uploadError) throw uploadError;

  const { error: rpcError } = await getSupabase().rpc('rpc_set_avatar_path', { p_path: path });
  if (rpcError) throw rpcError;

  const { data } = getSupabase().storage.from(AVATAR_LIMITS.storageBucket).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function removeAvatar(userId: string): Promise<void> {
  const path = avatarStoragePath(userId);
  await getSupabase().storage.from(AVATAR_LIMITS.storageBucket).remove([path]);
  await getSupabase().rpc('rpc_set_avatar_path', { p_path: null });
}

async function uriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return res.blob();
}

export async function syncProfilePatch(
  userId: string,
  patch: Partial<
    Pick<
      User,
      | 'scheduleDate'
      | 'scheduledStart'
      | 'scheduledEnd'
      | 'isAtGym'
      | 'attendanceIntent'
      | 'attendanceIntentDate'
    >
  >
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ('scheduleDate' in patch) row.schedule_date = patch.scheduleDate ?? null;
  if ('scheduledStart' in patch) row.scheduled_start = patch.scheduledStart ?? null;
  if ('scheduledEnd' in patch) row.scheduled_end = patch.scheduledEnd ?? null;
  if ('isAtGym' in patch) row.is_at_gym = patch.isAtGym ?? false;
  if ('attendanceIntent' in patch) row.attendance_intent = patch.attendanceIntent ?? null;
  if ('attendanceIntentDate' in patch) row.attendance_intent_date = patch.attendanceIntentDate ?? null;

  const { error } = await getSupabase().from('profiles').update(row).eq('id', userId);
  if (error) throw error;
}

/** 관리자 회원 관리(승인·등급·정지·회비·레슨 등) 결과를 프로필에 반영 (관리자 전용 경로) */
export async function adminUpdateProfileRemote(user: User): Promise<void> {
  const row = {
    membership_tier: user.membershipTier,
    member_status: user.memberStatus,
    lesson_status: user.lessonStatus,
    lesson_requested_at: user.lessonRequestedAt ?? null,
    is_coach: user.isCoach ?? false,
    is_operator: user.isOperator ?? false,
    is_admin: user.isAdmin ?? user.membershipTier === 'admin',
    admin_note: user.adminNote ?? null,
    club_fee_verified_at: user.clubFeeVerifiedAt ?? null,
    club_fee_verified_by: user.clubFeeVerifiedBy ?? null,
    suspended_reason: user.suspendedReason ?? null,
    suspended_at: user.suspendedAt ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await getSupabase().from('profiles').update(row).eq('id', user.id);
  if (error) throw error;
}

/** 경기 확정·철회 후 대상 회원의 전적/엘로를 프로필에 반영 (관리자 전용 경로) */
export async function updateProfileStatsRemote(
  userId: string,
  patch: Partial<Pick<User, 'elo' | 'rank' | 'wins' | 'losses' | 'totalGames'>>
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ('elo' in patch) row.elo = patch.elo;
  if ('rank' in patch) row.rank = patch.rank;
  if ('wins' in patch) row.wins = patch.wins;
  if ('losses' in patch) row.losses = patch.losses;
  if ('totalGames' in patch) row.total_games = patch.totalGames;

  const { error } = await getSupabase().from('profiles').update(row).eq('id', userId);
  if (error) throw error;
}

export async function resetPeakReservationsRemote(): Promise<void> {
  const { error } = await getSupabase().rpc('rpc_reset_peak_reservations');
  if (error) throw error;
}

/** 활동일이 아니게 된 날짜의 참석·도착 의사를 로컬에서 지움 */
export async function clearAttendanceIntentsForDateRemote(dateISO: string): Promise<number> {
  if (!isSupabaseEnabled()) return 0;
  const { data, error } = await getSupabase().rpc('rpc_clear_attendance_intents_for_date', {
    p_date: dateISO,
  });
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

/** 활동 시간 종료 후 전원 is_at_gym 해제 (보안 컬럼 → RPC) */
export async function clearAtGymAfterActivityRemote(): Promise<number> {
  if (!isSupabaseEnabled()) return 0;
  const { data, error } = await getSupabase().rpc('rpc_clear_at_gym_after_activity');
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}
