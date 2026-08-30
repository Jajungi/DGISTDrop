import type { Court } from '@/src/types';

/** 예약 OFF 현황 모드 — 코트 설치·이용 3단계 */
export type OccupancySetupState = 'unset' | 'ready' | 'active';

export function occupancySetupFromStatus(status: Court['status']): OccupancySetupState {
  if (status === 'empty') return 'unset';
  if (status === 'reserved') return 'ready';
  return 'active';
}

export function courtStatusForSetup(state: OccupancySetupState): Court['status'] {
  if (state === 'unset') return 'empty';
  if (state === 'ready') return 'reserved';
  return 'playing';
}

export const OCCUPANCY_SETUP_LABEL: Record<OccupancySetupState, string> = {
  unset: '미설치',
  ready: '설치됨',
  active: '사용 중',
};
