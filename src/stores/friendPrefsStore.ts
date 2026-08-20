import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { isSupabaseEnabled } from '@/src/lib/supabase';

const STORAGE_KEY = '@badmin/friend_arrival_notify';

interface FriendPrefsState {
  /** meId → friendIds[] 도착 알림 구독 */
  arrivalNotify: Record<string, string[]>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  hydrateForUser: (meId: string) => Promise<void>;
  isArrivalNotifyOn: (meId: string, friendId: string) => boolean;
  setArrivalNotify: (meId: string, friendId: string, on: boolean) => Promise<void>;
}

async function persist(map: Record<string, string[]>) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export const useFriendPrefsStore = create<FriendPrefsState>((set, get) => ({
  arrivalNotify: {},
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string[]>;
        if (parsed && typeof parsed === 'object') {
          set({ arrivalNotify: parsed, hydrated: true });
          return;
        }
      }
    } catch {
      /* ignore */
    }
    set({ hydrated: true });
  },

  hydrateForUser: async (meId) => {
    await get().hydrate();
    if (!isSupabaseEnabled()) return;
    try {
      const { fetchArrivalNotifyFriendIds } = await import(
        '@/src/services/supabase/notificationPrefs'
      );
      const ids = await fetchArrivalNotifyFriendIds(meId);
      const next = { ...get().arrivalNotify, [meId]: ids };
      set({ arrivalNotify: next });
      await persist(next);
    } catch {
      /* keep local */
    }
  },

  isArrivalNotifyOn: (meId, friendId) =>
    (get().arrivalNotify[meId] ?? []).includes(friendId),

  setArrivalNotify: async (meId, friendId, on) => {
    const prev = get().arrivalNotify;
    const list = new Set(prev[meId] ?? []);
    if (on) list.add(friendId);
    else list.delete(friendId);
    const next = { ...prev, [meId]: [...list] };
    set({ arrivalNotify: next });
    await persist(next);
    if (isSupabaseEnabled()) {
      try {
        const { setArrivalNotifyRemote } = await import(
          '@/src/services/supabase/notificationPrefs'
        );
        await setArrivalNotifyRemote(meId, friendId, on);
      } catch (err) {
        console.warn('[arrival-notify] save failed', err);
      }
    }
  },
}));
