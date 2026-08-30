import type { GameMode, NantaHalf } from '@/src/types';

/** 배드민턴 코트 실제 비율 (가로 13.4m × 세로 6.1m) */
export const COURT_ASPECT = 13.4 / 6.1;

export const COACH_COURT_ID = 3;

/** S1 실내체육관 — 코트 배치·라벨 */
export const GYM_VENUE = {
  name: 'DGIST S1 실내체육관',
  shortName: 'S1 체육관',
  stageLabel: '무대',
  entranceLabel: '입구',
  floorMaterial: 'PVC 스포츠 마루',
} as const;

/** 그리드 열 구성 (좌 → 우) */
export const COURT_COLUMNS = [
  { key: 'A', label: 'A열', sublabel: '', ids: [1, 2, 3] },
  { key: 'B', label: 'B열', sublabel: '센터', ids: [4, 5, 6], isCenter: true },
  { key: 'C', label: 'C열', sublabel: '', ids: [7, 8, 9] },
] as const;

export const GYM_FLOOR = {
  base: '#D8CDB8',
  aisle: '#CEC3AE',
  stage: '#C4B89E',
  entrance: '#C8BAA8',
  divider: 'rgba(60, 50, 40, 0.12)',
  stripe: 'rgba(0, 0, 0, 0.035)',
} as const;

export function getCourtColumnIndex(courtId: number): number {
  return COURT_COLUMNS.findIndex((col) => (col.ids as readonly number[]).includes(courtId));
}

export function getCourtColumnLabel(courtId: number): string {
  const col = COURT_COLUMNS[getCourtColumnIndex(courtId)];
  return col ? col.label : '';
}

export function getGameProgressRatio(gamesCompleted: number, maxGames: number): number {
  if (!maxGames || maxGames <= 0) return 0;
  return Math.min(1, Math.max(0, gamesCompleted / maxGames));
}

export const GAME_COUNT_OPTIONS = [2, 3, 4, 5, 6] as const;
export type GameCountOption = (typeof GAME_COUNT_OPTIONS)[number];

/** 체육관 배치: 무대 쪽 → 입구 쪽 */
export const GYM_COURT_ROWS: number[][] = [
  [1, 4, 7],
  [2, 5, 8],
  [3, 6, 9],
];

export function getCourtHeight(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 0;
  return width / COURT_ASPECT;
}

/** 코트 라인 영역 (일러스트·프로필 위치 공통) */
export const COURT_BOUNDS = {
  insetX: 0.04,
  insetY: 0.11,
  widthRatio: 0.92,
  heightRatio: 0.78,
} as const;

/** BWF 공식 치수 (m) */
export const BWF_DIMS = {
  length: 13.4,
  width: 6.1,
  singlesSideInset: 0.46,
  shortServiceFromNet: 1.98,
  doublesLongServiceFromBack: 0.76,
} as const;

const HALF_LENGTH = BWF_DIMS.length / 2;

/** 규칙 안내용 세로형 코트 — 폭 6.1m(X), 길이 13.4m(Y), 네트 가로 */
export function getPortraitCourtGeometry(courtWidth: number) {
  const courtHeight = courtWidth * (BWF_DIMS.length / BWF_DIMS.width);
  const bx = courtWidth * 0.05;
  const by = courtHeight * 0.035;
  const bw = courtWidth - bx * 2;
  const bh = courtHeight - by * 2;

  const netY = by + bh / 2;
  const halfH = bh / 2;
  const shortOff = halfH * (BWF_DIMS.shortServiceFromNet / HALF_LENGTH);
  const longOff = halfH * (BWF_DIMS.doublesLongServiceFromBack / HALF_LENGTH);
  const singlesInset = bw * (BWF_DIMS.singlesSideInset / BWF_DIMS.width);

  return {
    courtWidth,
    courtHeight,
    bx,
    by,
    bw,
    bh,
    netY,
    centerX: bx + bw / 2,
    singlesLeft: bx + singlesInset,
    singlesRight: bx + bw - singlesInset,
    shortServiceTop: netY - shortOff,
    shortServiceBottom: netY + shortOff,
    longServiceTop: by + longOff,
    longServiceBottom: by + bh - longOff,
  };
}

/** 코트 카드용 가로형 — 길이 13.4m(X), 폭 6.1m(Y), 네트 세로 */
export function getLandscapeCourtGeometry(width: number, height: number) {
  const { x: bx, y: by, w: bw, h: bh } = getCourtBounds(width, height);
  const netX = bx + bw / 2;
  const halfLen = bw / 2;
  const shortOff = halfLen * (BWF_DIMS.shortServiceFromNet / HALF_LENGTH);
  const longOff = halfLen * (BWF_DIMS.doublesLongServiceFromBack / HALF_LENGTH);
  const singlesInset = bh * (BWF_DIMS.singlesSideInset / BWF_DIMS.width);

  return {
    bx,
    by,
    bw,
    bh,
    netX,
    centerY: by + bh / 2,
    singlesTop: by + singlesInset,
    singlesBottom: by + bh - singlesInset,
    shortServiceLeft: netX - shortOff,
    shortServiceRight: netX + shortOff,
    longServiceLeft: bx + longOff,
    longServiceRight: bx + bw - longOff,
  };
}

export function getCourtBounds(width: number, height: number) {
  return {
    x: width * COURT_BOUNDS.insetX,
    y: height * COURT_BOUNDS.insetY,
    w: width * COURT_BOUNDS.widthRatio,
    h: height * COURT_BOUNDS.heightRatio,
  };
}

/** 플레이어 아바타 픽셀 좌표 (코트 라인 안쪽) */
export function getPlayerSlotPosition(
  index: number,
  width: number,
  height: number
): { x: number; y: number } | null {
  const { x, y, w, h } = getCourtBounds(width, height);
  const slots = [
    { x: x + w * 0.24, y: y + h * 0.28 },
    { x: x + w * 0.24, y: y + h * 0.72 },
    { x: x + w * 0.76, y: y + h * 0.28 },
    { x: x + w * 0.76, y: y + h * 0.72 },
  ];
  return slots[index] ?? null;
}

/** 게임 진행바 Y 위치 */
export function getGameBarBottom(isCoachCourt: boolean): number {
  return isCoachCourt ? 18 : 6;
}

/** 코트 바닥 톤 (상태별 — 빈 코트는 더 어둡게) */
export const COURT_FLOOR_COLORS = {
  empty: '#3D7560',
  reserved: '#A8BE78',
  playing: '#8BAEE0',
  just_finished: '#A8BFC4',
} as const;

export const COURT_FLOOR_DARK = {
  empty: '#2D5C4A',
  reserved: '#8FA862',
  playing: '#7498D4',
  just_finished: '#90A8AE',
} as const;

export type CourtStatusKey = keyof typeof COURT_FLOOR_COLORS;

/** 코트 현황 색상 범례 (예약 ON) */
export const COURT_STATUS_LEGEND: {
  status: CourtStatusKey;
  label: string;
  description: string;
}[] = [
  { status: 'empty', label: '비어있음', description: '예약·이용 가능한 코트예요.' },
  { status: 'reserved', label: '예약됨', description: '누군가 예약해 둔 상태예요.' },
  { status: 'playing', label: '경기 중', description: '지금 게임이 진행 중이에요.' },
  { status: 'just_finished', label: '방금 종료', description: '게임이 막 끝난 직후예요.' },
];

/** 예약 OFF 현황 모드 색상 범례 (empty=미설치, reserved=설치·대기, playing=사용 중) */
export const OCCUPANCY_STATUS_LEGEND: {
  status: 'empty' | 'reserved' | 'playing';
  label: string;
  description: string;
}[] = [
  { status: 'empty', label: '미설치', description: '코트를 아직 치지 않은 상태예요.' },
  { status: 'reserved', label: '설치됨', description: '코트는 쳐졌지만 지금은 사용하지 않아요.' },
  { status: 'playing', label: '사용 중', description: '지금 코트를 사용하고 있어요.' },
];

/** 코트 카드 조명·그림자 설명 */
export const COURT_LIGHT_LEGEND = {
  title: '조명 · 그림자',
  items: [
    {
      label: '터치 / 커서 (광원)',
      description:
        '화면을 터치하거나 마우스를 움직이면 그 위치가 빛이 됩니다. 코트 카드 그림자 방향이 따라 움직여요.',
    },
    {
      label: '경기 중 밝기',
      description:
        '경기 중인 코트는 천장 조명이 켜지고(밝은 녹색 톤), 카드 그림자가 더 깊어져 떠 보이는 느낌이 납니다.',
    },
    {
      label: '비어 있는 코트',
      description: '조명이 꺼진 것처럼 어둡고, 코트 라인도 흐릿하게 보입니다.',
    },
  ],
} as const;

export const COACH_COURT_ACCENT = '#5A7A8A';

/** 천장 조명 (경기 중) */
export const COURT_VENUE_LIGHT = 'rgba(232, 248, 220, 0.5)';

export const COURT_LINE_COLOR = 'rgba(255,255,255,0.72)';
export const COURT_NET_COLOR = 'rgba(255,255,255,0.78)';

/** Portfolio 카드 스타일 (배경 + 진행바 액센트) */
export const COURT_BOX_THEMES = {
  empty: { bg: '#C8F7DC', accent: '#3A9E7A' },
  reserved: { bg: '#DCE8C0', accent: '#7A9858' },
  playing: { bg: '#D5DEFF', accent: '#3A756C' },
  just_finished: { bg: '#E8EDF0', accent: '#5A6B72' },
} as const;

export const GAME_MODE_CONFIG: Record<
  GameMode,
  {
    label: string;
    shortLabel: string;
    color: string;
    badgeBg: string;
    activeFloorTint: string;
  }
> = {
  nanta: {
    label: '난타',
    shortLabel: '난타',
    color: '#4A8A48',
    badgeBg: '#D8EDD6',
    activeFloorTint: 'rgba(124, 196, 120, 0.28)',
  },
  casual: {
    label: '경기',
    shortLabel: '경기',
    color: '#4A72C4',
    badgeBg: '#DDE8FA',
    activeFloorTint: 'rgba(91, 141, 239, 0.2)',
  },
  // 랭크전은 '경기'로 통합됨 — 과거 데이터 표시용으로만 유지
  ranked: {
    label: '경기',
    shortLabel: '경기',
    color: '#4A72C4',
    badgeBg: '#DDE8FA',
    activeFloorTint: 'rgba(91, 141, 239, 0.2)',
  },
};

export function normalizeNantaHalf(half?: string | null): NantaHalf {
  if (half === 'far' || half === 'near') return half;
  if (half === 'left') return 'near';
  if (half === 'right') return 'far';
  return 'near';
}

export const NANTA_HALF_LABEL: Record<NantaHalf, string> = {
  near: '무대 쪽 반',
  far: '입구 쪽 반',
};

// 예약 시 선택 가능한 모드 — 랭크전은 '경기'로 통합되어 제외
export const GAME_MODES: GameMode[] = ['nanta', 'casual'];
