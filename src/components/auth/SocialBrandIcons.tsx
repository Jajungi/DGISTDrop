import React from 'react';
import Svg, { Path } from 'react-native-svg';

type IconProps = { size?: number };

/** Google brand "G" (4-color) */
export function GoogleBrandIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </Svg>
  );
}

/** Apple brand mark */
export function AppleBrandIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
      <Path
        fill="#FFFFFF"
        d="M16.365 12.67c.02 2.12 1.88 2.83 1.91 2.84-.02.06-.3 1.03-1 2.04-.6.87-1.22 1.74-2.2 1.76-.96.02-1.27-.57-2.37-.57-1.1 0-1.44.55-2.35.59-.95.04-1.67-.96-2.27-1.83-1.24-1.79-2.18-5.05-.91-7.26.63-1.09 1.76-1.78 2.99-1.8.93-.02 1.81.62 2.38.62.56 0 1.62-.77 2.73-.66.46.02 1.76.19 2.59 1.43-.07.04-1.55.9-1.53 2.69.03 2.18 1.9 2.9 1.93 2.92-.01.05-.31 1.05-.98 2.08zM13.9 4.4c.5-.61 1.2-1.02 1.9-1.06.09.74-.21 1.48-.68 2.06-.45.56-1.19.99-1.92 1.05-.08-.69.19-1.4.7-2.05z"
      />
    </Svg>
  );
}

/** Naver brand "N" mark (검수 후 ACTIVE_SOCIAL_PROVIDERS에 추가) */
export function NaverBrandIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
      <Path
        fill="#FFFFFF"
        d="M16.273 12.845L7.376 0H0v24h7.727V11.156L16.624 24H24V0h-7.727v12.845z"
      />
    </Svg>
  );
}
