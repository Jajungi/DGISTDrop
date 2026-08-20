import { useEffect } from 'react';
import { isActivityTime, getNextActivityTime, getActivityTimeRemaining } from '@/src/services/activityTime';
import { useAppStore } from '@/src/stores/authStore';

/** 탭 레이아웃에서 한 번만 호출 — 활동 시간 상태를 전역 store에 동기화 */
export function useActivityClock() {
  const demoMode = useAppStore((s) => s.demoMode);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const active = demoMode || isActivityTime(now);
      const remaining = active ? getActivityTimeRemaining(now) : null;
      const nextTime = !active ? getNextActivityTime(now)?.getTime() ?? null : null;

      const state = useAppStore.getState();
      if (
        state.isActivityTime === active &&
        state.activityRemaining === remaining &&
        state.nextActivityTime === nextTime
      ) {
        return;
      }

      useAppStore.setState({
        isActivityTime: active,
        activityRemaining: remaining,
        nextActivityTime: nextTime,
      });
    };

    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [demoMode]);
}

/** 읽기 전용 — store에 동기화된 활동 시간 상태 */
export function useActivityStatus() {
  const isActiveStore = useAppStore((s) => s.isActivityTime);
  const demoMode = useAppStore((s) => s.demoMode);
  const remaining = useAppStore((s) => s.activityRemaining);
  const nextActivityTime = useAppStore((s) => s.nextActivityTime);

  const isActive = demoMode || isActiveStore;
  const nextActivity = nextActivityTime != null ? new Date(nextActivityTime) : null;

  return { isActive, remaining, nextActivity };
}
