/** Supabase Dashboard Authentication → Providers 슬러그와 일치 */
export type SocialProvider = 'google' | 'apple' | 'naver';

export const SOCIAL_PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: 'Google',
  apple: 'Apple',
  naver: '네이버',
};

/** 화면에 노출할 Provider (네이버는 검수 전까지 숨김) */
export const ACTIVE_SOCIAL_PROVIDERS: SocialProvider[] = ['google', 'apple'];

/** @deprecated ACTIVE_SOCIAL_PROVIDERS 사용 */
export const SOCIAL_LOGIN_PROVIDERS = ACTIVE_SOCIAL_PROVIDERS;
