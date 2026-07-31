import type { MatchResult } from '@/src/types';

export interface PlayPartnerStat {
  userId: string;
  count: number;
}

/** 나와 같은 팀에 있었던 경기 횟수 (최근 기록 기준) */
export function countPlayPartners(
  matchHistory: MatchResult[],
  myId: string,
  options?: { limit?: number; minCount?: number }
): PlayPartnerStat[] {
  const counts = new Map<string, number>();
  for (const match of matchHistory) {
    if (match.status === 'cancelled' || match.status === 'revoked') continue;
    const team = match.teamA.includes(myId)
      ? match.teamA
      : match.teamB.includes(myId)
        ? match.teamB
        : null;
    if (!team) continue;
    for (const id of team) {
      if (id === myId) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  const minCount = options?.minCount ?? 1;
  const list = [...counts.entries()]
    .filter(([, c]) => c >= minCount)
    .map(([userId, count]) => ({ userId, count }))
    .sort((a, b) => b.count - a.count || a.userId.localeCompare(b.userId));
  const limit = options?.limit;
  return limit != null ? list.slice(0, limit) : list;
}

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** 두 일정 겹치는 분 (없으면 0) */
export function overlapMinutes(
  a: { start?: string; end?: string },
  b: { start?: string; end?: string }
): number {
  if (!a.start || !b.start) return 0;
  const a0 = toMin(a.start);
  const a1 = toMin(a.end ?? a.start) || a0 + 90;
  const b0 = toMin(b.start);
  const b1 = toMin(b.end ?? b.start) || b0 + 90;
  const start = Math.max(a0, b0);
  const end = Math.min(a1, b1);
  return Math.max(0, end - start);
}

/** 시각(HH:MM)이 일정 구간에 포함되는지 */
export function scheduleCoversTime(
  schedule: { start?: string; end?: string },
  timeHHMM: string
): boolean {
  if (!schedule.start) return false;
  const t = toMin(timeHHMM);
  const s = toMin(schedule.start);
  const e = toMin(schedule.end ?? schedule.start) || s + 90;
  return t >= s && t < e;
}

/** 활동 구간을 30분 단위 슬롯으로 */
export function buildTimeSlots(activityStart: string, activityEnd: string): string[] {
  const start = toMin(activityStart);
  const end = toMin(activityEnd);
  const slots: string[] = [];
  for (let m = start; m < end; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return slots;
}
