import type { AppLocale } from '@/src/i18n/types';

export interface BilingualNoticeCopy {
  title: string;
  titleEn?: string;
  body: string;
  bodyEn?: string;
}

/** 운영에서 자주 쓰는 푸시·공지 문구 — 자동 번역 대신 고정 영문 사용 */
export const PUSH_COPY = {
  activityTitle: { ko: 'Drop 활동 알림', en: 'Drop session reminder' },
  cancelTitle: { ko: 'Drop 활동 취소', en: 'Drop session cancelled' },
  noticeTitle: { ko: '공지', en: 'Notice' },
  activityBodyTemplate: {
    ko: '🏸 오늘 {time}부터 활동 있습니다! 앱에서 출석·코트를 확인하세요.',
    en: '🏸 Session starts at {time} today! Check attendance and courts in the app.',
  },
  cancelBody: {
    ko: '❌ 오늘 활동이 취소되었습니다.',
    en: "❌ Today's session has been cancelled.",
  },
  newNoticeBody: {
    ko: '새 공지가 등록되었습니다.',
    en: 'A new notice has been posted.',
  },
} as const;

export function fillPushActivityBody(locale: AppLocale, time: string): string {
  const tpl =
    locale === 'en' ? PUSH_COPY.activityBodyTemplate.en : PUSH_COPY.activityBodyTemplate.ko;
  return tpl.replace('{time}', time);
}

function matchTitlePreset(title: string): { ko: string; en: string } | null {
  const t = title.trim();
  if (!t) return null;
  const presets = [PUSH_COPY.activityTitle, PUSH_COPY.cancelTitle, PUSH_COPY.noticeTitle];
  for (const p of presets) {
    if (t === p.ko || t === p.en) return p;
  }
  if (t === 'Drop') return { ko: 'Drop', en: 'Drop' };
  return null;
}

function extractActivityTime(body: string): string | null {
  const b = body.trim();
  const ko = /^🏸 오늘 (.+?)부터 활동 있습니다! 앱에서 출석·코트를 확인하세요\.?$/.exec(b);
  if (ko) return ko[1].trim();
  const en = /^🏸 Session starts at (.+?) today! Check attendance and courts in the app\.?$/i.exec(
    b
  );
  if (en) return en[1].trim();
  return null;
}

function matchBodyPreset(body: string): { ko: string; en: string } | null {
  const b = body.trim();
  if (!b) return null;

  const time = extractActivityTime(b);
  if (time) {
    return {
      ko: fillPushActivityBody('ko', time),
      en: fillPushActivityBody('en', time),
    };
  }

  const staticBodies = [PUSH_COPY.cancelBody, PUSH_COPY.newNoticeBody];
  for (const p of staticBodies) {
    if (b === p.ko || b === p.en) return p;
  }
  return null;
}

/**
 * 알려진 운영 문구면 고품질 고정 번역을 반환. 없으면 null → API 자동 번역으로 폴백.
 */
export function tryPresetBilingualNotice(params: {
  title: string;
  body: string;
}): BilingualNoticeCopy | null {
  const titlePreset = matchTitlePreset(params.title);
  const bodyPreset = matchBodyPreset(params.body);

  if (!titlePreset && !bodyPreset) return null;

  const titleKo = titlePreset?.ko ?? params.title.trim();
  const titleEn = titlePreset?.en ?? params.title.trim();
  const bodyKo = bodyPreset?.ko ?? params.body.trim();
  const bodyEn = bodyPreset?.en ?? params.body.trim();

  if (!titleKo && !bodyKo) return null;

  return {
    title: titleKo || PUSH_COPY.noticeTitle.ko,
    titleEn: titleEn || undefined,
    body: bodyKo,
    bodyEn: bodyEn || undefined,
  };
}
