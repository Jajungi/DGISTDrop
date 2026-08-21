import React, { useEffect, useRef } from 'react';
import { View, Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useGlobalLightShadow, usePointerDesktop } from '@/src/hooks/useGlobalLightShadow';

/**
 * MagicBento border-glow: 마우스 위치의 radial을 테두리 링에만 마스크.
 * tilt / magnetism / particles / 전역 800px 스포트라이트는 넣지 않음.
 */

const STYLE_ID = 'drop-gym-lighting';
const GYM_CLASS = 'gym-light-source';
const CARD_CLASS = 'court-lit-card';
const GLOW_CLASS = 'court-border-glow';
const SHADOW_CLASS = 'court-shadow-host';
const SPOTLIGHT_RADIUS = 300;

const litCards = new Set<HTMLElement>();

const LIGHTING_CSS = `
.${GYM_CLASS} {
  position: relative;
}
.${SHADOW_CLASS} {
  box-shadow:
    0 4px 8px rgba(12, 14, 13, 0.14),
    0 10px 18px rgba(12, 14, 13, 0.08);
  transition: box-shadow 180ms ease;
}
.${SHADOW_CLASS}:hover {
  box-shadow:
    0 8px 14px rgba(12, 14, 13, 0.18),
    0 16px 28px rgba(12, 14, 13, 0.12);
}
.${CARD_CLASS} {
  --glow-x: 50%;
  --glow-y: 50%;
  --glow-intensity: 0;
  --glow-radius: ${SPOTLIGHT_RADIUS}px;
  position: relative;
  overflow: hidden;
}
.${GLOW_CLASS} {
  content: '';
  position: absolute;
  inset: 0;
  padding: 2px;
  box-sizing: border-box;
  pointer-events: none;
  z-index: 8;
  border-radius: inherit;
  background: radial-gradient(
    var(--glow-radius) circle at var(--glow-x) var(--glow-y),
    rgba(255, 252, 245, calc(var(--glow-intensity) * 1)) 0%,
    rgba(var(--drop-spotlightRgb), calc(var(--glow-intensity) * 1)) 18%,
    rgba(var(--drop-spotlightRgb), calc(var(--glow-intensity) * 0.7)) 36%,
    transparent 62%
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
}
`;

function ensureLightingCss() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = LIGHTING_CSS;
}

function asEl(node: unknown): HTMLElement | null {
  if (!node || typeof node !== 'object') return null;
  const n = node as HTMLElement & { _nativeNode?: HTMLElement };
  if (typeof n.getBoundingClientRect === 'function' && n.nodeType === 1) return n;
  if (n._nativeNode && n._nativeNode.nodeType === 1) return n._nativeNode;
  return null;
}

function ensureGlowLayer(card: HTMLElement) {
  let glow = card.querySelector(`.${GLOW_CLASS}`) as HTMLElement | null;
  if (!glow) {
    glow = document.createElement('div');
    glow.className = GLOW_CLASS;
    glow.setAttribute('aria-hidden', 'true');
    card.appendChild(glow);
  }
}

function registerCard(node: unknown) {
  const el = asEl(node);
  if (!el) return () => undefined;
  el.classList.add(CARD_CLASS);
  el.setAttribute('data-court-card', '1');
  ensureGlowLayer(el);
  litCards.add(el);
  return () => {
    litCards.delete(el);
    el.querySelector(`.${GLOW_CLASS}`)?.remove();
    el.removeAttribute('data-court-card');
  };
}

function eachLitCard(gym: HTMLElement, fn: (card: HTMLElement) => void) {
  let painted = false;
  litCards.forEach((card) => {
    if (!gym.contains(card)) return;
    painted = true;
    fn(card);
  });
  if (painted) return;
  gym.querySelectorAll('[data-court-card], .court-lit-card').forEach((node) => {
    fn(node as HTMLElement);
  });
}

function spotlightValues(radius: number) {
  return { proximity: radius * 0.5, fadeDistance: radius * 0.75 };
}

function updateCardGlow(
  card: HTMLElement,
  mouseX: number,
  mouseY: number,
  glow: number,
  radius: number
) {
  ensureGlowLayer(card);
  const rect = card.getBoundingClientRect();
  const relativeX = rect.width > 0 ? ((mouseX - rect.left) / rect.width) * 100 : 50;
  const relativeY = rect.height > 0 ? ((mouseY - rect.top) / rect.height) * 100 : 50;
  card.style.setProperty('--glow-x', `${relativeX}%`);
  card.style.setProperty('--glow-y', `${relativeY}%`);
  card.style.setProperty('--glow-intensity', String(glow));
  card.style.setProperty('--glow-radius', `${radius}px`);
}

function paintGymGlow(gym: HTMLElement, mouseX: number, mouseY: number, inside: boolean) {
  const { proximity, fadeDistance } = spotlightValues(SPOTLIGHT_RADIUS);
  eachLitCard(gym, (card) => {
    const rect = card.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) {
      updateCardGlow(card, mouseX, mouseY, 0, SPOTLIGHT_RADIUS);
      return;
    }
    if (!inside) {
      updateCardGlow(card, mouseX, mouseY, 0, SPOTLIGHT_RADIUS);
      return;
    }
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance =
      Math.hypot(mouseX - centerX, mouseY - centerY) - Math.max(rect.width, rect.height) / 2;
    const effectiveDistance = Math.max(0, distance);
    let glowIntensity = 0;
    if (effectiveDistance <= proximity) glowIntensity = 1;
    else if (effectiveDistance <= fadeDistance) {
      glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
    }
    updateCardGlow(card, mouseX, mouseY, glowIntensity, SPOTLIGHT_RADIUS);
  });
}

interface LightShadowViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  elevated?: boolean;
  enableGlow?: boolean;
  borderRadius?: number;
}

export function LightShadowView({
  children,
  style,
  intensity = 1,
  elevated = false,
  borderRadius = 2,
}: LightShadowViewProps) {
  const { ref, onLayout, shadowStyle, pointerDesktop } = useGlobalLightShadow(intensity, elevated);
  const clipRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !pointerDesktop) return;
    ensureLightingCss();
    asEl(ref.current)?.classList.add(SHADOW_CLASS);
    return registerCard(clipRef.current);
  }, [pointerDesktop, ref]);

  if (!pointerDesktop) {
    return (
      <View
        ref={ref}
        onLayout={onLayout}
        style={[shadowStyle, styles.cardRoot, { borderRadius }, style]}
      >
        {children}
      </View>
    );
  }

  return (
    <View
      ref={ref}
      onLayout={onLayout}
      // @ts-expect-error RN web className
      className={SHADOW_CLASS}
      style={[styles.cardRoot, { borderRadius }, style]}
    >
      <View
        ref={clipRef}
        // @ts-expect-error RN web className
        className={CARD_CLASS}
        // @ts-expect-error RN web dataSet
        dataSet={{ courtCard: '1' }}
        style={[styles.cardClip, { borderRadius }]}
      >
        {children}
      </View>
    </View>
  );
}

export function LightShadowCapture({ children }: { children: React.ReactNode }) {
  const pointerDesktop = usePointerDesktop();
  const wrapRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !pointerDesktop) return;
    ensureLightingCss();
    const gym = asEl(wrapRef.current);
    if (!gym) return;
    gym.classList.add(GYM_CLASS);

    let raf = 0;

    const onMove = (e: MouseEvent) => {
      const rect = gym.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (raf) cancelAnimationFrame(raf);
      const { clientX, clientY } = e;
      raf = requestAnimationFrame(() => {
        raf = 0;
        paintGymGlow(gym, clientX, clientY, inside);
      });
    };

    const onLeave = () => {
      paintGymGlow(gym, 0, 0, false);
    };

    document.addEventListener('mousemove', onMove);
    gym.addEventListener('mouseleave', onLeave);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener('mousemove', onMove);
      gym.removeEventListener('mouseleave', onLeave);
      onLeave();
    };
  }, [pointerDesktop]);

  if (Platform.OS !== 'web' || !pointerDesktop) {
    return <View>{children}</View>;
  }

  return (
    <View
      ref={wrapRef}
      collapsable={false}
      // @ts-expect-error RN web className
      className={GYM_CLASS}
      style={styles.capture}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cardRoot: {
    position: 'relative',
    overflow: 'visible',
  },
  cardClip: {
    overflow: 'hidden',
    position: 'relative',
  },
  capture: {
    position: 'relative',
  },
});
