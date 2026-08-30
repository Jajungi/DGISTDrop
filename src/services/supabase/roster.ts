import { getSupabase, isSupabaseEnabled } from '@/src/lib/supabase';
import type { ClubRosterEntry, ParsedRosterLine } from '@/src/utils/clubRoster';

const SQL_HINT = '명단 DB가 아직 없어요. Supabase SQL Editor에서 033_club_roster.sql 을 실행해 주세요.';

function isMissingSchemaError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes('does not exist') ||
    m.includes('could not find') ||
    m.includes('42703') ||
    m.includes('rpc_list_club_roster') ||
    m.includes('rpc_upsert_club_roster') ||
    m.includes('rpc_delete_club_roster') ||
    m.includes('rpc_set_roster_enforcement') ||
    m.includes('roster_enforcement')
  );
}

function schemaError(error: { message?: string } | null): Error {
  if (isMissingSchemaError(error?.message)) return new Error(SQL_HINT);
  return new Error(error?.message || '명단 작업에 실패했어요.');
}

export async function fetchRosterEnforcement(): Promise<boolean> {
  if (!isSupabaseEnabled()) return false;
  const { data, error } = await getSupabase()
    .from('club_metadata')
    .select('roster_enforcement')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    if (__DEV__ && !isMissingSchemaError(error.message)) {
      console.warn('[roster] fetchRosterEnforcement', error.message);
    }
    return false;
  }
  return Boolean((data as { roster_enforcement?: boolean } | null)?.roster_enforcement);
}

export async function setRosterEnforcementRemote(enabled: boolean): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('rpc_set_roster_enforcement', {
    p_enabled: enabled,
  });
  if (error) throw schemaError(error);
  return Boolean(data ?? enabled);
}

export async function fetchClubRoster(): Promise<ClubRosterEntry[]> {
  if (!isSupabaseEnabled()) return [];
  const { data, error } = await getSupabase().rpc('rpc_list_club_roster');
  if (error) throw schemaError(error);
  const rows = (data ?? []) as Array<{
    student_id: string;
    name: string;
    created_at?: string;
    updated_at?: string;
  }>;
  return rows.map((r) => ({
    studentId: r.student_id,
    name: r.name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function upsertClubRoster(
  entries: ParsedRosterLine[]
): Promise<{ inserted: number; updated: number; skipped: number }> {
  const { data, error } = await getSupabase().rpc('rpc_upsert_club_roster', {
    p_entries: entries.map((e) => ({ student_id: e.studentId, name: e.name })),
  });
  if (error) throw schemaError(error);
  const raw = (data ?? {}) as { inserted?: number; updated?: number; skipped?: number };
  return {
    inserted: raw.inserted ?? 0,
    updated: raw.updated ?? 0,
    skipped: raw.skipped ?? 0,
  };
}

export async function deleteClubRosterEntry(studentId: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('rpc_delete_club_roster', {
    p_student_id: studentId,
  });
  if (error) throw schemaError(error);
  return Boolean(data);
}

export type RosterSignupCheck = 'not_enforced' | 'matched' | 'name_mismatch' | 'not_on_roster';

/** 회원가입 화면 — 명단 제한 여부 (비로그인 anon 호출 가능) */
export async function fetchRosterSignupPolicy(): Promise<{ enforcement: boolean }> {
  if (!isSupabaseEnabled()) return { enforcement: false };
  const { data, error } = await getSupabase().rpc('rpc_get_roster_signup_policy');
  if (error) {
    if (__DEV__ && !isMissingSchemaError(error.message)) {
      console.warn('[roster] fetchRosterSignupPolicy', error.message);
    }
    const enforcement = await fetchRosterEnforcement();
    return { enforcement };
  }
  const row = (data ?? {}) as { roster_enforcement?: boolean };
  return { enforcement: Boolean(row.roster_enforcement) };
}

/** 명단 제한 ON일 때 가입 전 학번·이름 대조 */
export async function checkRosterSignup(
  studentId: string,
  name: string
): Promise<RosterSignupCheck> {
  if (!isSupabaseEnabled()) return 'not_enforced';
  const { data, error } = await getSupabase().rpc('rpc_check_roster_signup', {
    p_student_id: studentId,
    p_name: name,
  });
  if (error) {
    if (__DEV__) console.warn('[roster] checkRosterSignup', error.message);
    return 'not_enforced';
  }
  const result = String(data ?? 'not_enforced') as RosterSignupCheck;
  if (
    result === 'matched' ||
    result === 'name_mismatch' ||
    result === 'not_on_roster' ||
    result === 'not_enforced'
  ) {
    return result;
  }
  return 'not_enforced';
}
