import { typography, spacing } from '@/src/theme';

/** 반응형 기준 너비 (iPhone 14 등) */
export const REF_WIDTH = 390;

/** 개발자 무한 포인트 모드 ON 시 부여 포인트 */
export const INFINITE_DEV_POINTS = 999_999;

/**
 * 모바일 기본 체감: 브라우저 확대 75% × 글자크기 115% 에 가깝게
 * (레이아웃 ≈ 0.75, 글자 ≈ 0.75×1.15)
 */
const MOBILE_LAYOUT_AT_REF = 0.75;
const MOBILE_TEXT_AT_REF = 0.75 * 1.15; // 0.8625

type TypographyKey = keyof typeof typography;

function scaleNum(n: number, scale: number): number {
  return Math.round(n * scale);
}

/** 화면 너비 기준 글자·간격 스케일 (데스크톱은 1 고정) */
export function getResponsiveMetrics(width: number, isDesktop: boolean) {
  const isCompact = !isDesktop && width < 360;
  const isNarrow = !isDesktop && width < 340;
  const ratio = width / REF_WIDTH;

  const scale = isDesktop
    ? 1
    : Math.min(0.9, Math.max(0.72, ratio * MOBILE_TEXT_AT_REF));
  const spaceScale = isDesktop
    ? 1
    : Math.min(0.82, Math.max(0.65, ratio * MOBILE_LAYOUT_AT_REF));

  const s = (n: number) => scaleNum(n, scale);
  const sp = (n: number) => scaleNum(n, spaceScale);

  const scaledTypography = Object.fromEntries(
    (Object.keys(typography) as TypographyKey[]).map((key) => {
      const t = typography[key];
      return [
        key,
        {
          ...t,
          fontSize: s(t.fontSize),
          lineHeight: s(t.lineHeight),
        },
      ];
    })
  ) as typeof typography;

  const scaledSpacing = {
    xs: sp(spacing.xs),
    sm: sp(spacing.sm),
    md: sp(spacing.md),
    lg: sp(spacing.lg),
    xl: sp(spacing.xl),
    xxl: spacing.xxl,
  };

  return { scale, spaceScale, isCompact, isNarrow, scaledTypography, scaledSpacing };
}
