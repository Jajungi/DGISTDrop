import { Platform } from 'react-native';
import { getSupabase, isSupabaseEnabled } from '@/src/lib/supabase';
import {
  currentWebPushPlatform,
  detectClientDevice,
  isStandalonePwa,
  webPushClassFromPlatform,
} from '@/src/utils/clientDevice';
import { classifyPushToken } from '@/src/services/supabase/pushSettings';

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? '';

let registeredUserId: string | null = null;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function getWebPushAvailability(): {
  supported: boolean;
  reason?: string;
} {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return { supported: false, reason: '웹 환경이 아닙니다.' };
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { supported: false, reason: '이 브라우저는 알림을 지원하지 않습니다.' };
  }
  if (!VAPID_PUBLIC_KEY) {
    return { supported: false, reason: '알림 키가 아직 설정되지 않았어요.' };
  }
  if (detectClientDevice() === 'ios' && !isStandalonePwa()) {
    return { supported: false, reason: '이 환경에서는 알림을 켤 수 없어요.' };
  }
  return { supported: true };
}

export async function registerWebPushForUser(userId: string): Promise<boolean> {
  if (Platform.OS !== 'web' || !isSupabaseEnabled()) return false;
  const avail = getWebPushAvailability();
  if (!avail.supported) return false;

  try {
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') return false;

    const reg = await navigator.serviceWorker.register('/sw.js?v=20260824-attendance');
    await navigator.serviceWorker.ready;

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    const token = JSON.stringify(subscription.toJSON());
    registeredUserId = userId;
    const platform = currentWebPushPlatform();

    const { error } = await getSupabase()
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      );
    if (error) throw error;

    const { data: mine } = await getSupabase()
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', userId);
    const stale = (mine ?? [])
      .filter(
        (row) =>
          row.token !== token &&
          classifyPushToken(row.token, row.platform) === 'web' &&
          webPushClassFromPlatform(row.platform) === webPushClassFromPlatform(platform)
      )
      .map((row) => row.token);
    if (stale.length) {
      await getSupabase().from('push_tokens').delete().in('token', stale);
    }
    return true;
  } catch (err) {
    console.warn('[webPush] 등록 실패', err);
    return false;
  }
}

export async function unregisterWebPush(): Promise<void> {
  if (Platform.OS !== 'web') return;
  registeredUserId = null;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const token = JSON.stringify(sub.toJSON());
      await getSupabase().from('push_tokens').delete().eq('token', token);
      await sub.unsubscribe();
    }
  } catch (err) {
    console.warn('[webPush] 해제 실패', err);
  }
}
