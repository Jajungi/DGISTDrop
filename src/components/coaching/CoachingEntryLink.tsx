import React from 'react';
import { Text, StyleSheet, Pressable, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '@/src/theme';
import { useAppTheme } from '@/src/theme/ThemeProvider';

interface CoachingEntryLinkProps {
  visible?: boolean;
}

/** 코트 현황 아래 — 코칭 화면 진입 링크 */
export function CoachingEntryLink({ visible = true }: CoachingEntryLinkProps) {
  const { colors: theme } = useAppTheme();
  if (!visible) return null;

  return (
    <Pressable
      onPress={() => router.push('/coaching')}
      style={[
        styles.wrap,
        { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
      ]}
      accessibilityRole="link"
      accessibilityLabel="코칭 레슨 공지 화면 열기"
    >
      <View style={styles.inner}>
        <Ionicons name="school-outline" size={16} color={theme.text} />
        <Text style={[styles.text, { color: theme.text }]}>코칭 · 레슨 · 공지</Text>
        <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.text,
    letterSpacing: 0.1,
  },
});
