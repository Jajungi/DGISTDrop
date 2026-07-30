import type { User, Court, AttendanceRecord, MatchResult } from '@/src/types';
import { AVATAR_LIMITS } from '@/src/constants/dataRetention';
import { COACH_COURT_ID } from '@/src/constants/court';
import { CENTER_COURTS } from '@/src/constants';
import { getSupabase } from '@/src/lib/supabase';

type DbProfile = {
  id: string;
  student_id: string;
  name: string;
  nickname: string;
  email: string;
  membership_tier: User['membershipTier'];
  member_status: User['memberStatus'];
  rank: User['rank'];
  elo: number;
  points: number;
  wins: number;
  losses: number;
  total_games: number;
  cleaning_contributions: number;
  peak_time_reservations: number;
  is_at_gym: boolean;
  schedule_date: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  lesson_status: User['lessonStatus'];
  lesson_requested_at: string | null;
  is_coach?: boolean;
  is_operator?: boolean;
  avatar_color: string;
  avatar_path: string | null;
  admin_note: string | null;
  club_fee_verified_at: string | null;
  club_fee_verified_by: string | null;
  suspended_reason: string | null;
  suspended_at: string | null;
  created_at: string;
};

type DbCourt = {
  id: number;
  name: string;
  is_center: boolean;
  is_coach_court: boolean;
  status: Court['status'];
  players: Court['players'];
  join_requests: Court['joinRequests'];
  games_completed: number;
  max_games: number;
  reserved_by: string | null;
  reserved_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  game_mode: Court['gameMode'] | null;
  nanta_half: Court['nantaHalf'] | null;
  updated_at?: string;
};

type DbAttendance = {
  id: string;
  user_id: string;
  date: string;
  checked_in_at: string;
};

type DbMatch = {
  id: string;
  court_id: number | null;
  team_a: string[];
  team_b: string[];
  score_a: number;
  score_b: number;
  winner: 'A' | 'B';
  status: MatchResult['status'];
  played_at: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  elo_changes: Record<string, number> | null;
  game_mode: MatchResult['gameMode'] | null;
};

function publicAvatarUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const { data } = getSupabase().storage.from(AVATAR_LIMITS.storageBucket).getPublicUrl(path);
  return data.publicUrl;
}

export function mapProfileRow(row: DbProfile): User {
  return {
    id: row.id,
    studentId: row.student_id,
    name: row.name,
    nickname: row.nickname || row.name,
    email: row.email,
    membershipTier: row.membership_tier,
    memberStatus: row.member_status,
    rank: row.rank,
    elo: row.elo,
    points: row.points,
    wins: row.wins,
    losses: row.losses,
    totalGames: row.total_games,
    cleaningContributions: row.cleaning_contributions,
    peakTimeReservations: row.peak_time_reservations,
    isAtGym: row.is_at_gym,
    scheduleDate: row.schedule_date ?? undefined,
    scheduledStart: row.scheduled_start ?? undefined,
    scheduledEnd: row.scheduled_end ?? undefined,
    lessonStatus: row.lesson_status,
    lessonRequestedAt: row.lesson_requested_at ?? undefined,
    isCoach: row.is_coach ?? false,
    isOperator: row.is_operator ?? false,
    avatarColor: row.avatar_color,
    avatarUri: publicAvatarUrl(row.avatar_path),
    adminNote: row.admin_note ?? undefined,
    clubFeeVerifiedAt: row.club_fee_verified_at ?? undefined,
    clubFeeVerifiedBy: row.club_fee_verified_by ?? undefined,
    suspendedReason: row.suspended_reason ?? undefined,
    suspendedAt: row.suspended_at ?? undefined,
    createdAt: row.created_at.slice(0, 10),
  };
}

export function mapCourtRow(row: DbCourt): Court {
  // 코치·센터 코트는 코드 상수를 단일 출처로 강제 (DB 값 무시)
  const isCoachCourt = row.id === COACH_COURT_ID;
  const isCenter = CENTER_COURTS.includes(row.id);
  return {
    id: row.id,
    name: isCoachCourt ? '코치코트' : row.name,
    isCenter,
    isCoachCourt,
    status: row.status,
    players: row.players ?? [],
    joinRequests: row.join_requests ?? [],
    gamesCompleted: row.games_completed,
    maxGames: row.max_games,
    reservedBy: row.reserved_by ?? undefined,
    reservedAt: row.reserved_at ?? undefined,
    startedAt: row.started_at ?? undefined,
    finishedAt: row.finished_at ?? undefined,
    gameMode: row.game_mode ?? undefined,
    nantaHalf: row.nanta_half ?? undefined,
  };
}

export function mapAttendanceRow(row: DbAttendance): AttendanceRecord {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    checkedInAt: row.checked_in_at,
  };
}

export function mapMatchRow(row: DbMatch): MatchResult {
  return {
    id: row.id,
    courtId: row.court_id ?? 0,
    teamA: row.team_a,
    teamB: row.team_b,
    scoreA: row.score_a,
    scoreB: row.score_b,
    winner: row.winner,
    status: row.status,
    playedAt: row.played_at,
    confirmedBy: row.confirmed_by ?? undefined,
    confirmedAt: row.confirmed_at ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    cancelledBy: row.cancelled_by ?? undefined,
    cancelReason: row.cancel_reason ?? undefined,
    eloChanges: row.elo_changes ?? undefined,
    gameMode: row.game_mode ?? undefined,
  };
}

export function mapCourtToDb(court: Court): Partial<DbCourt> {
  return {
    id: court.id,
    name: court.name,
    is_center: court.isCenter,
    is_coach_court: court.isCoachCourt,
    status: court.status,
    players: court.players,
    join_requests: court.joinRequests,
    games_completed: court.gamesCompleted,
    max_games: court.maxGames,
    reserved_by: court.reservedBy ?? null,
    reserved_at: court.reservedAt ?? null,
    started_at: court.startedAt ?? null,
    finished_at: court.finishedAt ?? null,
    game_mode: court.gameMode ?? null,
    nanta_half: court.nantaHalf ?? null,
    updated_at: new Date().toISOString(),
  };
}

export type { DbProfile, DbCourt };
