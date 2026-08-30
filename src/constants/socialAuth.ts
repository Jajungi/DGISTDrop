/** Supabase Dashboard Authentication → Providers 슬러그와 일치 */
export type SocialProvider = 'google' | 'naver';

export const SOCIAL_PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: 'Google',
  naver: '네이버',
};

export const SOCIAL_LOGIN_PROVIDERS: SocialProvider[] = ['google', 'naver'];
