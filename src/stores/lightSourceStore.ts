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

/** 카드 바닥 그림자 — 접촉 + 확산 + 앰비언트 */
export function computeLightShadowOffset(
  lightX: number,
  lightY: number,
  cardX: number,
  cardY: number,
  cardW: number,
  cardH: number,
  intensity = 1
) {
  if (
    ![lightX, lightY, cardX, cardY, cardW, cardH, intensity].every((n) => Number.isFinite(n)) ||
    cardW < 2 ||
    cardH < 2
  ) {
    return { x: 0, y: 8, falloff: 0.2 };
  }

  const cx = cardX + cardW / 2;
  const cy = cardY + cardH / 2;
  const dx = cx - lightX;
  const dy = cy - lightY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const falloff = 1 / (1 + Math.pow(distance / 400, 2.2));
  const k = 0.032 * Math.max(0.1, intensity) * falloff;

  const baseX = 0;
  const baseY = 8;

  const x = baseX + dx * k * 0.58;
  const y = baseY + Math.max(2, dy * k * 0.12 + 6);

  return {
    x: Math.max(-28, Math.min(28, x)),
    y: Math.max(2, Math.min(36, y)),
    falloff: Math.max(0.05, Math.min(1, falloff)),
  };
}

export function buildRealisticShadowCss(
  ox: number,
  oy: number,
  falloff: number,
  elevated = false
) {
  const safeOx = Number.isFinite(ox) ? ox : 0;
  const safeOy = Number.isFinite(oy) ? oy : 8;
  const safeFalloff = Number.isFinite(falloff) ? Math.max(0.05, Math.min(1, falloff)) : 0.2;
  const lift = elevated ? 1.15 : 1;
  const a = Math.min(1, 0.35 + safeFalloff * 0.45);
  return [
    `${safeOx}px ${safeOy}px 1px rgba(15, 28, 24, ${0.22 * a})`,
    `${safeOx * 0.6 + 1}px ${safeOy + 4}px ${6 * lift}px rgba(15, 28, 24, ${0.14 * a})`,
    `${safeOx * 0.35}px ${safeOy + 10}px ${18 * lift}px rgba(15, 28, 24, ${0.1 * a})`,
    `0px ${safeOy + 14}px ${32 * lift}px rgba(15, 28, 24, ${0.06 * a})`,
  ].join(', ');
}
