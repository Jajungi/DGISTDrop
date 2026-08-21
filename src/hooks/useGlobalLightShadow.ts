import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, type LayoutChangeEvent, type ViewStyle, View } from 'react-native';
import { colors } from '@/src/theme';
import { buildRealisticShadowCss } from '@/src/stores/lightSourceStore';

const DEFAULT = { x: 0, y: 8, falloff: 0.2 };

function isValidLayout(width: number, height: number, x?: number, y?: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 2 || height < 2) return false;
  if (x != null && !Number.isFinite(x)) return false;
  if (y != null && !Number.isFinite(y)) return false;
  return true;
}

function readPointerDesktop(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return (
    window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth >= 768
  );
}

/** 마우스 있는 데스크톱 웹만 — 모바일은 기존 정적 그림자 */
export function usePointerDesktop(): boolean {
  const [ok, setOk] = useState(readPointerDesktop);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setOk(mq.matches && window.innerWidth >= 768);
    update();
    mq.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return ok;
}

export function useGlobalLightShadow(intensity = 1, elevated = false) {
  const ref = useRef<View>(null);
  const pointerDesktop = usePointerDesktop();
  const measureGen = useRef(0);

  const measureCard = useCallback(() => {
    const gen = ++measureGen.current;
    const node = ref.current;
    if (!node) return;
    try {
      node.measureInWindow((x, y, width, height) => {
        if (gen !== measureGen.current) return;
        if (!isValidLayout(width, height, x, y)) return;
      });
    } catch {
      // ignore
    }
  }, []);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      if (!isValidLayout(width, height)) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(measureCard);
      });
    },
    [measureCard]
  );

  const useMouseShadow = Platform.OS === 'web' && pointerDesktop;

  // Desktop: luminosity-css / Ambient CSS handles shadow via CSS vars (no React mouse loop).
  const shadowStyle: ViewStyle = useMouseShadow
    ? ({ boxShadow: 'none' } as ViewStyle)
    : Platform.OS === 'web'
      ? ({
          boxShadow: buildRealisticShadowCss(0, 8, 0.25, elevated),
        } as ViewStyle)
      : {
          shadowColor: colors.chunkyShadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.28,
          shadowRadius: 12,
          elevation: 6,
        };

  return {
    ref,
    onLayout,
    shadowStyle,
    pointerDesktop: useMouseShadow,
    remeasure: measureCard,
    intensity,
  };
}
