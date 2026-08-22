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
      howToTitle: '홈 화면에 추가하는 방법 (Safari)',
      steps: [
        '반드시 Safari 앱으로 Drop 사이트를 여세요. (Chrome 등 다른 앱 X)',
        '하단(또는 상단) [공유] 버튼(□↑)을 누르세요.',
        '목록에서 [홈 화면에 추가]를 고르세요. 없으면 시트를 아래로 스크롤하세요.',
        '[웹앱]이 보이면 선택한 뒤 [추가]를 누르세요.',
        '홈 화면에 생긴 Drop 아이콘으로 다시 연 다음, 설정에서 [알림 켜기]를 누르세요.',
      ],
      gateTitle: onPwa ? '알림을 받아 볼까요?' : '알림은 홈 화면 바로가기에서만',
      gateBody: onPwa
        ? '활동일 저녁·레슨·공지 푸시를 받으려면 알림을 허용해 주세요. 나중에 설정에서 종류별로 끌 수 있어요.'
        : 'Safari 탭에서는 푸시가 오지 않습니다. 공유 → 홈 화면에 추가 → 추가 후, 그 아이콘으로 열고 알림을 켜 주세요.',
      canRequestPermission: onPwa,
      needsHomeScreen: !onPwa,
    };
  }

  if (device === 'android') {
    return {
      device,
      deviceLabel: 'Android',
      summary: standalone
        ? '홈 화면 앱으로 열려 있어요. 알림을 허용하면 브라우저를 안 봐도 푸시가 옵니다.'
        : 'Chrome은 [설치]/[바로가기 만들기], 다른 브라우저는 [현재 페이지 추가] → [웹앱]으로 설치하세요.',
      guideBody:
        'Play 스토어 대신 웹앱을 씁니다. Chrome: 메뉴(⋮) → [앱 설치]/[홈 화면에 추가]/[바로가기 만들기]. 다른 브라우저: [현재 페이지 추가] → [웹앱] 선택. 설치 후 Drop 아이콘으로 열고 알림을 켜세요.',
      howToTitle: 'Android에서 앱처럼 설치',
      steps: [
        '【Chrome】 사이트 열기 → 메뉴(⋮) → [앱 설치] 또는 [바로가기 만들기]/[홈 화면에 추가].',
        '【다른 브라우저】 메뉴 → [현재 페이지 추가] → [웹앱](또는 홈 화면에 추가) 선택.',
        '홈 화면 Drop 아이콘으로 다시 여세요.',
        '설정에서 [알림 켜기]를 누르고 허용하세요.',
      ],
      gateTitle: '알림을 받아 볼까요?',
      gateBody:
        '활동일 저녁·레슨·공지 푸시를 받으려면 알림을 허용해 주세요. Chrome 메뉴에서 홈 화면에 추가하면 앱처럼 쓸 수 있어요. 나중에 설정에서 종류별로 끌 수 있어요.',
      canRequestPermission: true,
      needsHomeScreen: false,
    };
  }

  return {
    device,
    deviceLabel: 'PC',
    summary: '이 브라우저에서 알림만 허용하면 됩니다. 원하면 설정에서 앱으로도 설치할 수 있어요.',
    guideBody:
      'PC Chrome·Edge에서 알림을 허용하면 됩니다. 앱 설치(선택): 메뉴(⋮) → [캐스팅, 저장, 공유] → [Drop 설치하기](또는 페이지를 앱으로 설치). 자세한 안내는 설정에 있습니다.',
    howToTitle: 'PC에서 알림·앱 설치',
    steps: [
      '이 화면에서 [알림 켜기]를 누르고 허용하세요.',
      '앱으로 쓰려면 메뉴(⋮) → [캐스팅, 저장, 공유] → [Drop 설치하기]를 누르세요.',
      '안 보이면 주소창 오른쪽 설치 아이콘을 확인하세요.',
      '알림이 안 오면 주소창 왼쪽 자물쇠 → 알림이 허용인지 확인하세요.',
    ],
    gateTitle: '알림을 받아 볼까요?',
    gateBody:
      '활동일 저녁·레슨·공지 푸시를 받으려면 이 브라우저에서 알림을 허용해 주세요. PC는 앱 설치 없이도 됩니다. 나중에 설정에서 종류별로 끌 수 있어요.',
    canRequestPermission: true,
    needsHomeScreen: false,
  };
}
