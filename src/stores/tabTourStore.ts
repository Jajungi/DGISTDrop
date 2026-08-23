import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { TAB_TOUR_STEPS } from '@/src/constants/tabTour';

function doneKey(userId: string) {
  return `tab_tour_done:${userId}`;
}

interface TabTourState {
  hydrated: boolean;
  userId: string | null;
  done: boolean;
  activeIndex: number | null;
  hydrateForUser: (userId: string | null) => Promise<void>;
  startIfNeeded: () => void;
  next: () => void;
  skip: () => void;
  replay: () => void;
}

async function persistDone(userId: string | null) {
  if (!userId) return;
  try {
    await AsyncStorage.setItem(doneKey(userId), '1');
  } catch {
    /* ignore */
  }
}

export const useTabTourStore = create<TabTourState>((set, get) => ({
  hydrated: false,
  userId: null,
  done: true,
  activeIndex: null,

  hydrateForUser: async (userId) => {
    if (!userId) {
      set({ hydrated: true, userId: null, done: true, activeIndex: null });
      return;
    }
    if (get().userId === userId && get().hydrated) return;
    set({ hydrated: false, userId, activeIndex: null });
    try {
      const raw = await AsyncStorage.getItem(doneKey(userId));
      set({ hydrated: true, done: raw === '1', activeIndex: null });
    } catch {
      set({ hydrated: true, done: false, activeIndex: null });
    }
  },

  startIfNeeded: () => {
    const { hydrated, done, userId, activeIndex } = get();
    if (!hydrated || done || !userId || activeIndex !== null) return;
    set({ activeIndex: 0 });
  },

  next: () => {
    const { activeIndex, userId } = get();
    if (activeIndex === null) return;
    if (activeIndex >= TAB_TOUR_STEPS.length - 1) {
      set({ activeIndex: null, done: true });
      void persistDone(userId);
      return;
    }
    set({ activeIndex: activeIndex + 1 });
  },

  skip: () => {
    const { userId } = get();
    set({ activeIndex: null, done: true });
    void persistDone(userId);
  },

  replay: () => {
    const { userId } = get();
    if (userId) {
      void AsyncStorage.removeItem(doneKey(userId)).catch(() => undefined);
    }
    set({ done: false, activeIndex: 0 });
  },
}));

export function isTabTourOpen(): boolean {
  return useTabTourStore.getState().activeIndex !== null;
}
