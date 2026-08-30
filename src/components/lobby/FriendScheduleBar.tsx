import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { User } from '@/src/types';
import { Avatar } from '@/src/components/ui/Avatar';
import { getEffectiveSchedule } from '@/src/utils/dateFormat';
import { useI18n } from '@/src/i18n/useI18n';
import { colors, borderRadius, spacing, typography, shadows } from '@/src/theme';

interface FriendScheduleBarProps {
  friends: User[];
  activityStart: string;
  activityEnd: string;
}

function timeToPercent(time: string, start: string, end: string): { left: number; width: number } {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const startMin = toMin(start);
  const endMin = toMin(end);
  const total = endMin - startMin;
  const userStart = toMin(time);
  const left = ((userStart - startMin) / total) * 100;
  const defaultWidth = 28;
  return { left: Math.max(0, Math.min(left, 100 - defaultWidth)), width: defaultWidth };
}

export function FriendScheduleBar({ friends, activityStart, activityEnd }: FriendScheduleBarProps) {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('lobby.friendSchedule')}</Text>
      <View style={styles.card}>
        <View style={styles.timeLabels}>
          <Text style={styles.timeLabel}>{activityStart}</Text>
          <Text style={styles.timeLabel}>{activityEnd}</Text>
        </View>
        {friends.map((friend) => {
          const sched = getEffectiveSchedule(friend);
          const schedule = sched.start
            ? timeToPercent(sched.start, activityStart, activityEnd)
            : { left: 0, width: 0 };
          return (
            <View key={friend.id} style={styles.friendRow}>
              <View style={styles.friendInfo}>
                <Avatar
                  name={friend.name}
                  color={friend.avatarColor}
                  size={28}
                  showOnline={friend.isAtGym}
                  imageUri={friend.avatarUri}
                />
                <Text style={styles.friendName}>{friend.name}</Text>
              </View>
              <View style={styles.barTrack}>
                {sched.start && (
                  <View
                    style={[
                      styles.bar,
                      {
                        left: `${schedule.left}%`,
                        width: `${schedule.width}%`,
                        backgroundColor: friend.isAtGym ? colors.primary : colors.borderStrong,
                      },
                    ]}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, marginBottom: spacing.sm },
  title: { ...typography.label, color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  timeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  timeLabel: { ...typography.small, color: colors.textMuted },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  friendInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, width: 96 },
  friendName: { ...typography.caption, color: colors.text },
  barTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.divider,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  bar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
});
