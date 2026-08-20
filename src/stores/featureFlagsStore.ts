import { create } from 'zustand';
import { isSupabaseEnabled } from '@/src/lib/supabase';

interface FeatureFlagsState {
  eloFeaturesEnabled: boolean;
  setEloFeaturesEnabledLocal: (value: boolean) => void;
  setEloFeaturesEnabled: (value: boolean) => Promise<{ success: boolean; message: string }>;
}

export const useFeatureFlagsStore = create<FeatureFlagsState>((set, get) => ({
  eloFeaturesEnabled: true,

  setEloFeaturesEnabledLocal: (value) => set({ eloFeaturesEnabled: value }),

  setEloFeaturesEnabled: async (value) => {
    const prev = get().eloFeaturesEnabled;
    set({ eloFeaturesEnabled: value });
    if (isSupabaseEnabled()) {
      try {
        const { setEloFeaturesEnabledRemote } = await import('@/src/services/supabase/club');
        await setEloFeaturesEnabledRemote(value);
      } catch (err) {
        set({ eloFeaturesEnabled: prev });
        return {
          success: false,
          message: err instanceof Error ? err.message : 'Elo 기능 설정 저장에 실패했어요.',
        };
      }
    }
    return {
      success: true,
      message: value
        ? 'Elo·랭크 기능을 켰어요. 실험적 기능입니다.'
        : 'Elo·랭크 기능을 껐어요. 관련 화면과 할인이 숨겨집니다.',
    };
  },
}));

export function isEloFeaturesEnabled(): boolean {
  return useFeatureFlagsStore.getState().eloFeaturesEnabled;
}
