import { useEffect } from 'react';
import { useAuthStore } from '@/src/stores/authStore';
import {
  bindAttendanceNotificationListeners,
  flushPendingAttendanceIntent,
} from '@/src/services/attendanceFromNotification';

export function useAttendanceFromNotification() {
  const currentUserId = useAuthStore((s) => s.currentUser?.id);
  const authHydrated = useAuthStore((s) => s.authHydrated);

  useEffect(() => bindAttendanceNotificationListeners(), []);

  useEffect(() => {
    if (!authHydrated || !currentUserId) return;
    flushPendingAttendanceIntent();
  }, [authHydrated, currentUserId]);
}
