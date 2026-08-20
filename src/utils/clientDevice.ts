import { Platform } from 'react-native';

export type ClientDevice = 'ios' | 'android' | 'desktop' | 'native';

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
  );
}

export function detectClientDevice(): ClientDevice {
  if (Platform.OS !== 'web') return 'native';
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
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

export function getPushGuideCopy(device = detectClientDevice()): PushGuideCopy {
  const standalone = Platform.OS === 'web' && isStandalonePwa();

  if (device === 'native') {
    return {
      device,
      deviceLabel: '앱',
      summary: '이 앱에서 알림을 허용하면 활동일·레슨·공지를 받을 수 있어요. 종류는 설정에서 고르세요.',
      guideBody:
        'Play Store Drop 앱에서 알림을 허용하세요. 안 오면 휴대폰 설정 → 앱 → Drop → 알림을 확인하세요.',
      howToTitle: '알림이 안 올 때',
      steps: [
        '설정 → 앱 → Drop → 알림이 켜져 있는지 확인하세요.',
        '앱을 Play Store에서 최신 버전으로 유지하세요.',
      ],
      gateTitle: '알림을 받아 볼까요?',
      gateBody: '활동일 저녁·레슨·공지 푸시를 받으려면 알림 권한이 필요합니다. 나중에 설정에서 종류별로 끌 수 있어요.',
      canRequestPermission: true,
      needsHomeScreen: false,
    };
  }

  if (device === 'ios') {
    const onPwa = standalone;
    return {
      device,
      deviceLabel: 'iPhone',
      summary: onPwa
        ? '홈 화면 바로가기로 열려 있어요. 알림을 허용하면 사이트를 안 봐도 푸시가 옵니다.'
        : 'iPhone은 Safari 탭이 아니라, 홈 화면에 추가한 아이콘으로 열어야 알림을 받을 수 있어요.',
      guideBody: onPwa
        ? '지금 홈 화면 아이콘으로 접속 중입니다. 설정에서 [알림 켜기]를 누르면 푸시를 받을 수 있습니다.'
        : 'iPhone/iPad는 Safari에서 [공유 → 홈 화면에 추가] 한 뒤, 생긴 Drop 아이콘으로 열고 알림을 켜세요. Safari 탭 안에서는 웹 푸시가 지원되지 않습니다.',
      howToTitle: '홈 화면에 추가하는 방법',
      steps: [
        'Safari에서 이 사이트를 연 상태인지 확인하세요. Chrome 앱이 아닙니다.',
        '하단 [공유] 버튼 → [홈 화면에 추가]를 누르세요.',
        '홈 화면에 생긴 Drop 아이콘으로 다시 여세요.',
        '설정에서 [알림 켜기]를 누르고 허용하세요.',
      ],
      gateTitle: onPwa ? '알림을 받아 볼까요?' : '알림은 홈 화면 바로가기에서만',
      gateBody: onPwa
        ? '활동일 저녁·레슨·공지 푸시를 받으려면 알림을 허용해 주세요. 나중에 설정에서 종류별로 끌 수 있어요.'
        : 'Safari 탭에서는 푸시가 오지 않습니다. 공유 → 홈 화면에 추가한 뒤, 그 아이콘으로 열고 알림을 켜 주세요.',
      canRequestPermission: onPwa,
      needsHomeScreen: !onPwa,
    };
  }

  if (device === 'android') {
    return {
      device,
      deviceLabel: 'Android',
      summary: standalone
        ? '홈 화면 바로가기로 열려 있어요. 알림을 허용하면 브라우저를 안 봐도 푸시가 옵니다.'
        : '이 Chrome에서 알림을 허용하면 받을 수 있어요. 더 편하게 쓰려면 메뉴에서 홈 화면에 추가하세요.',
      guideBody:
        'Chrome에서 알림을 허용하면 웹 푸시를 받을 수 있습니다. 메뉴(⋮) → [홈 화면에 추가] 또는 [앱 설치]를 하면 바로가기로도 받을 수 있습니다. Play Store 앱이 있으면 앱에서 켜는 편이 더 안정적입니다.',
      howToTitle: '알림 · 홈 화면 추가',
      steps: [
        '이 화면에서 [알림 켜기]를 누르고 허용하세요.',
        '더 편하게 쓰려면 Chrome 메뉴(⋮) → [홈 화면에 추가] 또는 [앱 설치]를 하세요.',
        'Play Store에 Drop 앱이 있으면 앱에서 알림을 켜도 됩니다.',
      ],
      gateTitle: '알림을 받아 볼까요?',
      gateBody:
        '활동일 저녁·레슨·공지 푸시를 받으려면 알림을 허용해 주세요. Chrome 메뉴에서 홈 화면에 추가하면 더 잘 옵니다. 나중에 설정에서 종류별로 끌 수 있어요.',
      canRequestPermission: true,
      needsHomeScreen: false,
    };
  }

  return {
    device,
    deviceLabel: 'PC',
    summary: '이 브라우저에서 알림만 허용하면 됩니다. 홈 화면 추가는 필요 없어요.',
    guideBody:
      'PC Chrome·Edge에서 이 사이트 알림을 허용하면 됩니다. 바로가기를 만들지 않아도 푸시가 옵니다. 주소창 왼쪽 자물쇠에서 알림이 차단돼 있지 않은지 확인하세요.',
    howToTitle: 'PC에서 알림 켜기',
    steps: [
      '이 화면에서 [알림 켜기]를 누르고 허용하세요.',
      '안 오면 주소창 왼쪽 자물쇠(또는 사이트 설정) → 알림이 허용인지 확인하세요.',
      'Chrome 또는 Edge를 권장합니다.',
    ],
    gateTitle: '알림을 받아 볼까요?',
    gateBody:
      '활동일 저녁·레슨·공지 푸시를 받으려면 이 브라우저에서 알림을 허용해 주세요. PC는 바로가기를 만들지 않아도 됩니다. 나중에 설정에서 종류별로 끌 수 있어요.',
    canRequestPermission: true,
    needsHomeScreen: false,
  };
}
