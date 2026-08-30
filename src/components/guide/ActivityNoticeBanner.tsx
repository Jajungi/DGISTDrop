import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useActivityStatus } from '@/src/hooks/useActivityStatus';
import { useActivityScheduleLabel } from '@/src/hooks/useGuideSections';
import { useActivityScheduleStore } from '@/src/stores/activityScheduleStore';
import { useSeoulTodayKey } from '@/src/hooks/useSeoulTodayKey';
import { useI18n } from '@/src/i18n/useI18n';
import { formatCountdownLocalized } from '@/src/i18n/activityLabels';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

/** 정기 활동 시간 외 안내 — 기능은 그대로, 이용 안내 페이지로 대체하지 않음 */
export function ActivityNoticeBanner() {
  const { isActive, nextActivity } = useActivityStatus();
  const scheduleLabel = useActivityScheduleLabel();
  const todayKey = useSeoulTodayKey();
  const cancelledToday = useActivityScheduleStore((s) => s.cancelledDate === todayKey);
  const { t, locale } = useI18n();

  if (isActive && !cancelledToday) return null;

  const countdown = nextActivity ? formatCountdownLocalized(nextActivity, locale) : '';

  return (
    <Pressable
      style={styles.banner}
      onPress={() => router.push('/guide')}
      accessibilityRole="button"
      accessibilityLabel={t('guide.bannerViewGuide')}
    >
      <Ionicons name="time-outline" size={18} color={colors.primary} />
      <View style={styles.body}>
        <Text style={styles.title}>
          {cancelledToday ? t('guide.bannerCancelled') : t('guide.bannerInactive')}
        </Text>
        <Text style={styles.sub}>
          {nextActivity
            ? t('guide.bannerNextActivity', { countdown, schedule: scheduleLabel })
            : scheduleLabel}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  body: { flex: 1, gap: 2 },
  title: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  sub: { ...typography.small, color: colors.textSecondary, fontSize: 11, lineHeight: 16 },
});
