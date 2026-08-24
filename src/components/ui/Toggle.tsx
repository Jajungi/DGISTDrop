import React from 'react';
import { Pressable, View, StyleSheet, Platform } from 'react-native';
import { colors } from '@/src/theme';

interface ToggleProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  size?: 'sm' | 'md';
}

/** 웹 CSS 변수도 켜짐/꺼짐이 보이게 그리는 스위치 (RN Switch는 trackColor에 var()를 못 씀) */
export function Toggle({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  size = 'md',
}: ToggleProps) {
  const compact = size === 'sm';
  return (
    <Pressable
      onPress={() => {
        if (!disabled) onValueChange(!value);
      }}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [
        compact ? styles.trackSm : styles.track,
        value ? styles.trackOn : styles.trackOff,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        Platform.OS === 'web' && !disabled && ({ cursor: 'pointer' } as const),
      ]}
    >
      <View style={[compact ? styles.knobSm : styles.knob, value && styles.knobOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
    flexShrink: 0,
  },
  trackSm: {
    width: 42,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
    flexShrink: 0,
  },
  trackOff: {
    backgroundColor: colors.border,
  },
  trackOn: {
    backgroundColor: colors.primary,
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
  },
  knobSm: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  knobOn: {
    alignSelf: 'flex-end',
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.88 },
});
