import { create } from 'zustand';
import type { SiteOverlay } from '@/src/types';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import { normalizeOverlays } from '@/src/utils/siteOps';

interface SiteOverlayState {
  overlays: SiteOverlay[];
  setLocal: (overlays: SiteOverlay[]) => void;
  save: (overlays: SiteOverlay[]) => Promise<{ success: boolean; message: string }>;
  upsert: (overlay: SiteOverlay) => Promise<{ success: boolean; message: string }>;
  remove: (id: string) => Promise<{ success: boolean; message: string }>;
}

export const useSiteOverlayStore = create<SiteOverlayState>((set, get) => ({
  overlays: [],

  setLocal: (overlays) => set({ overlays: normalizeOverlays(overlays) }),

  save: async (overlays) => {
    const next = normalizeOverlays(overlays);
    const prev = get().overlays;
    set({ overlays: next });
    if (isSupabaseEnabled()) {
      try {
        const { setSiteOverlaysRemote } = await import('@/src/services/supabase/club');
        await setSiteOverlaysRemote(next);
      } catch (err) {
        set({ overlays: prev });
        return {
          success: false,
          message: err instanceof Error ? err.message : '화면 공지 저장에 실패했어요.',
        };
      }
    }
    return { success: true, message: '화면 공지를 저장했어요.' };
  },

  upsert: async (overlay) => {
    const list = get().overlays;
    const idx = list.findIndex((o) => o.id === overlay.id);
    const next =
      idx >= 0
        ? list.map((o) => (o.id === overlay.id ? overlay : o))
        : [overlay, ...list];
    return get().save(next);
  },

  remove: async (id) => {
    return get().save(get().overlays.filter((o) => o.id !== id));
  },
}));
