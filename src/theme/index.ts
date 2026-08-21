import { Platform, StyleSheet } from 'react-native';
import { lightPalette, type ThemePalette } from '@/src/theme/palettes';

export type { ThemePalette };
export { lightPalette, darkPalette, PALETTE_KEYS } from '@/src/theme/palettes';

function token<K extends keyof ThemePalette>(key: K): ThemePalette[K] {
  if (Platform.OS === 'web') {
    return `var(--drop-${key})` as ThemePalette[K];
  }
  return lightPalette[key];
}

/** 크림/틸 팔레트 — 웹은 시스템 라이트/다크 CSS 변수, 네이티브는 라이트 기본값 */
export const colors: ThemePalette = {
  primary: token('primary'),
  primaryDark: token('primaryDark'),
  primaryLight: token('primaryLight'),
  accent: token('accent'),
  accentLight: token('accentLight'),
  background: token('background'),
  surface: token('surface'),
  surfaceAlt: token('surfaceAlt'),
  surfaceElevated: token('surfaceElevated'),
  surfaceGlass: token('surfaceGlass'),
  text: token('text'),
  textSecondary: token('textSecondary'),
  textMuted: token('textMuted'),
  textLight: token('textLight'),
  textOnNeon: token('textOnNeon'),
  border: token('border'),
  borderSubtle: token('borderSubtle'),
  borderStrong: token('borderStrong'),
  divider: token('divider'),
  success: token('success'),
  warning: token('warning'),
  error: token('error'),
  info: token('info'),
  navHover: token('navHover'),
  navActive: token('navActive'),
  searchShadow: token('searchShadow'),
  wave1: token('wave1'),
  wave2: token('wave2'),
  wave3: token('wave3'),
  courtFloor: token('courtFloor'),
  courtFloorLight: token('courtFloorLight'),
  courtLine: token('courtLine'),
  courtEmpty: token('courtEmpty'),
  courtReserved: token('courtReserved'),
  courtPlaying: token('courtPlaying'),
  courtFinished: token('courtFinished'),
  centerCourt: token('centerCourt'),
  chunkyShadow: token('chunkyShadow'),
  overlay: token('overlay'),
  tabBar: token('tabBar'),
  gymFloor: token('gymFloor'),
  neon: token('neon'),
  gymFloorBase: token('gymFloorBase'),
  gymFloorAisle: token('gymFloorAisle'),
  gymFloorStage: token('gymFloorStage'),
  gymFloorEntrance: token('gymFloorEntrance'),
  gymFloorDivider: token('gymFloorDivider'),
  gymFloorStripe: token('gymFloorStripe'),
  courtEmptyFloor: token('courtEmptyFloor'),
  courtSelectedFloor: token('courtSelectedFloor'),
  courtReservedFloor: token('courtReservedFloor'),
  courtPlayingFloor: token('courtPlayingFloor'),
  courtFinishedFloor: token('courtFinishedFloor'),
  courtEmptyFloorEdge: token('courtEmptyFloorEdge'),
  courtReservedFloorEdge: token('courtReservedFloorEdge'),
  courtPlayingFloorEdge: token('courtPlayingFloorEdge'),
  courtFinishedFloorEdge: token('courtFinishedFloorEdge'),
  spotlightRgb: token('spotlightRgb'),
};

/** CSS 변수에 hex 알파를 붙이지 않고 (`var(--drop-primary)33` 금지) 투명도를 적용 */
export function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  if (Platform.OS === 'web' || color.startsWith('var(')) {
    return `color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent)`;
  }
  if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
    const hex = color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return color;
}

export const fonts = {
  mono: 'SpaceMono_700Bold',
  monoRegular: 'SpaceMono_400Regular',
  display: 'DMSans_600SemiBold',
  serif: 'PlayfairDisplay_600SemiBold',
  serifRegular: 'PlayfairDisplay_400Regular',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_600SemiBold',
  score: 'DMSans_600SemiBold',
};

export const spacing = {
  xs: 6,
  sm: 12,
  md: 20,
  lg: 28,
  xl: 36,
  xxl: 56,
};

export const borderRadius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 30,
  panel: 32,
  squish: 20,
  blob: 30,
  full: 9999,
};

export const shadows = {
  none: {},
  sm: Platform.select({
    web: { boxShadow: '0 2px 6px rgba(136,148,171,0.2), 0 12px 16px -12px rgba(71,82,107,0.1)' } as object,
    default: {
      shadowColor: '#8894AB',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 2,
    },
  }) ?? {},
  md: Platform.select({
    web: { boxShadow: '0 4px 12px rgba(136,148,171,0.22), 0 20px 24px -20px rgba(71,82,107,0.12)' } as object,
    default: {
      shadowColor: '#8894AB',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 4,
    },
  }) ?? {},
  glow: Platform.select({
    web: { boxShadow: '0 4px 14px rgba(58, 117, 108, 0.22)' } as object,
    default: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 4,
    },
  }) ?? {},
  neon: {},
};

export const typography = {
  h1: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  score: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  scoreSm: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyBold: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  caption: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  small: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  button: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
};

export const glass = StyleSheet.create({
  panel: { backgroundColor: colors.surface },
  sheet: { backgroundColor: colors.surfaceElevated },
});

export const squishSpring = {
  pressIn: { damping: 18, stiffness: 320, mass: 0.5 },
  pressOut: { damping: 16, stiffness: 260, mass: 0.55 },
};
