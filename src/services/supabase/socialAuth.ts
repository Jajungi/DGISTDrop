import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { makeRedirectUri } from 'expo-auth-session';
import type { Provider } from '@supabase/supabase-js';
import { getSupabase, isSupabaseEnabled } from '@/src/lib/supabase';
import type { SocialProvider } from '@/src/constants/socialAuth';
import { setSocialAuthIntent } from '@/src/services/supabase/socialAuthIntent';

export type SocialAuthResult = { success: boolean; message: string; oauthRedirect?: boolean };

function asAuthProvider(provider: SocialProvider): Provider {
  return provider as Provider;
}

export function getOAuthRedirectUri(): string {
  return makeRedirectUri({
    scheme: 'badmin',
    path: 'auth/callback',
  });
}

export function isSocialAuthAvailable(): boolean {
  return isSupabaseEnabled();
}

export async function createSessionFromOAuthUrl(url: string): Promise<void> {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) {
    throw new Error(String(params.error_description ?? params.error ?? errorCode));
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;
  const code = params.code;

  if (accessToken && refreshToken) {
    const { error } = await getSupabase().auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return;
  }

  if (code) {
    const { error } = await getSupabase().auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  const { data } = await getSupabase().auth.getSession();
  if (data.session?.user) return;

  throw new Error('로그인 응답에 코드가 없어요.');
}

async function runOAuthFlow(
  start: (redirectTo: string) => Promise<{ url: string | null; error: Error | null }>
): Promise<SocialAuthResult> {
  if (!isSupabaseEnabled()) {
    return { success: false, message: 'Supabase가 설정되지 않았어요.' };
  }

  const redirectTo = getOAuthRedirectUri();
  const { url, error } = await start(redirectTo);
  if (error) return { success: false, message: error.message };
  if (!url) return { success: false, message: '로그인 주소를 받지 못했어요.' };

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.location.assign(url);
    }
    return { success: true, message: '', oauthRedirect: true };
  }

  const result = await WebBrowser.openAuthSessionAsync(url, redirectTo);
  if (result.type !== 'success') {
    return { success: false, message: '로그인이 취소됐어요.' };
  }

  try {
    await createSessionFromOAuthUrl(result.url);
    return { success: true, message: '' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '로그인에 실패했어요.';
    return { success: false, message: msg };
  }
}

export async function getOAuthProfileName(): Promise<string> {
  if (!isSupabaseEnabled()) return '';
  const { data } = await getSupabase().auth.getUser();
  const meta = data.user?.user_metadata ?? {};
  const raw =
    meta.full_name ??
    meta.name ??
    meta.nickname ??
    data.user?.email?.split('@')[0] ??
    '';
  return String(raw).trim();
}

function normalizeSocialProvider(id: string): SocialProvider | null {
  if (id === 'google') return 'google';
  if (id === 'apple') return 'apple';
  if (id === 'naver' || id === 'custom:naver') return 'naver';
  return null;
}

export async function signInWithSocialProvider(provider: SocialProvider): Promise<SocialAuthResult> {
  await setSocialAuthIntent('login');
  return runOAuthFlow(async (redirectTo) => {
    const { data, error } = await getSupabase().auth.signInWithOAuth({
      provider: asAuthProvider(provider),
      options: {
        redirectTo,
        skipBrowserRedirect: Platform.OS !== 'web',
      },
    });
    return { url: data.url, error: error as Error | null };
  });
}

export async function linkSocialProvider(provider: SocialProvider): Promise<SocialAuthResult> {
  await setSocialAuthIntent('link');
  return runOAuthFlow(async (redirectTo) => {
    const { data, error } = await getSupabase().auth.linkIdentity({
      provider: asAuthProvider(provider),
      options: {
        redirectTo,
        skipBrowserRedirect: Platform.OS !== 'web',
      },
    });
    return { url: data.url, error: error as Error | null };
  });
}

export async function unlinkSocialProvider(provider: SocialProvider): Promise<SocialAuthResult> {
  if (!isSupabaseEnabled()) {
    return { success: false, message: 'Supabase가 설정되지 않았어요.' };
  }

  const { data, error: userError } = await getSupabase().auth.getUser();
  if (userError || !data.user) {
    return { success: false, message: '로그인 상태를 확인할 수 없어요.' };
  }

  const identity = data.user.identities?.find(
    (row) => normalizeSocialProvider(row.provider) === provider
  );
  if (!identity) {
    return { success: false, message: '연동된 계정이 없어요.' };
  }

  const { error } = await getSupabase().auth.unlinkIdentity(identity);
  if (error) return { success: false, message: error.message };
  return { success: true, message: '연동을 해제했어요.' };
}

export async function getLinkedSocialProviders(): Promise<SocialProvider[]> {
  if (!isSupabaseEnabled()) return [];
  await getSupabase().auth.refreshSession();
  const { data } = await getSupabase().auth.getUser();
  const linked = data.user?.identities?.map((row) => normalizeSocialProvider(row.provider)) ?? [];
  return linked.filter((p): p is SocialProvider => p !== null);
}
