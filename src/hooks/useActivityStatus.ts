import { useEffect, useRef } from 'react';
import { isActivityTime, getNextActivityTime, getActivityTimeRemaining } from '@/src/services/activityTime';
import { useAppStore, useAuthStore } from '@/src/stores/authStore';
import { isSupabaseEnabled } from '@/src/lib/supabase';

/** 탭 레이아웃에서 한 번만 호출 — 활동 시간 상태를 전역 store에 동기화 */
export function useActivityClock() {
  const demoMode = useAppStore((s) => s.demoMode);
  const clearingRef = useRef(false);

  useEffect(() => {
    const clearStaleAtGym = () => {
      const hasAtGym = useAuthStore.getState().users.some((u) => u.isAtGym);
      if (!hasAtGym) return;

      useAuthStore.getState().clearAllAtGymLocal();
      // 기기 지오펜스 배지도 활동 밖이면 꺼 줌 (실제 GPS는 다음에 setLocation이 맞춤)
      if (useAppStore.getState().isAtGym) {
        useAppStore.setState({ isAtGym: false });
      }

      if (!isSupabaseEnabled() || clearingRef.current) return;
      clearingRef.current = true;
      void import('@/src/services/supabase/profiles')
        .then(({ clearAtGymAfterActivityRemote }) => clearAtGymAfterActivityRemote())
        .catch((err) => console.warn('[at-gym] clear after activity failed', err))
        .finally(() => {
          clearingRef.current = false;
        });
    };

    const tick = () => {
      const now = new Date();
      const active = demoMode || isActivityTime(now);
      const remaining = active ? getActivityTimeRemaining(now) : null;
      const nextTime = !active ? getNextActivityTime(now)?.getTime() ?? null : null;

      const state = useAppStore.getState();
      const wasActive = state.isActivityTime;

      if (
        state.isActivityTime !== active ||
        state.activityRemaining !== remaining ||
        state.nextActivityTime !== nextTime
      ) {
        useAppStore.setState({
          isActivityTime: active,
          activityRemaining: remaining,
          nextActivityTime: nextTime,
        });
      }

      // 활동이 끝났거나(전환), 이미 끝났는데 체육관 표시가 남은 경우 리셋
      if (!demoMode && !active && (wasActive || useAuthStore.getState().users.some((u) => u.isAtGym))) {
        clearStaleAtGym();
      }
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
