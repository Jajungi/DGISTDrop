export type UiOrientation = 'portrait' | 'landscape';
export type PhysicalPose = 'portrait' | 'landscape-left' | 'landscape-right';
export type CssOrient = 'portrait' | 'landscape-left' | 'landscape-right';

type OrientationLockType =
  | 'portrait'
  | 'portrait-primary'
  | 'landscape'
  | 'landscape-primary'
  | 'landscape-secondary';

/** 네이티브 lock() 성공 여부. 웹앱은 거의 실패하므로 CSS 폴백을 씀. */
let nativeLockHeld = false;
let cssOrient: CssOrient = 'portrait';
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeAppOrientation(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getCssOrient(): CssOrient {
  return cssOrient;
}

function getScreenOrientation(): ScreenOrientation | null {
  if (typeof screen === 'undefined') return null;
  return screen.orientation ?? null;
}

/** 설치된 모바일 웹앱에서 OS 회전을 가로채지 않음. 크롬 탭처럼 시스템 수동 회전을 씀. */
export function shouldUseManualRotateHint(): boolean {
  return false;
}

export function isOrientationLockHeld(): boolean {
  return shouldUseManualRotateHint();
}

export function getLockedUiOrientation(): UiOrientation {
  if (cssOrient !== 'portrait') return 'landscape';
  if (nativeLockHeld) {
    const type = getScreenOrientation()?.type ?? '';
    return type.startsWith('landscape') ? 'landscape' : 'portrait';
  }
  return 'portrait';
}

/**
 * DeviceOrientation → 실제 기기 자세.
 * gamma > 0 : 오른쪽이 내려감(시계 방향) → landscape-right
 */
export function physicalPoseFromDevice(
  beta: number | null,
  gamma: number | null,
  prev: PhysicalPose | null
): PhysicalPose | null {
  if (beta == null || gamma == null || Number.isNaN(beta) || Number.isNaN(gamma)) return prev;
  const absG = Math.abs(gamma);
  const absB = Math.abs(beta);
  const wasLandscape = prev === 'landscape-left' || prev === 'landscape-right';
  const landscape = wasLandscape
    ? absG >= 28 || (absB <= 42 && absG >= 20)
    : absG >= 48 || (absB <= 32 && absG >= 32);
  if (!landscape) return 'portrait';
  return gamma >= 0 ? 'landscape-right' : 'landscape-left';
}

export function poseToUi(pose: PhysicalPose): UiOrientation {
  return pose === 'portrait' ? 'portrait' : 'landscape';
}

export function iconRotationForPose(pose: PhysicalPose): number {
  if (pose === 'landscape-left') return -90;
  if (pose === 'landscape-right') return 90;
  return 0;
}

function setCssOrient(next: CssOrient) {
  cssOrient = next;
  if (typeof document === 'undefined') return;
  if (next === 'portrait') {
    document.documentElement.removeAttribute('data-app-orient');
  } else {
    document.documentElement.setAttribute('data-app-orient', next);
  }
  emit();
}

async function tryLock(types: OrientationLockType[]): Promise<boolean> {
  const orient = getScreenOrientation();
  if (!orient || typeof orient.lock !== 'function') return false;
  for (const type of types) {
    try {
      await orient.lock(type);
      nativeLockHeld = true;
      return true;
    } catch {
      // next
    }
  }
  return false;
}

function applyCssLock(target: UiOrientation, pose?: PhysicalPose | null) {
  nativeLockHeld = false;
  if (target === 'portrait') {
    setCssOrient('portrait');
    return;
  }
  setCssOrient(pose === 'landscape-left' ? 'landscape-left' : 'landscape-right');
}

export async function lockUiOrientation(
  target: UiOrientation,
  pose?: PhysicalPose | null
): Promise<boolean> {
  let types: OrientationLockType[];
  if (target === 'portrait') {
    types = ['portrait', 'portrait-primary'];
  } else if (pose === 'landscape-left') {
    types = ['landscape-secondary', 'landscape', 'landscape-primary'];
  } else if (pose === 'landscape-right') {
    types = ['landscape-primary', 'landscape', 'landscape-secondary'];
  } else {
    types = ['landscape', 'landscape-primary', 'landscape-secondary'];
  }

  const native = await tryLock(types);
  if (native) {
    setCssOrient('portrait');
    return true;
  }
  applyCssLock(target, pose);
  return true;
}

export async function lockInitialOrientation(): Promise<boolean> {
  return false;
}

export async function requestDeviceOrientationPermission(): Promise<void> {
  if (typeof window === 'undefined') return;
  const DOE = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<string>;
  };
  if (typeof DOE.requestPermission !== 'function') return;
  try {
    await DOE.requestPermission();
  } catch {
    // 거부해도 CSS 고정은 동작
  }
}
