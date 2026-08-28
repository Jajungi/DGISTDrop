import { Platform } from 'react-native';

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

const NOTIFY_GATE = {
  gateTitle: '알림을 받아 볼까요?',
  gateBody:
    '활동일 저녁·레슨·공지 푸시를 받으려면 알림 권한이 필요합니다. 나중에 설정에서 종류별로 끌 수 있어요.',
};

export function getPushGuideCopy(device = detectClientDevice()): PushGuideCopy {
  if (device === 'native') {
    return {
      device,
      deviceLabel: '앱',
      summary: '이 앱에서 알림을 허용하면 활동일·레슨·공지를 받을 수 있어요. 종류는 설정에서 고르세요.',
      guideBody:
        'Drop 앱에서 알림을 허용하세요. 안 오면 휴대폰 설정 → 앱 → Drop → 알림을 확인하세요.',
      howToTitle: '알림이 안 올 때',
      steps: [
        '설정 → 앱 → Drop → 알림이 켜져 있는지 확인하세요.',
        '앱을 최신 버전으로 유지하세요.',
      ],
      ...NOTIFY_GATE,
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
      deviceLabel: 'iPhone',
      summary: canRequest
        ? '알림을 허용하면 활동일·레슨·공지를 받을 수 있어요.'
        : 'iPhone은 Safari 탭이 아니라 홈 화면에 추가한 Drop 아이콘에서만 알림을 켤 수 있어요.',
      guideBody: canRequest
        ? '설정에서 [알림 켜기]를 누르면 푸시를 받을 수 있습니다.'
        : 'Safari에서 [공유 → 홈 화면에 추가]한 뒤, 생긴 Drop 아이콘으로 여세요. 그 다음 설정에서 [알림 켜기]를 누르세요.',
      howToTitle: needsHomeScreen ? '홈 화면에 추가 후 알림 켜기' : '알림',
      steps: needsHomeScreen
        ? [
            'Safari로 Drop 사이트를 엽니다.',
            '하단 [공유] → [홈 화면에 추가]를 누릅니다.',
            '생긴 Drop 아이콘으로 다시 엽니다.',
            '설정에서 [알림 켜기]를 누르고 허용합니다.',
          ]
        : ['설정에서 [알림 켜기]를 누르고 허용하세요.'],
      gateTitle: needsHomeScreen ? '홈 화면에 추가해 주세요' : NOTIFY_GATE.gateTitle,
      gateBody: needsHomeScreen
        ? 'iPhone에서는 Safari 탭 안에서는 푸시가 오지 않습니다. 홈 화면에 추가한 Drop 아이콘으로 열면 활동일·레슨·공지 알림을 받을 수 있어요.'
        : NOTIFY_GATE.gateBody,
      canRequestPermission: canRequest,
      needsHomeScreen,
    };
  }

  if (device === 'android') {
    return {
      device,
      deviceLabel: 'Android',
      summary: '알림을 허용하면 활동일·레슨·공지를 받을 수 있어요. 종류는 설정에서 고르세요.',
      guideBody: '설정에서 [알림 켜기]를 누르고 허용하세요.',
      howToTitle: '알림이 안 올 때',
      steps: [
        '이 화면에서 [알림 켜기]를 누르고 허용하세요.',
        '안 오면 브라우저 사이트 설정에서 알림이 허용인지 확인하세요.',
      ],
      ...NOTIFY_GATE,
      canRequestPermission: true,
      needsHomeScreen: false,
    };
  }

  return {
    device,
    deviceLabel: 'PC',
    summary: '알림을 허용하면 활동일·레슨·공지를 받을 수 있어요.',
    guideBody: 'Chrome 또는 Edge에서 알림을 허용하면 됩니다.',
    howToTitle: '알림이 안 올 때',
    steps: [
      '이 화면에서 [알림 켜기]를 누르고 허용하세요.',
      '안 오면 주소창 왼쪽 자물쇠 → 알림이 허용인지 확인하세요.',
    ],
    ...NOTIFY_GATE,
    canRequestPermission: true,
    needsHomeScreen: false,
  };
}
