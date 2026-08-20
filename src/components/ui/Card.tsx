import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, shadows } from '@/src/theme';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({ children, style, padding = 'md' }: CardProps) {
  const { scaledBorderRadius } = useLayoutMode();
  return (
    <View
      style={[
        styles.card,
        { borderRadius: scaledBorderRadius.xl },
        styles[`padding_${padding}`],
        shadows.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 0,
  },
  padding_sm: { padding: spacing.sm },
  padding_md: { padding: spacing.md },
  padding_lg: { padding: spacing.lg },
});
