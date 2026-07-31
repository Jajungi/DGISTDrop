import { create } from 'zustand';
import type { LobbyExpiryConfig } from '@/src/types';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import { DEFAULT_LOBBY_EXPIRY, normalizeLobbyExpiry } from '@/src/utils/lobbyExpiry';

interface LobbyExpiryState {
  config: LobbyExpiryConfig;
  setLocal: (config: LobbyExpiryConfig) => void;
  save: (config: LobbyExpiryConfig) => Promise<{ success: boolean; message: string }>;
}

export const useLobbyExpiryStore = create<LobbyExpiryState>((set, get) => ({
  config: { ...DEFAULT_LOBBY_EXPIRY },

  setLocal: (config) => set({ config: normalizeLobbyExpiry(config) }),

  save: async (config) => {
    const next = normalizeLobbyExpiry(config);
    const prev = get().config;
    set({ config: next });
    if (isSupabaseEnabled()) {
      try {
        const { setLobbyExpiryRemote } = await import('@/src/services/supabase/club');
        await setLobbyExpiryRemote(next);
      } catch (err) {
        set({ config: prev });
        return {
          success: false,
          message: err instanceof Error ? err.message : '모집방 만료 설정 저장에 실패했어요.',
        };
      }
    }
    return { success: true, message: '모집방 자동 종료 설정을 저장했어요.' };
  },
}));
