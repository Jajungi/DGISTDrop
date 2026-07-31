import type { LobbyExpiryConfig, LobbyExpiryMode, TeamRoom } from '@/src/types';

export const DEFAULT_LOBBY_EXPIRY: LobbyExpiryConfig = {
  mode: 'end_of_day',
  hours: 6,
};

export function normalizeLobbyExpiry(raw: unknown): LobbyExpiryConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_LOBBY_EXPIRY };
  const o = raw as Record<string, unknown>;
  const mode = (['hours', 'end_of_day', 'never'] as LobbyExpiryMode[]).includes(
    o.mode as LobbyExpiryMode
  )
    ? (o.mode as LobbyExpiryMode)
    : 'end_of_day';
  const hours = Math.max(1, Math.min(168, Math.round(Number(o.hours) || 6)));
  return { mode, hours };
}

export function lobbyExpiryLabel(config: LobbyExpiryConfig): string {
  if (config.mode === 'never') return '삭제 안 함';
  if (config.mode === 'end_of_day') return '등록 당일 자정까지';
  return `생성 후 ${config.hours}시간`;
}

/** 모집방 만료 여부 — reserved(코트 예약됨)는 유지 */
export function isLobbyRoomExpired(
  room: TeamRoom,
  config: LobbyExpiryConfig,
  now = new Date()
): boolean {
  if (config.mode === 'never') return false;
  if (room.status === 'reserved' || room.status === 'closed') return false;

  const created = new Date(room.createdAt);
  if (Number.isNaN(created.getTime())) return false;

  if (config.mode === 'end_of_day') {
    const end = new Date(created);
    end.setHours(23, 59, 59, 999);
    return now.getTime() > end.getTime();
  }

  const limitMs = config.hours * 60 * 60 * 1000;
  return now.getTime() - created.getTime() > limitMs;
}

export function filterExpiredLobbyRooms(
  rooms: TeamRoom[],
  config: LobbyExpiryConfig,
  now = new Date()
): { kept: TeamRoom[]; expired: TeamRoom[] } {
  const kept: TeamRoom[] = [];
  const expired: TeamRoom[] = [];
  for (const room of rooms) {
    if (isLobbyRoomExpired(room, config, now)) expired.push(room);
    else kept.push(room);
  }
  return { kept, expired };
}
