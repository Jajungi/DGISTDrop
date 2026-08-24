import { Platform } from 'react-native';

export type ClientDevice = 'ios' | 'android' | 'desktop' | 'native';

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
  );
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
  return 'desktop';
}

/** 폰·태블릿 웹. 가로는 768px을 넘어도 데스크톱 셸을 쓰지 않는다. */
export function isPhoneLikeWeb(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const device = detectClientDevice();
  if (device === 'ios' || device === 'android') return true;
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
    const canRequest = Platform.OS === 'web' && isStandalonePwa();
    return {
      device,
      deviceLabel: 'iPhone',
      summary: canRequest
        ? '알림을 허용하면 활동일·레슨·공지를 받을 수 있어요.'
        : '이 환경에서는 알림을 켤 수 없어요.',
      guideBody: canRequest
        ? '설정에서 [알림 켜기]를 누르면 푸시를 받을 수 있습니다.'
        : '이 환경에서는 알림을 지원하지 않습니다.',
      howToTitle: '알림',
      steps: ['설정에서 [알림 켜기]를 누르고 허용하세요.'],
      ...NOTIFY_GATE,
      canRequestPermission: canRequest,
      needsHomeScreen: false,
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
