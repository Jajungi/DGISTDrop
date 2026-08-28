import { create } from 'zustand';
import type { ActivitySession } from '@/src/types';
import {
  DEFAULT_ACTIVITY_SCHEDULE,
  cloneSchedule,
  normalizeSchedule,
} from '@/src/utils/activitySchedule';
import { getSeoulTodayKey } from '@/src/utils/dateFormat';
import { isSupabaseEnabled } from '@/src/lib/supabase';

interface ActivityScheduleState {
  schedule: ActivitySession[];
  /** 오늘 활동 취소인 한국 날짜. 아니면 null */
  cancelledDate: string | null;
  setCancelledDate: (date: string | null) => void;
  setScheduleLocal: (sessions: ActivitySession[]) => void;
  setSchedule: (
    sessions: ActivitySession[]
  ) => Promise<{ success: boolean; message: string }>;
  resetToDefault: () => Promise<{ success: boolean; message: string }>;
}

export const useActivityScheduleStore = create<ActivityScheduleState>((set, get) => ({
  schedule: cloneSchedule(DEFAULT_ACTIVITY_SCHEDULE),
  cancelledDate: null,

  setCancelledDate: (date) => {
    set({ cancelledDate: date });
    void import('@/src/services/attendanceIntentCleanup').then(({ reconcileTodayAttendanceIntent }) =>
      reconcileTodayAttendanceIntent()
    );
  },

  setScheduleLocal: (sessions) => {
    set({ schedule: normalizeSchedule(sessions) });
  },

  setSchedule: async (sessions) => {
    const next = normalizeSchedule(sessions);
    if (!next.length) {
      return { success: false, message: '활동 요일을 하나 이상 남겨 주세요.' };
    }
    const prev = get().schedule;
    set({ schedule: next });
    if (isSupabaseEnabled()) {
      try {
        const { setActivityScheduleRemote } = await import('@/src/services/supabase/club');
        await setActivityScheduleRemote(next);
      } catch (err) {
        set({ schedule: prev });
        return {
          success: false,
          message: err instanceof Error ? err.message : '활동 시간 저장에 실패했어요.',
        };
      }
    }
    const { reconcileTodayAttendanceIntent, clearRemoteAttendanceIntentsIfInactive } = await import(
      '@/src/services/attendanceIntentCleanup'
    );
    reconcileTodayAttendanceIntent();
    await clearRemoteAttendanceIntentsIfInactive(getSeoulTodayKey());
    return { success: true, message: '활동 시간을 저장했어요.' };
  },

  resetToDefault: async () => get().setSchedule(cloneSchedule(DEFAULT_ACTIVITY_SCHEDULE)),
}));

export function getActivitySchedule(): ActivitySession[] {
  return useActivityScheduleStore.getState().schedule;
}

export function isActivityCancelledToday(today: string): boolean {
  return useActivityScheduleStore.getState().cancelledDate === today;
}
