import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

let initialized = false;

/** 로컬 알림 권한 및 채널 설정 (웹에서는 no-op — push token listener 경고 방지) */
export async function initLocalNotifications(): Promise<void> {
  if (Platform.OS === 'web' || initialized) return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: '기본',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3182F6',
      });
      await Notifications.setNotificationChannelAsync('coach', {
        name: '코치 · 레슨',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 400, 200, 400],
        lightColor: '#E86363',
        sound: 'default',
      });
    }

    initialized = finalStatus === 'granted';
  } catch {
    initialized = false;
  }
}

/** 즉시 로컬 알림 (레슨 사이렌 등) */
export async function pushLocalNotification(
  title: string,
  body: string,
  channelId: 'default' | 'coach' = 'coach'
): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        ...(Platform.OS === 'android' ? { channelId } : {}),
      },
      trigger: null,
    });
  } catch {
    // 알림 실패는 앱 UX를 막지 않음
  }
}
