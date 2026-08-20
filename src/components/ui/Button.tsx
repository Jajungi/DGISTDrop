import React from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
  Pressable,
  Platform,
} from 'react-native';
import { colors, typography, shadows } from '@/src/theme';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';

type Variant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const FACE: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.navActive },
  secondary: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.borderStrong },
  danger: { backgroundColor: colors.error },
  ghost: { backgroundColor: 'transparent' },
};

const TEXT: Record<Variant, TextStyle> = {
  primary: { color: colors.textLight },
  secondary: { color: colors.text },
  outline: { color: colors.text },
  danger: { color: colors.textLight },
  ghost: { color: colors.textSecondary },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const { scaledBorderRadius } = useLayoutMode();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.face,
        { borderRadius: scaledBorderRadius.squish },
        FACE[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        variant === 'primary' && shadows.sm,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
        Platform.OS === 'web' && !isDisabled && ({ cursor: 'pointer' } as object),
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? colors.textLight : colors.primary}
        />
      ) : (
        <View style={styles.inner}>
          {icon}
          <Text style={[styles.text, TEXT[variant], textStyle]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  fullWidth: { width: '100%', alignSelf: 'stretch' },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.88 },
  size_sm: { paddingVertical: 8, paddingHorizontal: 16 },
  size_md: { paddingVertical: 12, paddingHorizontal: 20 },
  size_lg: { paddingVertical: 14, paddingHorizontal: 24 },
  text: { ...typography.button },
});
