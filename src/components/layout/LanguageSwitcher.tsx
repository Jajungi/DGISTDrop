import React from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '@/src/i18n/useI18n';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import type { AppLocale } from '@/src/i18n/types';

interface LanguageSwitcherProps {
  /** 좁은 헤더: 지구본만. 넓은 영역(PC 헤더·로그인·설정): ko|en 라벨 표시 */
  compact?: boolean;
}

function LangCode({
  code,
  active,
  color,
  muted,
}: {
  code: AppLocale;
  active: boolean;
  color: string;
  muted: string;
}) {
  return (
    <Text
      style={[
        styles.code,
        { color: active ? color : muted },
        active && styles.codeActive,
      ]}
    >
      {code}
    </Text>
  );
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n();
  const { colors: theme } = useAppTheme();

  const pick = (next: AppLocale) => {
    if (next !== locale) setLocale(next);
  };

  const toggle = () => pick(locale === 'ko' ? 'en' : 'ko');

  if (compact) {
    return (
      <Pressable
        onPress={toggle}
        style={[styles.root, styles.rootCompact]}
        accessibilityRole="button"
        accessibilityLabel={locale === 'ko' ? 'Switch to English' : '한국어로 전환'}
        hitSlop={8}
      >
        <Ionicons
          name="globe-outline"
          size={20}
          color={theme.text}
          style={styles.globe}
        />
      </Pressable>
    );
  }

  return (
    <View style={styles.root}>
      <Ionicons
        name="globe-outline"
        size={18}
        color={theme.text}
        style={styles.globe}
      />
      <View style={styles.codes}>
        <Pressable
          onPress={() => pick('ko')}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityState={{ selected: locale === 'ko' }}
        >
          <LangCode code="ko" active={locale === 'ko'} color={theme.text} muted={theme.textMuted} />
        </Pressable>
        <Text style={[styles.sep, { color: theme.textMuted }]}>|</Text>
        <Pressable
          onPress={() => pick('en')}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityState={{ selected: locale === 'en' }}
        >
          <LangCode code="en" active={locale === 'en'} color={theme.text} muted={theme.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  rootCompact: {
    gap: 0,
    padding: 4,
    justifyContent: 'center',
  },
  globe: {
    opacity: 0.92,
  },
  codes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  code: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    letterSpacing: 0.2,
    textTransform: 'lowercase',
  },
  codeActive: {
    fontFamily: 'DMSans_600SemiBold',
    fontWeight: '700',
  },
  sep: {
    fontSize: 12,
    opacity: 0.45,
    marginTop: -1,
  },
});
