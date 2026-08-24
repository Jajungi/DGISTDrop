import { Platform } from 'react-native';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { isGuestUser } from '@/src/utils/guestAccess';
import {
  parseAttendanceIntent,
  savePendingAttendanceIntent,
  takePendingAttendanceIntent,
} from '@/src/services/attendanceIntentPending';

export { parseAttendanceIntent };

export function applyAttendanceIntentFromNotification(intent: 'going' | 'not_going') {
  const user = useAuthStore.getState().currentUser;
  if (!user || isGuestUser(user) || user.memberStatus !== 'approved') {
    void savePendingAttendanceIntent(intent);
    return;
  }
  const result = useAuthStore.getState().setAttendanceIntent(user.id, intent);
  useNotificationStore.getState().showToast({
    type: intent === 'going' ? 'success' : 'info',
    title: '',
    message:
      intent === 'going'
        ? '참석으로 표시했어요. 언제 올지 칸에서 골라 주세요.'
        : result.message,
  });
}

export async function flushPendingAttendanceIntent() {
  const pending = await takePendingAttendanceIntent();
  if (!pending) return;
  applyAttendanceIntentFromNotification(pending);
}

function consumeAttendanceQuery() {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    const intent = parseAttendanceIntent(url.searchParams.get('attendance'));
    if (!intent) return;
    url.searchParams.delete('attendance');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    applyAttendanceIntentFromNotification(intent);
  } catch {
    /* ignore */
  }
}

function handleNotificationResponse(response: {
  actionIdentifier: string;
}) {
  const action = parseAttendanceIntent(response.actionIdentifier);
  if (action) applyAttendanceIntentFromNotification(action);
}

/** 푸시 버튼·알림함에서 고른 참석/불참을 로그인 후 반영 */
export function bindAttendanceNotificationListeners(): () => void {
  consumeAttendanceQuery();

  const onSwMessage = (event: MessageEvent) => {
    const intent = parseAttendanceIntent(event.data?.intent);
    if (event.data?.type !== 'attendance-intent' || !intent) return;
    applyAttendanceIntentFromNotification(intent);
  };

  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', onSwMessage);
  }

  let expoSub: { remove: () => void } | undefined;
  if (Platform.OS !== 'web') {
    void import('expo-notifications').then((Notifications) => {
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!response) return;
        handleNotificationResponse(response);
        void Notifications.clearLastNotificationResponseAsync();
      });
      expoSub = Notifications.addNotificationResponseReceivedListener((response) => {
        handleNotificationResponse(response);
      });
    });
  }

  return () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', onSwMessage);
    }
    expoSub?.remove();
  };
}
