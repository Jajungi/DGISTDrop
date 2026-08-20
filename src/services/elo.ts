import { isEloFeaturesEnabled } from '@/src/stores/featureFlagsStore';
import type { RankTier } from '@/src/types';

const K_FACTOR = 32;

export function calculateEloChange(
  winnerElo: number,
  loserElo: number
): { winnerChange: number; loserChange: number } {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 - expectedWinner;

  const winnerChange = Math.round(K_FACTOR * (1 - expectedWinner));
  const loserChange = Math.round(K_FACTOR * (0 - expectedLoser));

  return { winnerChange, loserChange };
}

export function getRankIndex(rank: RankTier): number {
  return RANK_ORDER.indexOf(rank);
}

export function isRankEligible(userRank: RankTier, minRank?: RankTier, maxRank?: RankTier): boolean {
  if (!isEloFeaturesEnabled()) return true;
  const userIdx = getRankIndex(userRank);
  if (minRank && userIdx < getRankIndex(minRank)) return false;
  if (maxRank && userIdx > getRankIndex(maxRank)) return false;
  return true;
}

export function getAverageElo(elos: number[]): number {
  if (elos.length === 0) return 1000;
  return Math.round(elos.reduce((a, b) => a + b, 0) / elos.length);
}
