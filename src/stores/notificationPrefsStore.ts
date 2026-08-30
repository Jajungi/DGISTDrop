import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import {
  DEFAULT_NOTIFICATION_PREFS,
  type UserNotificationPrefs,
} from '@/src/services/supabase/notificationPrefs';
import { getT } from '@/src/i18n/useI18n';
import { useLocaleStore } from '@/src/stores/localeStore';
import type { AppNotification } from '@/src/types';

function localKey(userId: string) {
  return `@badmin/notif-prefs:${userId}`;
}

function mergePrefs(parsed: Partial<UserNotificationPrefs>): UserNotificationPrefs {
  return {
    activityEvening: parsed.activityEvening ?? true,
    lessonTurn: parsed.lessonTurn ?? true,
    coachNotice: parsed.coachNotice ?? true,
    joinAlerts: parsed.joinAlerts ?? true,
    friendAlerts: parsed.friendAlerts ?? true,
    systemAlerts: parsed.systemAlerts ?? true,
  };
}

const PREF_LABEL_KEYS: Record<keyof UserNotificationPrefs, string> = {
  activityEvening: 'settings.activityEvening',
  lessonTurn: 'settings.lessonTurn',
  coachNotice: 'settings.coachNotice',
  joinAlerts: 'settings.joinAlerts',
  friendAlerts: 'settings.friendAlerts',
  systemAlerts: 'settings.systemAlerts',
};

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
        next = mergePrefs(JSON.parse(raw) as Partial<UserNotificationPrefs>);
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
      joinAlerts: get().joinAlerts,
      friendAlerts: get().friendAlerts,
      systemAlerts: get().systemAlerts,
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
    const t = getT(useLocaleStore.getState().locale);
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
            err instanceof Error ? err.message : t('settings.notifPrefSaveFailed'),
        };
      }
    }
    const label = t(PREF_LABEL_KEYS[key]);
    return {
      success: true,
      message: value
        ? t('settings.notifPrefOn', { label })
        : t('settings.notifPrefOff', { label }),
    };
  },
}));

export function isLessonTurnEnabled(): boolean {
  return useNotificationPrefsStore.getState().lessonTurn;
}

export function isCoachNoticeEnabled(): boolean {
  return useNotificationPrefsStore.getState().coachNotice;
}

export function isJoinAlertsEnabled(): boolean {
  return useNotificationPrefsStore.getState().joinAlerts;
}

export function isFriendAlertsEnabled(): boolean {
  return useNotificationPrefsStore.getState().friendAlerts;
}

export function isSystemAlertsEnabled(): boolean {
  return useNotificationPrefsStore.getState().systemAlerts;
}

export function isNotificationPrefEnabledForType(type: AppNotification['type']): boolean {
  const s = useNotificationPrefsStore.getState();
  switch (type) {
    case 'join':
      return s.joinAlerts;
    case 'friend':
      return s.friendAlerts;
    case 'system':
      return s.systemAlerts;
    case 'coach':
      return s.lessonTurn;
    default:
      return true;
  }
}
