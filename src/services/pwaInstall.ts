import { Platform } from 'react-native';

/** 웹 푸시용 서비스 워커만 등록한다. 설치 유도 UI는 쓰지 않는다. */
export async function ensurePwaServiceWorker(): Promise<void> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.warn('[pwa] service worker 등록 실패', err);
  }
}
