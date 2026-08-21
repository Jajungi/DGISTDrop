import { detectClientDevice, isStandalonePwa } from '@/src/utils/clientDevice';

export type UiOrientation = 'portrait' | 'landscape';
export type PhysicalPose = 'portrait' | 'landscape-left' | 'landscape-right';

type OrientationLockType =
  | 'portrait'
  | 'portrait-primary'
  | 'landscape'
  | 'landscape-primary'
  | 'landscape-secondary';

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

export function getLockedUiOrientation(): UiOrientation {
  const type = getScreenOrientation()?.type ?? '';
  return type.startsWith('landscape') ? 'landscape' : 'portrait';
}

/**
 * DeviceOrientation → 실제 기기 자세.
 * gamma > 0 : 왼쪽으로 기울임(landscape-left), gamma < 0 : 오른쪽(landscape-right)
 */
export function physicalPoseFromDevice(beta: number | null, gamma: number | null): PhysicalPose | null {
  if (beta == null || gamma == null || Number.isNaN(beta) || Number.isNaN(gamma)) return null;
  if (Math.abs(gamma) >= 45) {
    return gamma > 0 ? 'landscape-left' : 'landscape-right';
  }
  if (Math.abs(beta) <= 35 && Math.abs(gamma) >= 28) {
    return gamma > 0 ? 'landscape-left' : 'landscape-right';
  }
  return 'portrait';
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

export async function lockUiOrientation(target: UiOrientation): Promise<boolean> {
  const orient = getScreenOrientation();
  if (!orient || typeof orient.lock !== 'function') return false;
  const primary: OrientationLockType = target === 'landscape' ? 'landscape' : 'portrait';
  const fallback: OrientationLockType =
    target === 'landscape' ? 'landscape-primary' : 'portrait-primary';
  try {
    await orient.lock(primary);
    return true;
  } catch {
    try {
      await orient.lock(fallback);
      return true;
    } catch {
      return false;
    }
  }
}

/** 시작 시 현재(보통 세로)로 잠가서 자동 회전을 막음 */
export async function lockInitialOrientation(): Promise<void> {
  if (!shouldUseManualRotateHint()) return;
  await lockUiOrientation(getLockedUiOrientation() === 'landscape' ? 'landscape' : 'portrait');
}
