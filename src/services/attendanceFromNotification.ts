import { Platform } from 'react-native';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { isGuestUser } from '@/src/utils/guestAccess';

const PENDING_KEY = 'drop-attendance-intent';

export function parseAttendanceIntent(value: unknown): 'going' | 'not_going' | null {
  return value === 'going' || value === 'not_going' ? value : null;
}

export function applyAttendanceIntentFromNotification(intent: 'going' | 'not_going') {
  const user = useAuthStore.getState().currentUser;
  if (!user || isGuestUser(user) || user.memberStatus !== 'approved') {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(PENDING_KEY, intent);
    }
    return;
  }
  const result = useAuthStore.getState().setAttendanceIntent(user.id, intent);
  useNotificationStore.getState().showToast({
    type: intent === 'going' ? 'success' : 'info',
    title: '',
    message:
      intent === 'going'
        ? '참석으로 표시했어요. 프로필에서 오늘 시간을 고를 수 있어요.'
        : result.message,
  });
}

export function flushPendingAttendanceIntent() {
  if (typeof sessionStorage === 'undefined') return;
  const pending = parseAttendanceIntent(sessionStorage.getItem(PENDING_KEY));
  if (!pending) return;
  sessionStorage.removeItem(PENDING_KEY);
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
      expoSub = Notifications.addNotificationResponseReceivedListener((response) => {
        const action = parseAttendanceIntent(response.actionIdentifier);
        const dataKind = (response.notification.request.content.data as { kind?: string } | undefined)
          ?.kind;
        if (action) {
          applyAttendanceIntentFromNotification(action);
          return;
        }
        if (dataKind === 'attendance') {
          /* 본문만 탭하면 앱만 열고, 참석/불참은 버튼으로 */
        }
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
