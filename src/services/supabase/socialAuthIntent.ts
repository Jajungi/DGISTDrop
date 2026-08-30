import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INTENT_KEY = 'social_auth_intent';
const FLASH_KEY = 'social_auth_flash';

export type SocialAuthIntent = 'login' | 'link';

async function write(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

async function read(key: string): Promise<string | null> {
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    return sessionStorage.getItem(key);
  }
  return AsyncStorage.getItem(key);
}

async function remove(key: string): Promise<void> {
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(key);
    return;
  }
  await AsyncStorage.removeItem(key);
}

export async function setSocialAuthIntent(intent: SocialAuthIntent): Promise<void> {
  await write(INTENT_KEY, intent);
}

export async function consumeSocialAuthIntent(): Promise<SocialAuthIntent> {
  const raw = await read(INTENT_KEY);
  await remove(INTENT_KEY);
  if (raw === 'link') return 'link';
  return 'login';
}

/** OAuth 복귀 전 intent 확인 (소비하지 않음) */
export async function peekSocialAuthIntent(): Promise<SocialAuthIntent | null> {
  const raw = await read(INTENT_KEY);
  if (raw === 'link' || raw === 'login') return raw;
  return null;
}

export function isOAuthCallbackPath(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return /\/auth\/callback\/?$/i.test(window.location.pathname);
}

export async function setSocialAuthFlash(message: string): Promise<void> {
  await write(FLASH_KEY, message);
}

export async function consumeSocialAuthFlash(): Promise<string | null> {
  const raw = await read(FLASH_KEY);
  await remove(FLASH_KEY);
  return raw;
}
