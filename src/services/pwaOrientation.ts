import { detectClientDevice, isStandalonePwa } from '@/src/utils/clientDevice';

export type UiOrientation = 'portrait' | 'landscape';
export type PhysicalPose = 'portrait' | 'landscape-left' | 'landscape-right';

type OrientationLockType =
  | 'portrait'
  | 'portrait-primary'
  | 'landscape'
  | 'landscape-primary'
  | 'landscape-secondary';

/** lock()이 실제로 먹었는지. 실패하면 screen.orientation.type은 그냥 현재 화면일 뿐이라 힌트가 안 뜸. */
let lockHeld = false;

function getScreenOrientation(): ScreenOrientation | null {
  if (typeof screen === 'undefined') return null;
  return screen.orientation ?? null;
}

/** 설치된 모바일 웹앱에서만 (크롬 탭의 시스템 버튼과 겹치지 않게) */
export function shouldUseManualRotateHint(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isStandalonePwa()) return false;
  const device = detectClientDevice();
  if (device !== 'android' && device !== 'ios') return false;
  const orient = getScreenOrientation();
  return typeof orient?.lock === 'function';
}

export function isOrientationLockHeld(): boolean {
  return lockHeld;
}

export function getLockedUiOrientation(): UiOrientation {
  const type = getScreenOrientation()?.type ?? '';
  return type.startsWith('landscape') ? 'landscape' : 'portrait';
}

/**
 * DeviceOrientation → 실제 기기 자세.
 * gamma > 0 : 오른쪽이 내려감(시계 방향) → landscape-right
 * 히스테리시스로 경계에서 깜빡임 줄임.
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

/** 아이콘이 돌아갈 각도 (안드로이드 수동 회전 힌트처럼) */
export function iconRotationForPose(pose: PhysicalPose): number {
  if (pose === 'landscape-left') return -90;
  if (pose === 'landscape-right') return 90;
  return 0;
}

async function tryLock(types: OrientationLockType[]): Promise<boolean> {
  const orient = getScreenOrientation();
  if (!orient || typeof orient.lock !== 'function') return false;
  for (const type of types) {
    try {
      await orient.lock(type);
      lockHeld = true;
      return true;
    } catch {
      // next candidate
    }
  }
  return false;
}

export async function lockUiOrientation(
  target: UiOrientation,
  pose?: PhysicalPose | null
): Promise<boolean> {
  if (target === 'portrait') {
    return tryLock(['portrait', 'portrait-primary']);
  }
  if (pose === 'landscape-left') {
    return tryLock(['landscape-secondary', 'landscape', 'landscape-primary']);
  }
  if (pose === 'landscape-right') {
    return tryLock(['landscape-primary', 'landscape', 'landscape-secondary']);
  }
  return tryLock(['landscape', 'landscape-primary', 'landscape-secondary']);
}

/** 시작 시 현재 방향으로 잠가 자동 회전을 막음. 제스처 밖에서는 브라우저가 막을 수 있음. */
export async function lockInitialOrientation(): Promise<boolean> {
  if (!shouldUseManualRotateHint()) return false;
  const current = getLockedUiOrientation();
  return lockUiOrientation(current);
}
