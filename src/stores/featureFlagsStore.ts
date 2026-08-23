import { create } from 'zustand';
import { isSupabaseEnabled } from '@/src/lib/supabase';

interface FeatureFlagsState {
  eloFeaturesEnabled: boolean;
  reservationEnabled: boolean;
  pointsFeaturesEnabled: boolean;
  setEloFeaturesEnabledLocal: (value: boolean) => void;
  setReservationEnabledLocal: (value: boolean) => void;
  setPointsFeaturesEnabledLocal: (value: boolean) => void;
  setEloFeaturesEnabled: (value: boolean) => Promise<{ success: boolean; message: string }>;
  setReservationEnabled: (value: boolean) => Promise<{ success: boolean; message: string }>;
  setPointsFeaturesEnabled: (value: boolean) => Promise<{ success: boolean; message: string }>;
}

export const useFeatureFlagsStore = create<FeatureFlagsState>((set, get) => ({
  eloFeaturesEnabled: true,
  reservationEnabled: false,
  pointsFeaturesEnabled: true,

  setEloFeaturesEnabledLocal: (value) => set({ eloFeaturesEnabled: value }),
  setReservationEnabledLocal: (value) => set({ reservationEnabled: value }),
  setPointsFeaturesEnabledLocal: (value) => set({ pointsFeaturesEnabled: value }),

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

  setReservationEnabled: async (value) => {
    const prev = get().reservationEnabled;
    set({ reservationEnabled: value });
    if (isSupabaseEnabled()) {
      try {
        const { setReservationEnabledRemote } = await import('@/src/services/supabase/club');
        await setReservationEnabledRemote(value);
      } catch (err) {
        set({ reservationEnabled: prev });
        return {
          success: false,
          message: err instanceof Error ? err.message : '코트 예약 설정 저장에 실패했어요.',
        };
      }
    }
    return {
      success: true,
      message: value
        ? '코트 예약을 켰어요. 이름·게임 수로 예약할 수 있어요.'
        : '현황 모드예요. 사용 중/비움만 보이고, 운영진이 점유를 바꿉니다.',
    };
  },

  setPointsFeaturesEnabled: async (value) => {
    const prev = get().pointsFeaturesEnabled;
    set({ pointsFeaturesEnabled: value });
    if (isSupabaseEnabled()) {
      try {
        const { setPointsFeaturesEnabledRemote } = await import('@/src/services/supabase/club');
        await setPointsFeaturesEnabledRemote(value);
      } catch (err) {
        set({ pointsFeaturesEnabled: prev });
        return {
          success: false,
          message: err instanceof Error ? err.message : '포인트 기능 설정 저장에 실패했어요.',
        };
      }
    }
    return {
      success: true,
      message: value
        ? '포인트 기능을 켰어요.'
        : '포인트 화면을 숨겼어요. 예약 차감·적립 UI가 사라집니다.',
    };
  },
}));

export function isEloFeaturesEnabled(): boolean {
  return useFeatureFlagsStore.getState().eloFeaturesEnabled;
}

export function isReservationEnabled(): boolean {
  return useFeatureFlagsStore.getState().reservationEnabled;
}

export function isPointsFeaturesEnabled(): boolean {
  return useFeatureFlagsStore.getState().pointsFeaturesEnabled;
}
