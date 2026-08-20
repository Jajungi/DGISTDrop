import { create } from 'zustand';
import type { ClubEvent } from '@/src/types';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import { normalizeClubEvents } from '@/src/utils/siteOps';

interface ClubEventState {
  events: ClubEvent[];
  setLocal: (events: ClubEvent[]) => void;
  save: (events: ClubEvent[]) => Promise<{ success: boolean; message: string }>;
  upsert: (event: ClubEvent) => Promise<{ success: boolean; message: string }>;
  remove: (id: string) => Promise<{ success: boolean; message: string }>;
}

export const useClubEventStore = create<ClubEventState>((set, get) => ({
  events: [],

  setLocal: (events) => set({ events: normalizeClubEvents(events) }),

  save: async (events) => {
    const next = normalizeClubEvents(events);
    const prev = get().events;
    set({ events: next });
    if (isSupabaseEnabled()) {
      try {
        const { setClubEventsRemote } = await import('@/src/services/supabase/club');
        await setClubEventsRemote(next);
      } catch (err) {
        set({ events: prev });
        return {
          success: false,
          message: err instanceof Error ? err.message : '휴관·배너 일정 저장에 실패했어요.',
        };
      }
    }
    return { success: true, message: '휴관·배너 일정을 저장했어요.' };
  },

  upsert: async (event) => {
    const list = get().events;
    const idx = list.findIndex((e) => e.id === event.id);
    const next =
      idx >= 0 ? list.map((e) => (e.id === event.id ? event : e)) : [event, ...list];
    return get().save(next);
  },

  remove: async (id) => {
    return get().save(get().events.filter((e) => e.id !== id));
  },
}));
