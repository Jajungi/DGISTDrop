import {
  PEAK_TIME_RESERVATION_LIMIT,
  POINT_EARN,
  POINT_SPEND,
  RANK_RESERVATION_DISCOUNT,
} from '@/src/constants/points';
import { isEloFeaturesEnabled } from '@/src/stores/featureFlagsStore';
import { usePeakHoursStore } from '@/src/stores/peakHoursStore';
import { formatPeakHoursLabel } from '@/src/utils/peakHours';
import type { MembershipTier, RankTier } from '@/src/types';

export function getRankFromElo(elo: number): RankTier {
  const ranks = [...RANK_ORDER].reverse();
  for (const rank of ranks) {
    if (elo >= RANK_THRESHOLDS[rank].min) return rank;
  }
  return 'bronze';
}

export function isCenterCourtId(courtId: number): boolean {
  return CENTER_COURTS.includes(courtId);
}

/** 정회원 +150p / 준회원 +100p */
export function getAttendancePoints(membershipTier: MembershipTier): number {
  if (membershipTier === 'full' || membershipTier === 'admin') {
    return POINT_EARN.ATTENDANCE_FULL;
  }
  return POINT_EARN.ATTENDANCE_ASSOCIATE;
}

/** Gold+ 랭크 티어 할인 적용 — 일반 20p / 중앙 30p 기준 */
export function getReservationCost(rank: RankTier, isCenterCourt = false): number {
  const base = isCenterCourt ? POINT_SPEND.COURT_CENTER : POINT_SPEND.COURT_GENERAL;
  if (!isEloFeaturesEnabled()) return base;
  const discount = RANK_RESERVATION_DISCOUNT[rank] ?? 0;
  return Math.max(1, Math.round(base * (1 - discount)));
}

export function getRankDiscountPercent(rank: RankTier): number {
  if (!isEloFeaturesEnabled()) return 0;
  return Math.round((RANK_RESERVATION_DISCOUNT[rank] ?? 0) * 100);
}

export function canReserve(
  peakTimeReservations: number,
  isPeakTime: boolean,
  hasActiveCourt: boolean
): { allowed: boolean; reason?: string } {
  if (hasActiveCourt) {
    return {
      allowed: false,
      reason: '이미 코트를 예약·이용 중이에요. 반납 후 다른 코트를 예약할 수 있어요.',
    };
  }

  if (isPeakTime && peakTimeReservations >= PEAK_TIME_RESERVATION_LIMIT) {
    const label = formatPeakHoursLabel(usePeakHoursStore.getState().hours);
    return {
      allowed: false,
      reason: `피크타임(${label}) 예약은 하루 ${PEAK_TIME_RESERVATION_LIMIT}회까지예요.`,
    };
  }

  return { allowed: true };
}

export function isPeakTime(now: Date = new Date()): boolean {
  return usePeakHoursStore.getState().hours.includes(now.getHours());
}

/** 경기 승리 — 팀원당 고정 (+승리 축하) */
export function calculateWinPoints(): number {
  return POINT_EARN.MATCH_WIN;
}

/** 경기 패배 — 팀원당 고정 (+패배 위로, 승리보다 적게) */
export function calculateLossPoints(): number {
  return POINT_EARN.MATCH_LOSS;
}

export function calculateCleaningPoints(): number {
  return POINT_EARN.CLEANING;
}

export function calculateNetSetupPoints(): number {
  return POINT_EARN.NET_SETUP;
}

export function getWinRate(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}

/** @deprecated 정책상 멤버십 배율 없음 — getAttendancePoints 사용 */
export function applyPointMultiplier(points: number, _membershipTier: MembershipTier): number {
  return points;
}
