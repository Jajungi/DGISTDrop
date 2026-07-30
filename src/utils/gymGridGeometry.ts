import { COURT_ASPECT, GYM_COURT_ROWS, getCourtHeight } from '@/src/constants/court';

export const GYM_ROW_ENTRANCE_GAP = 2;
export const GYM_FLOOR_BOTTOM_PAD = 8;
export const GYM_CARD_CHROME_BOTTOM = 3;

export type GymGridLayoutInput = {
  courtWidth: number;
  courtGap: number;
  entranceGutter: number;
  cardHPad: number;
  cardChromeTop: number;
  floorStageH: number;
  floorHeaderH: number;
  aisleH: number;
  /** 바닥 맵을 패널 전체 폭에 맞출 때 (가로 스크롤 아닐 때) */
  panelWidth?: number;
};

export type GymGridLayout = {
  courtWidth: number;
  courtHeight: number;
  slotWidth: number;
  cardChrome: number;
  cardChromeTop: number;
  cardHPad: number;
  courtGap: number;
  entranceGutter: number;
  rowEntranceGap: number;
  floorStageH: number;
  floorHeaderH: number;
  floorContentTop: number;
  aisleH: number;
  rows: number;
  cols: number;
  rowBlockHeight: number;
  courtsRowWidth: number;
  intrinsicFloorWidth: number;
  floorWidth: number;
  floorHeight: number;
  /** 열 구분선 x (입구 거터 기준) */
  columnDividerXs: number[];
  /** 통로 밴드 y 중심 */
  aisleCenterYs: number[];
};

function finitePositive(n: number, fallback: number): number {
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function finiteNonNeg(n: number, fallback = 0): number {
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * 코트 9장·체육관 바닥·통로를 한 기하로 맞춤.
 * CourtGrid / GymFloorMap / useLayoutMode 가 동일 값을 써야 어긋나지 않음.
 */
export function buildGymGridLayout(input: GymGridLayoutInput): GymGridLayout {
  const courtWidth = Math.max(1, Math.floor(finitePositive(input.courtWidth, 96)));
  const courtGap = Math.max(0, Math.round(finiteNonNeg(input.courtGap, 8)));
  const entranceGutter = Math.max(0, Math.round(finiteNonNeg(input.entranceGutter, 12)));
  const cardHPad = Math.max(0, Math.round(finiteNonNeg(input.cardHPad, 0)));
  const cardChromeTop = Math.max(0, Math.round(finiteNonNeg(input.cardChromeTop, 10)));
  const floorStageH = Math.max(1, Math.round(finitePositive(input.floorStageH, 18)));
  const floorHeaderH = Math.max(1, Math.round(finitePositive(input.floorHeaderH, 14)));
  const aisleH = Math.max(0, Math.round(finiteNonNeg(input.aisleH, 6)));

  const courtHeight = getCourtHeight(courtWidth);
  const slotWidth = courtWidth + cardHPad * 2;
  const cardChrome = cardChromeTop + GYM_CARD_CHROME_BOTTOM;
  const floorContentTop = floorStageH + floorHeaderH;
  const rows = GYM_COURT_ROWS.length;
  const cols = 3;
  const rowEntranceGap = GYM_ROW_ENTRANCE_GAP;
  const rowBlockHeight = courtHeight + cardChrome;
  const courtsRowWidth = slotWidth * cols + courtGap * (cols - 1);
  const intrinsicFloorWidth = entranceGutter + rowEntranceGap + courtsRowWidth;

  const panelW = input.panelWidth != null ? finitePositive(input.panelWidth, intrinsicFloorWidth) : intrinsicFloorWidth;
  const floorWidth = Math.max(intrinsicFloorWidth, Math.floor(panelW));
  const floorHeight =
    floorContentTop + rowBlockHeight * rows + aisleH * Math.max(0, rows - 1) + GYM_FLOOR_BOTTOM_PAD;

  const columnDividerXs = ([1, 2] as const).map(
    (i) => entranceGutter + rowEntranceGap + slotWidth * i + courtGap * (i - 1) + courtGap / 2
  );

  const aisleCenterYs = Array.from({ length: Math.max(0, rows - 1) }, (_, i) => {
    return floorContentTop + rowBlockHeight * (i + 1) + aisleH * i + aisleH / 2;
  });

  return {
    courtWidth,
    courtHeight,
    slotWidth,
    cardChrome,
    cardChromeTop,
    cardHPad,
    courtGap,
    entranceGutter,
    rowEntranceGap,
    floorStageH,
    floorHeaderH,
    floorContentTop,
    aisleH,
    rows,
    cols,
    rowBlockHeight,
    courtsRowWidth,
    intrinsicFloorWidth,
    floorWidth,
    floorHeight,
    columnDividerXs,
    aisleCenterYs,
  };
}

/** 세로 가용 높이에서 코트 폭 역산 (행 수·크롬·통로 반영) */
export function courtWidthFromAvailableHeight(params: {
  availableHeight: number;
  rows: number;
  floorContentTop: number;
  cardChrome: number;
  aisleH: number;
  extraOverhead: number;
}): number {
  const rows = Math.max(1, params.rows);
  const overhead =
    finiteNonNeg(params.floorContentTop) +
    finiteNonNeg(params.cardChrome) * rows +
    finiteNonNeg(params.aisleH) * (rows - 1) +
    finiteNonNeg(params.extraOverhead);
  const forRows = finitePositive(params.availableHeight, 0) - overhead;
  if (forRows <= 0) return 0;
  return (forRows / rows) * COURT_ASPECT;
}
