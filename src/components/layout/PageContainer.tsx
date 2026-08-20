import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { colors, borderRadius, spacing } from '@/src/theme';

interface PageContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 패널 패딩 없이 꽉 채울 때 (코트 화면 등) */
  flush?: boolean;
}

/** Portfolio 스타일 흰색 라운드 패널 */
export function PageContainer({ children, style, flush }: PageContainerProps) {
  const { isDesktop, scaledSpacing, scaledBorderRadius } = useLayoutMode();
  const panelRadius = scaledBorderRadius.panel;

  return (
    <View
      style={[
        styles.outer,
        isDesktop ? styles.outerDesktop : [styles.outerMobile, { paddingHorizontal: scaledSpacing.xs }],
        flush && !isDesktop && [styles.outerMobileFlush, { paddingHorizontal: scaledSpacing.xs }],
        style,
      ]}
    >
      <View
        style={[
          styles.panel,
          { borderRadius: panelRadius },
          flush &&
            (isDesktop
              ? styles.panelFlush
              : [
                  styles.panelFlushMobile,
                  {
                    paddingTop: scaledSpacing.sm,
                    paddingHorizontal: scaledSpacing.sm,
                    paddingBottom: scaledSpacing.xs,
                  },
                ]),
          !flush &&
            !isDesktop && {
              paddingTop: scaledSpacing.lg,
              paddingHorizontal: scaledSpacing.lg,
              paddingBottom: scaledSpacing.sm,
            },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
  outerDesktop: {
    paddingBottom: 0,
  },
  outerMobile: {
    paddingHorizontal: spacing.xs,
    paddingBottom: 0,
  },
  outerMobileFlush: {
    paddingHorizontal: spacing.xs,
  },
  panel: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.panel,
    overflow: 'hidden',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  panelFlush: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  panelFlushMobile: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
});
