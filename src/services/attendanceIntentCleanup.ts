import type { ClubEvent } from '@/src/types';
import { isActivityDayOn } from '@/src/services/activityTime';
import { useAuthStore } from '@/src/stores/authStore';
import { getSeoulTodayKey } from '@/src/utils/dateFormat';
import { isSupabaseEnabled } from '@/src/lib/supabase';

/** 활동일이 아니게 된 날짜의 참석·도착 의사를 지움 */
export function reconcileAttendanceIntentIfNeeded(dateISO: string): void {
  if (isActivityDayOn(dateISO)) return;
  useAuthStore.getState().clearAttendanceIntentsForDate(dateISO);
}

export function reconcileTodayAttendanceIntent(): void {
  reconcileAttendanceIntentIfNeeded(getSeoulTodayKey());
}

function collectEventDates(events: ClubEvent[]): Set<string> {
  const dates = new Set<string>();
  for (const e of events) {
    if (e.kind === 'closure' || e.kind === 'extra') dates.add(e.dateStart);
  }
  return dates;
}

/** 달력(휴관·추가 활동) 저장 후 바뀐 날짜의 참석 의사 정리 */
export function reconcileAttendanceIntentsAfterClubEventsChange(
  prev: ClubEvent[],
  next: ClubEvent[]
): void {
  const dates = collectEventDates(prev);
  collectEventDates(next).forEach((d) => dates.add(d));
  dates.add(getSeoulTodayKey());
  dates.forEach(reconcileAttendanceIntentIfNeeded);
}

/** 활동일이 아닌 날짜의 참석 의사를 DB에서도 지움 (운영진 저장 시) */
export async function clearRemoteAttendanceIntentsIfInactive(dateISO: string): Promise<void> {
  if (!isSupabaseEnabled() || isActivityDayOn(dateISO)) return;
  try {
    const { clearAttendanceIntentsForDateRemote } = await import(
      '@/src/services/supabase/profiles'
    );
    await clearAttendanceIntentsForDateRemote(dateISO);
  } catch (err) {
    console.warn('[attendance] remote intent clear failed', err);
  }
}
