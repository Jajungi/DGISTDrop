import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useActivityStatus } from '@/src/hooks/useActivityStatus';
import { formatCountdownToNext, getActivityDayLabel } from '@/src/services/activityTime';
import { useActivityScheduleStore } from '@/src/stores/activityScheduleStore';
import { formatHHMM } from '@/src/utils/activitySchedule';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

/** 정기 활동 시간 외 안내 — 기능은 그대로, 이용 안내 페이지로 대체하지 않음 */
export function ActivityNoticeBanner() {
  const { isActive, nextActivity } = useActivityStatus();
  const schedule = useActivityScheduleStore((s) => s.schedule);
  const scheduleLabel = useMemo(() => {
    if (!schedule.length) return '활동 일정 미설정';
    const days = [...new Set(schedule.map((s) => getActivityDayLabel(s.day)))].join('·');
    const first = schedule[0];
    return `매주 ${days} ${formatHHMM(first.startHour, first.startMinute)}–${formatHHMM(first.endHour, first.endMinute)}`;
  }, [schedule]);

  if (isActive) return null;

  return (
    <Pressable
      style={styles.banner}
      onPress={() => router.push('/guide')}
      accessibilityRole="button"
      accessibilityLabel="이용 안내 보기"
    >
      <Ionicons name="time-outline" size={18} color={colors.primary} />
      <View style={styles.body}>
        <Text style={styles.title}>정기 활동 시간이 아니에요</Text>
        <Text style={styles.sub}>
          {nextActivity
            ? `다음 활동 ${formatCountdownToNext(nextActivity)} · ${scheduleLabel}`
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
