import { create } from 'zustand';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import { DEFAULT_PEAK_HOURS_LIST, normalizePeakHours } from '@/src/utils/peakHours';

interface PeakHoursState {
  hours: number[];
  setLocal: (hours: number[]) => void;
  save: (hours: number[]) => Promise<{ success: boolean; message: string }>;
}

export const usePeakHoursStore = create<PeakHoursState>((set, get) => ({
  hours: [...DEFAULT_PEAK_HOURS_LIST],

  setLocal: (hours) => set({ hours: normalizePeakHours(hours) }),

  save: async (hours) => {
    const next = normalizePeakHours(hours);
    const prev = get().hours;
    set({ hours: next });
    if (isSupabaseEnabled()) {
      try {
        const { setPeakHoursRemote } = await import('@/src/services/supabase/club');
        await setPeakHoursRemote(next);
      } catch (err) {
        set({ hours: prev });
        return {
          success: false,
          message: err instanceof Error ? err.message : '피크 시간 저장에 실패했어요.',
        };
      }
    }
    return { success: true, message: '피크 시간을 저장했어요.' };
  },
}));
