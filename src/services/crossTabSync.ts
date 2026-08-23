import { Platform } from 'react-native';
import { hydrateAppStateFromDisk } from '@/src/services/hydrateApp';
import { CHANNEL_NAME, suppressCrossTabNotify } from '@/src/services/tabSyncNotify';

const STORAGE_KEY_PREFIX = '@badmin/';

let initialized = false;
let rehydrateTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRehydrate() {
  if (rehydrateTimer) clearTimeout(rehydrateTimer);
  rehydrateTimer = setTimeout(() => {
    rehydrateTimer = null;
    suppressCrossTabNotify(600);
    void hydrateAppStateFromDisk({ skipCleaningBonus: true });
  }, 80);
}

/** 웹: 다른 탭에서 바뀐 프로필·코트·포인트 등을 즉시 반영 */
export function initCrossTabSync() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || initialized) return;
  initialized = true;

  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.onmessage = () => scheduleRehydrate();
  } catch {
    /* ignore */
  }

  window.addEventListener('storage', (event) => {
    if (event.key?.startsWith(STORAGE_KEY_PREFIX)) {
      scheduleRehydrate();
    }
  });
}
