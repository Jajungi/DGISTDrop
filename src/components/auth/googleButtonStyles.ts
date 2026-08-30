import type { ThemePalette } from '@/src/theme/palettes';

/** 로그인·설정 Google 버튼 — 라이트/다크 팔레트 공통 */
export function googleAuthButtonStyles(theme: ThemePalette) {
  return {
    wide: {
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.borderStrong,
    },
    wideLinked: {
      backgroundColor: theme.surfaceAlt,
      borderColor: theme.border,
    },
    iconCircle: {
      backgroundColor: theme.nestedSurface,
      borderColor: theme.border,
    },
    loadingCircle: {
      backgroundColor: theme.surfaceAlt,
      borderColor: theme.border,
    },
    label: {
      color: theme.text,
    },
  };
}
