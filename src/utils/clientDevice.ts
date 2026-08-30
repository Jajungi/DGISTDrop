import { Platform } from 'react-native';
import type { AppLocale } from '@/src/i18n/types';
import { getT } from '@/src/i18n/useI18n';

export type ClientDevice = 'ios' | 'android' | 'desktop' | 'native';

/** Chrome·Safari 등 브라우저 구분 (웹 전용) */
export type WebBrowser = 'safari' | 'chrome' | 'samsung' | 'firefox' | 'edge' | 'other';

/**
 * 지금 이 탭이 홈 화면 웹앱으로 열렸는지.
 * Android minimal-ui·fullscreen, iOS navigator.standalone 포함.
 */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return ['standalone', 'fullscreen', 'minimal-ui'].some((mode) =>
    window.matchMedia(`(display-mode: ${mode})`).matches
  );
}

export function detectWebBrowser(): WebBrowser {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/Edg\//i.test(ua)) return 'edge';
  if (/SamsungBrowser/i.test(ua)) return 'samsung';
  if (/Firefox|FxiOS/i.test(ua)) return 'firefox';
  if (/CriOS|Chrome/i.test(ua)) return 'chrome';
  if (/Safari/i.test(ua)) return 'safari';
  return 'other';
}

/** 설치 안내를 어떤 경로로 보여 줄지. 웹앱·네이티브면 null */
export type PwaInstallContext =
  | 'ios-safari'
  | 'ios-other'
  | 'android-chrome'
  | 'android-browser'
  | 'desktop-chrome'
  | 'desktop-edge'
  | 'desktop-other';

export function detectPwaInstallContext(): PwaInstallContext | null {
  if (Platform.OS !== 'web') return null;
  if (isStandalonePwa()) return null;

  const device = detectClientDevice();
  const browser = detectWebBrowser();

  if (device === 'ios') {
    return browser === 'safari' ? 'ios-safari' : 'ios-other';
  }
  if (device === 'android') {
    return browser === 'chrome' ? 'android-chrome' : 'android-browser';
  }
  if (device === 'desktop') {
    if (browser === 'chrome') return 'desktop-chrome';
    if (browser === 'edge') return 'desktop-edge';
    return 'desktop-other';
  }
  return null;
}

export function getPwaInstallContextLabel(ctx: PwaInstallContext): string {
  switch (ctx) {
    case 'ios-safari':
      return 'iPhone · Safari';
    case 'ios-other':
      return 'iPhone · Safari 필요';
    case 'android-chrome':
      return 'Android · Chrome';
    case 'android-browser':
      return 'Android · 브라우저';
    case 'desktop-chrome':
      return 'PC · Chrome';
    case 'desktop-edge':
      return 'PC · Edge';
    case 'desktop-other':
      return 'PC · 브라우저';
    default:
      return '';
  }
}

export type WebPushClass = 'desktop' | 'android' | 'ios';

export function currentWebPushPlatform(): `web-${WebPushClass}` {
  const device = detectClientDevice();
  if (device === 'android') return 'web-android';
  if (device === 'ios') return 'web-ios';
  return 'web-desktop';
}

/** 같은 사람의 웹 구독 분류용. 등록 시에는 환경과 무관하게 사람당 1개만 남긴다. */
export function webPushClassFromPlatform(platform?: string | null): WebPushClass {
  if (platform === 'web-android') return 'android';
  if (platform === 'web-ios') return 'ios';
  return 'desktop';
}

export function detectClientDevice(): ClientDevice {
  if (Platform.OS !== 'web') return 'native';
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;

  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return 'ios';
  if (/Android/i.test(ua)) return 'android';

  // Chrome·Safari 「데스크톱 사이트」 등으로 UA만 PC처럼 바뀐 터치 기기
  if (isTouchPrimaryWeb()) {
    if (/Macintosh|Mac OS X/i.test(ua) && navigator.maxTouchPoints > 0) return 'ios';
    return 'android';
  }

  return 'desktop';
}

/** 폰·태블릿 웹. 가로는 768px을 넘어도 데스크톱 셸을 쓰지 않는다. */
export function isPhoneLikeWeb(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const device = detectClientDevice();
  if (device === 'ios' || device === 'android') return true;
  return isTouchPrimaryWeb();
}

function isTouchPrimaryWeb(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

export interface PushGuideCopy {
  device: ClientDevice;
  deviceLabel: string;
  /** 설정 카드·게이트 한 줄 */
  summary: string;
  /** 이용 안내 FAQ */
  guideBody: string;
  howToTitle: string;
  steps: string[];
  gateTitle: string;
  gateBody: string;
  /** 지금 이 화면에서 Notification.requestPermission 가능 */
  canRequestPermission: boolean;
  needsHomeScreen: boolean;
}

export function getPushGuideCopy(
  device = detectClientDevice(),
  locale: AppLocale = 'ko'
): PushGuideCopy {
  const t = getT(locale);

  if (device === 'native') {
    return {
      device,
      deviceLabel: t('push.deviceNative'),
      summary: t('push.nativeSummary'),
      guideBody: t('push.nativeGuideBody'),
      howToTitle: t('push.nativeHowTo'),
      steps: [t('push.nativeStep1'), t('push.nativeStep2')],
      gateTitle: t('push.gateTitle'),
      gateBody: t('push.gateBody'),
      canRequestPermission: true,
      needsHomeScreen: false,
    };
  }

  if (device === 'ios') {
    const standalone = isStandalonePwa();
    const canRequest = Platform.OS === 'web' && standalone;
    const needsHomeScreen = Platform.OS === 'web' && !standalone;
    return {
      device,
      deviceLabel: t('push.deviceIphone'),
      summary: canRequest ? t('push.iosSummaryOk') : t('push.iosSummaryNeedHome'),
      guideBody: canRequest ? t('push.iosGuideOk') : t('push.iosGuideNeedHome'),
      howToTitle: needsHomeScreen ? t('push.iosHowToNeedHome') : t('push.iosHowToOk'),
      steps: needsHomeScreen
        ? [
            t('push.iosStepNeedHome1'),
            t('push.iosStepNeedHome2'),
            t('push.iosStepNeedHome3'),
            t('push.iosStepNeedHome4'),
          ]
        : [t('push.iosStepOk')],
      gateTitle: needsHomeScreen ? t('push.iosGateNeedHome') : t('push.gateTitle'),
      gateBody: needsHomeScreen ? t('push.iosGateNeedHomeBody') : t('push.gateBody'),
      canRequestPermission: canRequest,
      needsHomeScreen,
    };
  }

  if (device === 'android') {
    return {
      device,
      deviceLabel: t('push.deviceAndroid'),
      summary: t('push.androidSummary'),
      guideBody: t('push.androidGuideBody'),
      howToTitle: t('push.androidHowTo'),
      steps: [t('push.androidStep1'), t('push.androidStep2')],
      gateTitle: t('push.gateTitle'),
      gateBody: t('push.gateBody'),
      canRequestPermission: true,
      needsHomeScreen: false,
    };
  }

  return {
    device,
    deviceLabel: t('push.deviceDesktop'),
    summary: t('push.desktopSummary'),
    guideBody: t('push.desktopGuideBody'),
    howToTitle: t('push.desktopHowTo'),
    steps: [t('push.desktopStep1'), t('push.desktopStep2')],
    gateTitle: t('push.gateTitle'),
    gateBody: t('push.gateBody'),
    canRequestPermission: true,
    needsHomeScreen: false,
  };
}
