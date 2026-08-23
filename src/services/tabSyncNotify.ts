import { Platform } from 'react-native';

const CHANNEL_NAME = 'badmin-state-sync';

let suppressUntil = 0;

export function suppressCrossTabNotify(ms: number) {
  suppressUntil = Date.now() + ms;
}

/** 다른 탭에 저장 완료만 알림. hydrate 모듈을 가져오지 않는다. */
export function notifyCrossTabSync() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  if (Date.now() < suppressUntil) return;

  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage({ type: 'state-updated', ts: Date.now() });
    bc.close();
  } catch {
    /* BroadcastChannel 미지원 환경 */
  }
}

export { CHANNEL_NAME };
