import { MAX_PLAYERS_PER_COURT, CENTER_COURTS, GAME_COUNT_OPTIONS } from '@/src/constants';
import { COACH_COURT_ID } from '@/src/constants/court';
import type { Court, CourtPlayer, User } from '@/src/types';

export function createEmptyCourts(): Court[] {
  return Array.from({ length: 9 }, (_, i) => {
    const id = i + 1;
    return {
      id,
      name: `${id}번 코트`,
      isCenter: CENTER_COURTS.includes(id),
      isCoachCourt: id === COACH_COURT_ID,
      status: 'empty',
      players: [],
      gamesCompleted: 0,
      maxGames: 0,
      joinRequests: [],
      waitQueue: [],
    };
  });
}

export function canJoinWaitQueue(court: Court): boolean {
  return court.status === 'reserved' || court.status === 'playing';
}

export function canJoinCourt(court: Court): boolean {
  return (
    court.status === 'playing' &&
    court.players.length >= 2 &&
    court.players.length < MAX_PLAYERS_PER_COURT
  );
}

export function canCompleteGame(court: Court): boolean {
  return court.status === 'playing' && court.gamesCompleted < court.maxGames;
}

export function isCourtFull(court: Court): boolean {
  return court.players.length >= MAX_PLAYERS_PER_COURT;
}

export function getCourtOccupancyRate(courts: Court[]): number {
  const active = courts.filter((c) => c.status !== 'empty').length;
  return Math.round((active / courts.length) * 100);
}

export function getMostActiveCourt(courts: Court[]): Court | null {
  const playing = courts.filter((c) => c.status === 'playing');
  if (playing.length === 0) return null;
  return playing.reduce((a, b) =>
    a.gamesCompleted > b.gamesCompleted ? a : b
  );
}

export function userHasActiveCourt(userId: string, courts: Court[]): boolean {
  return courts.some(
    (c) =>
      c.status !== 'empty' &&
      (c.reservedBy === userId || c.players.some((p) => p.userId === userId))
  );
}

export function userToCourtPlayer(user: User): CourtPlayer {
  return {
    userId: user.id,
    name: user.name,
    nickname: user.name,
    rank: user.rank,
    avatarColor: user.avatarColor,
  };
}

export function getJoinableCourts(courts: Court[]): Court[] {
  return courts.filter(canJoinCourt);
}
