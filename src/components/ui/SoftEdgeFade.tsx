import React from 'react';
import { View, StyleSheet, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/src/theme/ThemeProvider';

interface SoftEdgeFadeProps {
  children: React.ReactNode;
  /** 가장자리가 섞일 배경색 */
  fadeColor?: string;
  /** 가장자리 페이드 두께 (px) */
  size?: number;
  /** 좌우 페이드 제거 (가로 스크롤 시 가장자리 코트가 흐려지지 않도록) */
  disableSideFade?: boolean;
  style?: StyleProp<ViewStyle>;
}

function toRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** 콘텐츠 외곽을 배경색으로 은은히 페이드 — 날카로운 잘림·모서리 완화 */
export function SoftEdgeFade({
  children,
  fadeColor,
  size = 26,
  disableSideFade = false,
  style,
}: SoftEdgeFadeProps) {
  const { colors: theme } = useAppTheme();
  const resolved = fadeColor && fadeColor.startsWith('#') ? fadeColor : theme.surface;
  const solid = toRgba(resolved, 0.92);
  const soft = toRgba(resolved, 0.45);
  const clear = toRgba(resolved, 0);

  const mask = disableSideFade
    ? 'linear-gradient(to bottom, transparent 0%, #000 6%, #000 94%, transparent 100%)'
    : 'radial-gradient(ellipse 96% 94% at 50% 50%, #000 58%, rgba(0,0,0,0.55) 78%, transparent 100%)';
  const webVignette = Platform.select({
    web: {
      maskImage: mask,
      WebkitMaskImage: mask,
    } as object,
    default: {},
  });

  return (
    <View style={[styles.wrap, webVignette, style]}>
      {children}

      {Platform.OS !== 'web' && (
        <>
          <LinearGradient
            colors={[solid, soft, clear]}
            locations={[0, 0.55, 1]}
            style={[styles.edge, styles.top, { height: size, pointerEvents: 'none' }]}
          />
          <LinearGradient
            colors={[clear, soft, solid]}
            locations={[0, 0.45, 1]}
            style={[styles.edge, styles.bottom, { height: size, pointerEvents: 'none' }]}
          />
          {!disableSideFade && (
            <>
              <LinearGradient
                colors={[solid, soft, clear]}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[styles.edge, styles.left, { width: size, pointerEvents: 'none' }]}
              />
              <LinearGradient
                colors={[clear, soft, solid]}
                locations={[0, 0.45, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[styles.edge, styles.right, { width: size, pointerEvents: 'none' }]}
              />
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    overflow: 'visible',
  },
  edge: {
    position: 'absolute',
    zIndex: 10,
  },
  top: { top: 0, left: 0, right: 0 },
  bottom: { bottom: 0, left: 0, right: 0 },
  left: { top: 0, bottom: 0, left: 0 },
  right: { top: 0, bottom: 0, right: 0 },
});
