/** 앱 셸과 분리된 변경 이력 사이트 (새 탭). 네이티브는 공식 주소. */
export const CHANGELOG_SITE_PATH = '/history/';
export const CHANGELOG_SITE_URL = 'https://dgistdrop.com/history/';

/** Metro 개발 서버는 디렉터리 인덱스를 안 쓰므로 index.html을 명시한다. */
export function changelogHrefForOrigin(origin: string): string {
  try {
    const host = new URL(origin).hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `${origin}/history/index.html`;
    }
  } catch {
    /* keep path */
  }
  return `${origin}${CHANGELOG_SITE_PATH}`;
}
