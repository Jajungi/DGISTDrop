import { create } from 'zustand';
import type { AdminLogEntry } from '@/src/types';
import { isSupabaseEnabled } from '@/src/lib/supabase';

const MAX_LOGS = 200;

interface AdminLogState {
  logs: AdminLogEntry[];
  hydrate: (logs: AdminLogEntry[]) => void;
  append: (entry: Omit<AdminLogEntry, 'id' | 'createdAt'>) => void;
  clear: () => void;
  clearAll: () => Promise<{ success: boolean; message: string }>;
}

export const useAdminLogStore = create<AdminLogState>((set) => ({
  logs: [],

  hydrate: (logs) => set({ logs: logs.slice(0, MAX_LOGS) }),

  append: (entry) => {
    const log: AdminLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      logs: [log, ...state.logs].slice(0, MAX_LOGS),
    }));
  },

  clear: () => set({ logs: [] }),

  clearAll: async () => {
    if (isSupabaseEnabled()) {
      try {
        const { clearAdminLogsRemote } = await import('@/src/services/supabase/adminLogs');
        await clearAdminLogsRemote();
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : '서버 로그 삭제에 실패했어요.',
        };
      }
    }
    set({ logs: [] });
    return { success: true, message: '활동 로그를 비웠어요.' };
  },
}));
