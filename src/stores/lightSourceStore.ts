import { create } from 'zustand';

interface LightSourceState {
  x: number;
  y: number;
  active: boolean;
  setLight: (x: number, y: number) => void;
  clearLight: () => void;
}

export const useLightSourceStore = create<LightSourceState>((set) => ({
  x: 0,
  y: 0,
  active: false,
  setLight: (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    set({ x, y, active: true });
  },
  clearLight: () => set({ active: false }),
}));

export function buildRealisticShadowCss(
  ox: number,
  oy: number,
  falloff: number,
  elevated = false
) {
  const safeOx = Number.isFinite(ox) ? ox : 0;
  const safeOy = Number.isFinite(oy) ? oy : 8;
  const safeFalloff = Number.isFinite(falloff) ? Math.max(0.05, Math.min(1, falloff)) : 0.2;
  const lift = elevated ? 1.2 : 1;
  const a = Math.min(1, 0.28 + safeFalloff * 0.55);
  const blur = 5 + (1 - Math.min(1, Math.hypot(safeOx, safeOy) / 28)) * 4;
  return [
    `${safeOx}px ${safeOy}px 0px rgba(8, 14, 12, ${0.38 * a})`,
    `${safeOx * 0.72}px ${safeOy + 2}px ${blur * lift}px rgba(8, 14, 12, ${0.22 * a})`,
    `${safeOx * 0.4}px ${safeOy + 7}px ${14 * lift}px rgba(8, 14, 12, ${0.12 * a})`,
  ].join(', ');
}
