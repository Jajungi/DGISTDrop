import { applyPointChange } from '@/src/services/pointLedger';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { persistAppState } from '@/src/services/persistGate';

const BONUS_BY_RANK = [500, 400, 300, 200, 150];

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

/** 이번 달 청소 인증 횟수 집계 */
export function getMonthlyCleaningCounts(month = monthKey()) {
  const entries = useNotificationStore.getState().cleaningLeaderboard;
  const counts = new Map<string, { userId: string; userName: string; count: number }>();

  entries.forEach((entry) => {
    if (!entry.submittedAt.startsWith(month)) return;
    const prev = counts.get(entry.userId);
    if (prev) {
      prev.count += 1;
    } else {
      counts.set(entry.userId, { userId: entry.userId, userName: entry.userName, count: 1 });
    }
  });

  return [...counts.values()].sort((a, b) => b.count - a.count);
}

export function processMonthlyCleaningBonus(lastAwardedMonth: string | null): string | null {
  const current = monthKey();
  if (lastAwardedMonth === current) return lastAwardedMonth;

  const now = new Date();
  if (now.getDate() < 28) return lastAwardedMonth;

  const top = getMonthlyCleaningCounts(current).slice(0, 5);
  if (top.length === 0) return lastAwardedMonth;

  top.forEach((entry, index) => {
    const bonus = BONUS_BY_RANK[index] ?? 100;
    applyPointChange(
      entry.userId,
      bonus,
      'bonus',
      `이달의 청소 기여왕 ${index + 1}위 (+${bonus}P)`
    );
    useNotificationStore.getState().pushInbox({
      targetUserId: entry.userId,
      type: 'system',
      title: '청소 기여왕 보너스',
      message: `${index + 1}위로 ${bonus}P가 지급되었어요!`,
    });
  });

  useAuthStore.getState().setLastCleaningBonusMonth(current);
  persistAppState();
  return current;
}
