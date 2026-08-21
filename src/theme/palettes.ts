/** Drop 라이트 / 다크 팔레트 — 웹은 CSS 변수로 연결 */

export type ColorSchemeName = 'light' | 'dark';

export type ThemePalette = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  accentLight: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;
  surfaceGlass: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textLight: string;
  textOnNeon: string;
  border: string;
  borderSubtle: string;
  borderStrong: string;
  divider: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  navHover: string;
  navActive: string;
  searchShadow: string;
  wave1: string;
  wave2: string;
  wave3: string;
  courtFloor: string;
  courtFloorLight: string;
  courtLine: string;
  courtEmpty: string;
  courtReserved: string;
  courtPlaying: string;
  courtFinished: string;
  centerCourt: string;
  chunkyShadow: string;
  overlay: string;
  tabBar: string;
  gymFloor: string;
  neon: string;
  gymFloorBase: string;
  gymFloorAisle: string;
  gymFloorStage: string;
  gymFloorEntrance: string;
  gymFloorDivider: string;
  gymFloorStripe: string;
  courtEmptyFloor: string;
  courtSelectedFloor: string;
  courtReservedFloor: string;
  courtPlayingFloor: string;
  courtFinishedFloor: string;
  courtEmptyFloorEdge: string;
  courtReservedFloorEdge: string;
  courtPlayingFloorEdge: string;
  courtFinishedFloorEdge: string;
  spotlightRgb: string;
};

export const lightPalette: ThemePalette = {
  primary: '#3A756C',
  primaryDark: '#2F5F57',
  primaryLight: '#E8F4F1',
  accent: '#4A8A80',
  accentLight: '#F0FAF8',
  background: '#F3F8F6',
  surface: '#FFFFFF',
  surfaceAlt: '#F6FAF8',
  surfaceElevated: '#FFFFFF',
  surfaceGlass: '#FFFFFF',
  text: '#2A3D45',
  textSecondary: '#5A6B72',
  textMuted: '#9AA5AA',
  textLight: '#FFFFFF',
  textOnNeon: '#FFFFFF',
  border: '#E6EBE9',
  borderSubtle: '#EEF2F0',
  borderStrong: '#D4DCD9',
  divider: '#E9EBF0',
  success: '#3A9E7A',
  warning: '#E8A04A',
  error: '#E05A68',
  info: '#3A756C',
  navHover: '#E8F4F1',
  navActive: '#2F5F57',
  searchShadow: 'rgba(136, 148, 171, 0.2)',
  wave1: '#D4E8E2',
  wave2: '#E4F0EC',
  wave3: '#F0F7F5',
  courtFloor: '#3D7560',
  courtFloorLight: '#4A9070',
  courtLine: 'rgba(255,255,255,0.9)',
  courtEmpty: '#C8F7DC',
  courtReserved: '#DCE8C0',
  courtPlaying: '#D5DEFF',
  courtFinished: '#E8EDF0',
  centerCourt: '#DCE8C0',
  chunkyShadow: 'rgba(42, 61, 69, 0.1)',
  overlay: 'rgba(42, 61, 69, 0.35)',
  tabBar: '#FFFFFF',
  gymFloor: 'transparent',
  neon: '#3A756C',
  gymFloorBase: '#D8CDB8',
  gymFloorAisle: '#CEC3AE',
  gymFloorStage: '#C4B89E',
  gymFloorEntrance: '#C8BAA8',
  gymFloorDivider: 'rgba(60, 50, 40, 0.12)',
  gymFloorStripe: 'rgba(0, 0, 0, 0.035)',
  courtEmptyFloor: '#3D7560',
  courtSelectedFloor: '#4A9070',
  courtReservedFloor: '#A8BE78',
  courtPlayingFloor: '#8BAEE0',
  courtFinishedFloor: '#A8BFC4',
  courtEmptyFloorEdge: '#2D5C4A',
  courtReservedFloorEdge: '#8FA862',
  courtPlayingFloorEdge: '#7498D4',
  courtFinishedFloorEdge: '#90A8AE',
  spotlightRgb: '58, 117, 108',
};

/** 다크: 차콜 60% + 세이지 포인트. 코트만 조금 더 녹색 */
export const darkPalette: ThemePalette = {
  primary: '#6B7F75',
  primaryDark: '#55685F',
  primaryLight: '#222628',
  accent: '#809489',
  accentLight: '#222628',
  background: '#0F1112',
  surface: '#1C2022',
  surfaceAlt: '#222628',
  surfaceElevated: '#16191B',
  surfaceGlass: '#16191B',
  text: '#E6E9E7',
  textSecondary: '#A1A8A3',
  textMuted: '#6F7773',
  textLight: '#E6E9E7',
  textOnNeon: '#0F1112',
  border: '#373D3F',
  borderSubtle: '#2A2F31',
  borderStrong: '#373D3F',
  divider: '#373D3F',
  success: '#6A8F78',
  warning: '#C4A06A',
  error: '#C47A7A',
  info: '#6B7F75',
  navHover: '#222628',
  navActive: '#55685F',
  searchShadow: 'rgba(0, 0, 0, 0.45)',
  wave1: '#141618',
  wave2: '#121416',
  wave3: '#0F1112',
  courtFloor: '#355E4F',
  courtFloorLight: '#416C5A',
  courtLine: 'rgba(255,255,255,0.22)',
  courtEmpty: '#222628',
  courtReserved: '#1E2220',
  courtPlaying: '#1E2224',
  courtFinished: '#181C1B',
  centerCourt: '#1E2220',
  chunkyShadow: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(15, 17, 18, 0.72)',
  tabBar: '#16191B',
  gymFloor: 'transparent',
  neon: '#6B7F75',
  gymFloorBase: '#141618',
  gymFloorAisle: '#121416',
  gymFloorStage: '#1A1D1F',
  gymFloorEntrance: '#16191B',
  gymFloorDivider: 'rgba(230, 233, 231, 0.06)',
  gymFloorStripe: 'rgba(255, 255, 255, 0.02)',
  courtEmptyFloor: '#355E4F',
  courtSelectedFloor: '#4E7E67',
  courtReservedFloor: '#3A5A4C',
  courtPlayingFloor: '#3A5558',
  courtFinishedFloor: '#2A4A3F',
  courtEmptyFloorEdge: '#2C4E42',
  courtReservedFloorEdge: '#2F4A3E',
  courtPlayingFloorEdge: '#2E4648',
  courtFinishedFloorEdge: '#1F3830',
  spotlightRgb: '107, 127, 117',
};

export const PALETTE_KEYS = Object.keys(lightPalette) as (keyof ThemePalette)[];

export function paletteToCssVars(p: ThemePalette): string {
  return PALETTE_KEYS.map((k) => `--drop-${k}: ${p[k]};`).join('\n  ');
}
