import type { ActivitySession, RankTier } from '@/src/types';

export const APP_NAME = 'Drop 배드민턴';
export const CLUB_NAME = 'Drop';
export const SCHOOL_NAME = 'DGIST';

export const GYM_LOCATION = {
  name: '디지스트 S1 체육관',
  latitude: 35.6972,
  longitude: 128.4611,
  radiusMeters: 500,
};

export const ACTIVITY_SCHEDULE: ActivitySession[] = [
  { day: 1, startHour: 18, startMinute: 30, endHour: 21, endMinute: 40 },
  { day: 3, startHour: 18, startMinute: 30, endHour: 21, endMinute: 40 },
];

export const COURT_COUNT = 9;
export const CENTER_COURTS = [4, 5, 6];
export const GAME_COUNT_OPTIONS = [2, 3, 4, 5, 6] as const;
export const MIN_PLAYERS_FOR_GAME = 2;
export const MAX_PLAYERS_PER_COURT = 4;
export const MIN_TEAM_MEMBERS = 2;
export const MAX_TEAM_MEMBERS = 4;

export {
  MIN_RESERVE_POINTS,
  PEAK_TIME_RESERVATION_LIMIT,
  PEAK_HOURS,
} from '@/src/constants/points';

/** @deprecated 멤버십 배율 미사용 — 정책상 고정 포인트 */
export const FULL_MEMBER_POINT_MULTIPLIER = 1.2;

export const RANK_THRESHOLDS: Record<RankTier, { min: number; label: string; color: string }> = {
  bronze: { min: 0, label: '브론즈', color: '#CD7F32' },
  silver: { min: 1000, label: '실버', color: '#A8A9AD' },
  gold: { min: 1200, label: '골드', color: '#FFD700' },
  platinum: { min: 1400, label: '플래티넘', color: '#00CED1' },
  diamond: { min: 1600, label: '다이아', color: '#B9F2FF' },
  master: { min: 1800, label: '마스터', color: '#FF6B6B' },
};

export const RANK_ORDER: RankTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master'];

export const COURT_STATUS_COLORS = {
  empty: '#4CB88A',
  reserved: '#8FA862',
  playing: '#5B8DEF',
  just_finished: '#ADB5BD',
};

export const CLEANING_AREAS = [
  '코트 1-3 구역',
  '코트 4-6 구역',
  '코트 7-9 구역',
  '셔틀콕 수거',
  '라켓/물품 정리',
  '탈의실 정리',
];

export const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00D2FF',
];
