import React from 'react';
import { Pressable, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/src/theme/ThemeProvider';

/** 누르면 라이트/다크가 바로 바뀜 (스위치 아님) */
export function ThemeToggleButton() {
  const { scheme, toggleScheme, colors: theme } = useAppTheme();
  const dark = scheme === 'dark';

  return (
    <Pressable
      onPress={toggleScheme}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel={dark ? '라이트 모드로 바꾸기' : '다크 모드로 바꾸기'}
      hitSlop={8}
    >
      <Ionicons
        name={dark ? 'sunny-outline' : 'moon-outline'}
        size={18}
        color={theme.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
});
