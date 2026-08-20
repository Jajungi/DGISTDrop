import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import {
  DEFAULT_NOTIFICATION_PREFS,
  type UserNotificationPrefs,
} from '@/src/services/supabase/notificationPrefs';

function localKey(userId: string) {
  return `@badmin/notif-prefs:${userId}`;
}

interface NotificationPrefsState extends UserNotificationPrefs {
  userId: string | null;
  hydrated: boolean;
  hydrate: (userId: string) => Promise<void>;
  setChannel: (
    key: keyof UserNotificationPrefs,
    value: boolean
  ) => Promise<{ success: boolean; message: string }>;
}

export const useNotificationPrefsStore = create<NotificationPrefsState>((set, get) => ({
  ...DEFAULT_NOTIFICATION_PREFS,
  userId: null,
  hydrated: false,

  hydrate: async (userId) => {
    let next: UserNotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS };
    try {
      const raw = await AsyncStorage.getItem(localKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserNotificationPrefs>;
        next = {
          activityEvening: parsed.activityEvening ?? true,
          lessonTurn: parsed.lessonTurn ?? true,
          coachNotice: parsed.coachNotice ?? true,
        };
      }
    } catch {
      /* keep defaults */
    }
    if (isSupabaseEnabled()) {
      try {
        const { fetchNotificationPrefs } = await import(
          '@/src/services/supabase/notificationPrefs'
        );
        next = await fetchNotificationPrefs(userId);
        await AsyncStorage.setItem(localKey(userId), JSON.stringify(next));
      } catch {
        /* local fallback */
      }
    }
    set({ ...next, userId, hydrated: true });
  },

  setChannel: async (key, value) => {
    const userId = get().userId;
    const prev = {
      activityEvening: get().activityEvening,
      lessonTurn: get().lessonTurn,
      coachNotice: get().coachNotice,
    };
    const next = { ...prev, [key]: value };
    set(next);
    if (userId) {
      try {
        await AsyncStorage.setItem(localKey(userId), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    }
    if (userId && isSupabaseEnabled()) {
      try {
        const { saveNotificationPrefs } = await import(
          '@/src/services/supabase/notificationPrefs'
        );
        await saveNotificationPrefs(userId, next);
      } catch (err) {
        set(prev);
        return {
          success: false,
          message:
            err instanceof Error ? err.message : '알림 설정을 저장하지 못했어요. SQL 031을 실행했는지 확인하세요.',
        };
      }
    }
    const labels: Record<keyof UserNotificationPrefs, string> = {
      activityEvening: '활동일 저녁 알림',
      lessonTurn: '레슨 차례 알림',
      coachNotice: '코치 공지 알림',
    };
    return {
      success: true,
      message: value ? `${labels[key]}을 켰어요.` : `${labels[key]}을 껐어요.`,
    };
  },
}));

export function isLessonTurnEnabled(): boolean {
  return useNotificationPrefsStore.getState().lessonTurn;
}

export function isCoachNoticeEnabled(): boolean {
  return useNotificationPrefsStore.getState().coachNotice;
}
