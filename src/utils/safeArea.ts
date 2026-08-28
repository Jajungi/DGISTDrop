import { Platform } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { detectClientDevice, isStandalonePwa } from '@/src/utils/clientDevice';

/** iOS 홈 인디케이터 영역. env()가 0일 때 PWA 폴백 */
const IOS_HOME_INDICATOR_FALLBACK = 34;

export const TAB_BAR_CONTENT_HEIGHT = 52;
export const TAB_BAR_CONTENT_HEIGHT_LANDSCAPE = 40;
export const TAB_BAR_ICON_ONLY_HEIGHT = 44;
export const TAB_BAR_ICON_ONLY_HEIGHT_LANDSCAPE = 36;

/** iPhone·iPod 세로(폰 비율) — 탭 바는 아이콘만 */
export function isIphonePhonePortrait(width: number, height: number): boolean {
  if (width >= height || width > 520) return false;

  if (Platform.OS === 'ios') return true;

  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    if (/iPhone|iPod/.test(ua)) return true;
    // iPad는 MacIntel+터치로 잡히므로 너비로 구분
    if (
      detectClientDevice() === 'ios' &&
      width <= 430 &&
      navigator.platform === 'MacIntel' &&
      navigator.maxTouchPoints > 1
    ) {
      return false;
    }
  }
  return false;
}

/** 가로·좁은 화면·iPhone 세로 등 라벨 숨김 (아이콘만) */
export function shouldShowTabBarLabels(opts: {
  isLandscape: boolean;
  isCompact: boolean;
  isNarrow: boolean;
  tabCount: number;
  width: number;
  height: number;
}): boolean {
  if (isIphonePhonePortrait(opts.width, opts.height)) return false;
  if (opts.isLandscape) return false;
  if (opts.isCompact || opts.isNarrow) return false;
  if (opts.tabCount >= 6 && opts.width < 420) return false;
  return true;
}

export function measureCssSafeAreaInsets(): EdgeInsets {
  if (typeof document === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const probe = document.createElement('div');
  probe.style.cssText = `
    position: fixed;
    visibility: hidden;
    pointer-events: none;
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
  `;
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const parse = (v: string) => parseFloat(v) || 0;
  const measured: EdgeInsets = {
    top: parse(cs.paddingTop),
    bottom: parse(cs.paddingBottom),
    left: parse(cs.paddingLeft),
    right: parse(cs.paddingRight),
  };
  document.body.removeChild(probe);

  if (
    Platform.OS === 'web' &&
    detectClientDevice() === 'ios' &&
    measured.bottom <= 0 &&
    (isStandalonePwa() || measured.top > 0)
  ) {
    measured.bottom = IOS_HOME_INDICATOR_FALLBACK;
  }

  return measured;
}

export function mergeSafeAreaInsets(native: EdgeInsets, css: EdgeInsets): EdgeInsets {
  return {
    top: Math.max(native.top, css.top),
    bottom: Math.max(native.bottom, css.bottom),
    left: Math.max(native.left, css.left),
    right: Math.max(native.right, css.right),
  };
}

export function getTabBarHeight(
  insets: EdgeInsets,
  isLandscape: boolean,
  showLabels = true
): number {
  const content = showLabels
    ? isLandscape
      ? TAB_BAR_CONTENT_HEIGHT_LANDSCAPE
      : TAB_BAR_CONTENT_HEIGHT
    : isLandscape
      ? TAB_BAR_ICON_ONLY_HEIGHT_LANDSCAPE
      : TAB_BAR_ICON_ONLY_HEIGHT;
  return content + insets.bottom;
}

export function getTabBarPaddingBottom(insets: EdgeInsets): number {
  if (insets.bottom > 0) return insets.bottom;
  return Platform.OS === 'android' ? 8 : 6;
}
