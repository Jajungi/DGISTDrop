import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { getSupabase, isSupabaseEnabled } from '@/src/lib/supabase';
import { useLocaleStore } from '@/src/stores/localeStore';

let registeredUserId: string | null = null;
let cachedToken: string | null = null;

function getProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Expo 푸시 토큰을 발급받아 Supabase(push_tokens)에 저장한다.
 * - 웹/시뮬레이터/권한 거부 시 조용히 no-op
 * - 로그인 성공 후 currentUser.id 로 호출
 */
export async function registerPushTokenForUser(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!isSupabaseEnabled()) return;
  if (!Device.isDevice) return;
  if (registeredUserId === userId && cachedToken) return;

  try {
    const Notifications = await import('expo-notifications');
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId = getProjectId();
    if (!projectId) {
      console.warn('[push] projectId 없음 — app.json extra.eas.projectId 설정 필요');
      return;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data;
    if (!token) return;

    cachedToken = token;
    registeredUserId = userId;

    const { error } = await getSupabase()
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform: Platform.OS,
          locale: useLocaleStore.getState().locale,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      );
    if (error) throw error;
  } catch (err) {
    console.warn('[push] 토큰 등록 실패', err);
  }
}

/** 로그아웃 시 이 기기의 토큰을 제거한다. */
export async function unregisterPushToken(): Promise<void> {
  if (Platform.OS === 'web' || !isSupabaseEnabled()) return;
  const token = cachedToken;
  registeredUserId = null;
  cachedToken = null;
  if (!token) return;
  try {
    await getSupabase().from('push_tokens').delete().eq('token', token);
  } catch (err) {
    console.warn('[push] 토큰 해제 실패', err);
  }
}
