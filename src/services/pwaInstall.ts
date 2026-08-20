import { Platform } from 'react-native';
import { detectClientDevice, isStandalonePwa } from '@/src/utils/clientDevice';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listenersReady = false;
const changeListeners = new Set<() => void>();

function notify() {
  changeListeners.forEach((fn) => fn());
}

function ensureListeners() {
  if (listenersReady || Platform.OS !== 'web' || typeof window === 'undefined') return;
  listenersReady = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

/** Chrome가 “앱 설치”를 띄우려면 SW가 미리 등록돼 있어야 합니다. */
export async function ensurePwaServiceWorker(): Promise<void> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  ensureListeners();
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.warn('[pwa] service worker 등록 실패', err);
  }
}

export function subscribePwaInstallAvailability(listener: () => void): () => void {
  ensureListeners();
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

export function canPromptPwaInstall(): boolean {
  ensureListeners();
  return deferredPrompt != null;
}

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  ensureListeners();
  if (!deferredPrompt) return 'unavailable';
  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  await promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  notify();
  return outcome;
}

export function shouldShowAndroidInstallGuide(): boolean {
  if (Platform.OS !== 'web') return false;
  if (isStandalonePwa()) return false;
  return detectClientDevice() === 'android';
}
