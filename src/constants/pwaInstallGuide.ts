import type { AppLocale } from '@/src/i18n/types';
import type { PwaInstallContext } from '@/src/utils/clientDevice';
import { getPwaInstallContextLabel } from '@/src/utils/clientDevice';
import {
  getPwaInstallGuidesEn,
  getPwaInstallVisibilityEn,
} from '@/src/constants/pwaInstallGuide.en';

export interface PwaInstallStepText {
  title: string;
  description: string;
}

export interface PwaInstallGuide {
  context: PwaInstallContext;
  title: string;
  intro: string;
  /** 한 장짜리 설치 안내 그림 */
  posterSrc: string;
  posterAlt: string;
  /** 그림과 같은 순서의 단계 설명 (글만) */
  steps: PwaInstallStepText[];
  hint: string;
}

export interface PwaInstallVisibilityInfo {
  environmentLabel: string;
  showWhere: string[];
  hideWhen: string[];
  note?: string;
}

export function getPwaInstallVisibility(
  ctx: PwaInstallContext | null,
  locale: AppLocale = 'ko'
): PwaInstallVisibilityInfo {
  if (locale === 'en') {
    return getPwaInstallVisibilityEn(ctx, ctx ? getPwaInstallContextLabel(ctx) : '');
  }

  const guideWhere = '이용 안내 → 앱 이용 방법 → 웹앱 설치';

  if (!ctx) {
    return {
      environmentLabel: '홈 화면 웹앱 또는 네이티브 앱',
      showWhere: [`${guideWhere} (언제 보이는지 안내만)`],
      hideWhen: [
        '홈 화면 Drop 아이콘(웹앱)으로 연 경우 — 설치 안내 전부 숨김',
        'Play 스토어 Drop 앱',
      ],
      note: 'Safari·Chrome 등 브라우저 탭으로 다시 열면, iPhone·Android는 로그인·설정 카드도 다시 보입니다. PC는 이용 안내만입니다.',
    };
  }

  const label = getPwaInstallContextLabel(ctx);
  const isDesktop = ctx.startsWith('desktop');

  return {
    environmentLabel: `${label} · 브라우저 탭 (웹앱 아님)`,
    showWhere: isDesktop
      ? [`${guideWhere} (그림·순서 안내)`]
      : [
          `${guideWhere} (그림·순서 안내)`,
          '로그인 화면 설치 안내 카드',
          '설정 화면 설치 안내 카드',
        ],
    hideWhen: [
      '홈 화면 Drop 아이콘(웹앱)으로 연 경우',
      'Play 스토어 Drop 앱',
      ...(isDesktop ? ['PC 로그인·설정 화면 (이용 안내만 표시)'] : []),
    ],
    note: isDesktop
      ? 'PC는 필수가 아니라 이용 안내에서만 안내합니다.'
      : '브라우저 탭이면 위 세 곳 모두에 안내가 보입니다.',
  };
}

const IOS_SAFARI: PwaInstallGuide = {
  context: 'ios-safari',
  title: 'iPhone · Safari에서 홈 화면에 추가',
  intro: 'Safari 탭에서는 푸시가 오지 않습니다. 아래 순서대로 홈 화면에 추가한 뒤 Drop 아이콘으로 다시 여세요.',
  posterSrc: '/guide/pwa/ios-safari-guide.png',
  posterAlt: 'iPhone Safari 홈 화면 추가 방법',
  steps: [
    { title: 'Safari로 열기', description: '주소창에 dgistdrop.com 이 보이는 Safari 탭에서 Drop을 엽니다.' },
    { title: '[공유] 누르기', description: '화면 하단 가운데 [공유] 버튼을 누릅니다.' },
    {
      title: '홈 화면에 추가',
      description: '공유 메뉴에서 [홈 화면에 추가]를 고른 뒤, 오른쪽 위 [추가]로 확인합니다.',
    },
    {
      title: '아이콘으로 실행',
      description: '홈 화면의 Drop 아이콘으로 열고, 설정에서 [알림 켜기]를 누릅니다.',
    },
  ],
  hint: 'Chrome 등 다른 앱으로 열었다면 Safari로 다시 열어야 합니다.',
};

const IOS_OTHER: PwaInstallGuide = {
  context: 'ios-other',
  title: 'iPhone · Safari에서 열어 주세요',
  intro:
    '지금은 Safari가 아닌 브라우저입니다. iPhone은 Safari에서만 홈 화면 추가와 푸시가 됩니다.',
  posterSrc: '/guide/pwa/ios-other-guide.png',
  posterAlt: 'iPhone Safari로 전환 후 홈 화면 추가',
  steps: [
    { title: 'Safari 실행', description: 'iPhone에서 Safari 앱을 엽니다.' },
    { title: '주소 입력', description: '주소창에 dgistdrop.com 을 입력해 Drop을 엽니다.' },
    { title: '홈 화면에 추가', description: '하단 [공유] → [홈 화면에 추가] → [추가] 순서입니다.' },
    { title: '아이콘으로 실행', description: '생긴 Drop 아이콘으로 다시 엽니다.' },
  ],
  hint: 'Safari로 연 뒤에는 Safari 기준 안내로 바뀝니다.',
};

const ANDROID_CHROME: PwaInstallGuide = {
  context: 'android-chrome',
  title: 'Android · Chrome에서 설치',
  intro: 'Chrome 메뉴의 [앱 설치]·[홈 화면에 추가], 또는 화면의 [앱 설치] 버튼을 쓸 수 있습니다.',
  posterSrc: '/guide/pwa/android-chrome-guide.png',
  posterAlt: 'Android Chrome 앱 설치 방법',
  steps: [
    { title: 'Chrome으로 열기', description: 'Chrome 탭에서 dgistdrop.com · Drop을 엽니다.' },
    { title: '메뉴(⋮)', description: '오른쪽 위 점 세 개 메뉴를 누릅니다.' },
    { title: '앱 설치', description: '[앱 설치] 또는 [홈 화면에 추가]를 선택합니다.' },
    { title: '아이콘으로 실행', description: '홈 화면·앱 서랍의 Drop 아이콘으로 엽니다.' },
  ],
  hint: '로그인·설정에 [앱 설치] 버튼이 보이면 그것으로도 됩니다.',
};

const ANDROID_BROWSER: PwaInstallGuide = {
  context: 'android-browser',
  title: 'Android · 브라우저에서 바로가기 추가',
  intro: '삼성 인터넷 등 Chrome이 아닌 브라우저입니다. 메뉴에서 홈 화면·바로가기 추가를 찾으세요.',
  posterSrc: '/guide/pwa/android-browser-guide.png',
  posterAlt: 'Android 브라우저 홈 화면 추가',
  steps: [
    { title: '브라우저로 열기', description: '삼성 인터넷 등 지금 브라우저에서 dgistdrop.com 을 엽니다.' },
    { title: '메뉴 열기', description: '오른쪽 아래 메뉴(⋮) 버튼을 누릅니다.' },
    {
      title: '웹앱·바로가기 추가',
      description: '[현재 페이지 추가] → [웹앱] 또는 [홈 화면]을 선택합니다.',
    },
    { title: '아이콘으로 실행', description: '홈 화면에 생긴 Drop 아이콘을 눌러 앱처럼 실행합니다.' },
  ],
  hint: '메뉴 문구는 브라우저마다 다릅니다. 가능하면 Chrome 사용을 권장합니다.',
};

const DESKTOP_CHROME: PwaInstallGuide = {
  context: 'desktop-chrome',
  title: 'PC · Chrome에서 앱으로 설치',
  intro: '필수는 아닙니다. 원하면 브라우저 탭 대신 창 앱처럼 설치해 쓸 수 있습니다.',
  posterSrc: '/guide/pwa/desktop-chrome-guide.png',
  posterAlt: 'PC Chrome 앱으로 설치',
  steps: [
    { title: 'Chrome으로 열기', description: 'Chrome 탭에서 dgistdrop.com · Drop을 엽니다.' },
    { title: '메뉴(⋮)', description: '오른쪽 위 ⋮ → [캐스팅, 저장 및 공유]를 엽니다.' },
    {
      title: '앱으로 설치',
      description:
        '[페이지를 앱으로 설치]를 고르거나 주소창 오른쪽 ⊕ 아이콘을 누른 뒤 [설치]로 확인합니다.',
    },
  ],
  hint: '선택 사항입니다. 이용 안내에만 안내를 둡니다.',
};

const DESKTOP_EDGE: PwaInstallGuide = {
  context: 'desktop-edge',
  title: 'PC · Edge에서 앱으로 설치',
  intro: '선택 사항입니다. Edge 앱 모드로 설치할 수 있습니다.',
  posterSrc: '/guide/pwa/desktop-edge-guide.png',
  posterAlt: 'PC Edge 앱으로 설치',
  steps: [
    { title: 'Edge로 열기', description: 'Edge 탭에서 dgistdrop.com · Drop을 엽니다.' },
    { title: '메뉴(⋯)', description: '오른쪽 위 […] 더보기 메뉴를 누릅니다.' },
    {
      title: '앱으로 설치',
      description: '[기타 도구] → [앱] → [이 사이트를 앱으로 설치]를 선택합니다.',
    },
    {
      title: 'Drop 설치',
      description: '확인 창에서 [설치]를 누릅니다. 시작 메뉴·바탕화면에서 실행하세요.',
    },
  ],
  hint: '선택 사항입니다. 이용 안내에만 안내를 둡니다.',
};

const DESKTOP_OTHER: PwaInstallGuide = {
  context: 'desktop-other',
  title: 'PC · Chrome·Edge 권장',
  intro: '지금 브라우저에서는 앱 설치가 제한될 수 있습니다. Chrome 또는 Edge로 열어 주세요.',
  posterSrc: '/guide/pwa/desktop-chrome-guide.png',
  posterAlt: 'PC Chrome·Edge 앱 설치',
  steps: [
    { title: 'Chrome·Edge 설치', description: '없으면 Chrome 또는 Edge를 설치합니다.' },
    { title: 'Drop 열기', description: 'Chrome·Edge에서 dgistdrop.com 을 엽니다.' },
    { title: '앱으로 설치', description: '메뉴에서 [페이지를 앱으로 설치]를 찾습니다.' },
  ],
  hint: 'Firefox 등에서는 북마크만 가능한 경우가 많습니다.',
};

const GUIDES: Record<PwaInstallContext, PwaInstallGuide> = {
  'ios-safari': IOS_SAFARI,
  'ios-other': IOS_OTHER,
  'android-chrome': ANDROID_CHROME,
  'android-browser': ANDROID_BROWSER,
  'desktop-chrome': DESKTOP_CHROME,
  'desktop-edge': DESKTOP_EDGE,
  'desktop-other': DESKTOP_OTHER,
};

export function getPwaInstallGuide(
  ctx: PwaInstallContext | null,
  locale: AppLocale = 'ko'
): PwaInstallGuide | null {
  if (!ctx) return null;
  if (locale === 'en') return getPwaInstallGuidesEn()[ctx] ?? null;
  return GUIDES[ctx] ?? null;
}
