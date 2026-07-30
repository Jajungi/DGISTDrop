import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, type LayoutChangeEvent, type ViewStyle, View } from 'react-native';
import { colors } from '@/src/theme';
import {
  buildRealisticShadowCss,
  computeLightShadowOffset,
  useLightSourceStore,
} from '@/src/stores/lightSourceStore';

const DEFAULT = { x: 0, y: 8, falloff: 0.2 };

function isValidLayout(width: number, height: number, x?: number, y?: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 2 || height < 2) return false;
  if (x != null && !Number.isFinite(x)) return false;
  if (y != null && !Number.isFinite(y)) return false;
  return true;
}

export function useGlobalLightShadow(intensity = 1, elevated = false) {
  const ref = useRef<View>(null);
  const [layout, setLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [shadow, setShadow] = useState(DEFAULT);
  const measureGen = useRef(0);
  const lightX = useLightSourceStore((s) => s.x);
  const lightY = useLightSourceStore((s) => s.y);
  const lightActive = useLightSourceStore((s) => s.active);

  const measureCard = useCallback(() => {
    const gen = ++measureGen.current;
    const node = ref.current;
    if (!node) return;
    try {
      node.measureInWindow((x, y, width, height) => {
        if (gen !== measureGen.current) return;
        if (!isValidLayout(width, height, x, y)) return;
        setLayout({ x, y, width, height });
      });
    } catch {
      // measureInWindow can throw during unmount / detach
    }
  }, []);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      if (!isValidLayout(width, height)) return;
      setLayout((prev) => ({ ...prev, width, height }));
      requestAnimationFrame(() => {
        requestAnimationFrame(measureCard);
      });
    },
    [measureCard]
  );

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setShadow(DEFAULT);
      return;
    }
    if (!isValidLayout(layout.width, layout.height, layout.x, layout.y)) {
      setShadow(DEFAULT);
      return;
    }

    const next = lightActive
      ? computeLightShadowOffset(
          lightX,
          lightY,
          layout.x,
          layout.y,
          layout.width,
          layout.height,
          intensity
        )
      : { ...DEFAULT, falloff: 0.25 };

    if (!Number.isFinite(next.x) || !Number.isFinite(next.y) || !Number.isFinite(next.falloff)) {
      setShadow(DEFAULT);
      return;
    }

    setShadow(next);
  }, [intensity, layout, lightActive, lightX, lightY]);

  // 리사이즈·스크롤 후 위치가 어긋나지 않도록 주기적으로 재측정 (웹만)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onResize = () => measureCard();
    const onScroll = () => measureCard();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [measureCard]);

  const shadowStyle: ViewStyle =
    Platform.OS === 'web'
      ? ({
          boxShadow: buildRealisticShadowCss(shadow.x, shadow.y, shadow.falloff, elevated),
          transition: 'box-shadow 0.12s ease-out',
        } as ViewStyle)
      : {
          shadowColor: colors.chunkyShadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.28,
          shadowRadius: 12,
          elevation: 6,
        };

  return { ref, onLayout, shadowStyle, layout, remeasure: measureCard };
}
