import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import {
  parseAttendanceIntent,
  savePendingAttendanceIntent,
} from '@/src/services/attendanceIntentPending';

export const ATTENDANCE_NOTIFICATION_TASK = 'DROP-ATTENDANCE-NOTIFICATION';

const ATTENDANCE_ACTIONS: Notifications.NotificationAction[] = [
  { identifier: 'going', buttonTitle: '참석', options: { opensAppToForeground: true } },
  { identifier: 'not_going', buttonTitle: '불참', options: { opensAppToForeground: true } },
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function parseTaskData(payload: Notifications.NotificationTaskPayload): Record<string, unknown> {
  if ('actionIdentifier' in payload) {
    return asRecord(payload.notification.request.content.data);
  }
  const raw = 'data' in payload ? payload.data : undefined;
  if (raw && typeof raw === 'object' && 'dataString' in raw && typeof raw.dataString === 'string') {
    try {
      return asRecord(JSON.parse(raw.dataString));
    } catch {
      return {};
    }
  }
  return asRecord(raw);
}

function shouldPresentLocal(
  payload: Notifications.NotificationTaskPayload,
  data: Record<string, unknown>
): boolean {
  if ('actionIdentifier' in payload) return false;
  if ('notification' in payload && payload.notification != null) return false;
  const flag = data.presentLocal;
  return flag === true || flag === 1 || flag === '1' || flag === 'true';
}

async function ensureAttendanceCategory() {
  await Notifications.setNotificationCategoryAsync('attendance', ATTENDANCE_ACTIONS);
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '기본',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3182F6',
    });
  }
}

TaskManager.defineTask<Notifications.NotificationTaskPayload>(
  ATTENDANCE_NOTIFICATION_TASK,
  async ({ data, error }) => {
    if (error || !data) return;

    if ('actionIdentifier' in data) {
      const intent = parseAttendanceIntent(data.actionIdentifier);
      if (intent) await savePendingAttendanceIntent(intent);
      return;
    }

    const extra = parseTaskData(data);
    if (!shouldPresentLocal(data, extra)) return;

    await ensureAttendanceCategory();
    await Notifications.scheduleNotificationAsync({
      identifier: 'drop-attendance',
      content: {
        title: String(extra.title ?? 'Drop'),
        body: String(extra.body ?? ''),
        categoryIdentifier: 'attendance',
        sound: true,
        data: { kind: 'attendance' },
        ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
      },
      trigger: null,
    });
  }
);

void Notifications.registerTaskAsync(ATTENDANCE_NOTIFICATION_TASK);
