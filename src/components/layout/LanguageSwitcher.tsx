import React from 'react';
import { Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '@/src/i18n/useI18n';
import { useAppTheme } from '@/src/theme/ThemeProvider';

interface LanguageSwitcherProps {
  /** 좁은 헤더 등에서 아이콘 크기 축소 */
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n();
  const { colors: theme } = useAppTheme();

  const toggle = () => {
    setLocale(locale === 'ko' ? 'en' : 'ko');
  };

  return (
    <Pressable
      onPress={toggle}
      style={[styles.root, compact && styles.rootCompact]}
      accessibilityRole="button"
      accessibilityLabel={locale === 'ko' ? 'Switch to English' : '한국어로 전환'}
      hitSlop={8}
    >
      <Ionicons
        name="globe-outline"
        size={compact ? 20 : 22}
        color={theme.text}
        style={styles.globe}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  rootCompact: {
    padding: 4,
  },
  globe: {
    opacity: 0.92,
  },
});
