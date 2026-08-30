import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import type { User } from '@/src/types';
import { Avatar } from '@/src/components/ui/Avatar';
import { useAuthStore } from '@/src/stores/authStore';
import { getEffectiveSchedule } from '@/src/utils/dateFormat';
import {
  buildTimeSlots,
  overlapMinutes,
  scheduleCoversTime,
} from '@/src/utils/playPartners';
import { useI18n } from '@/src/i18n/useI18n';
import { colors, borderRadius, spacing, typography, shadows } from '@/src/theme';

interface FriendSchedulePanelProps {
  friends: User[];
  activityStart: string;
  activityEnd: string;
}

function timeToPercent(
  start: string,
  end: string | undefined,
  activityStart: string,
  activityEnd: string
): { left: number; width: number } {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const startMin = toMin(activityStart);
  const endMin = toMin(activityEnd);
  const total = endMin - startMin || 1;
  const userStart = toMin(start);
  const userEnd = end ? toMin(end) : userStart + 90;
  const left = ((userStart - startMin) / total) * 100;
  const width = Math.max(8, ((userEnd - userStart) / total) * 100);
  return {
    left: Math.max(0, Math.min(left, 100 - 4)),
    width: Math.min(width, 100 - left),
  };
}

export function FriendSchedulePanel({
  friends,
  activityStart,
  activityEnd,
}: FriendSchedulePanelProps) {
  const { t } = useI18n();
  const currentUser = useAuthStore((s) => s.currentUser);
  const mySched = currentUser ? getEffectiveSchedule(currentUser) : {};
  const slots = useMemo(
    () => buildTimeSlots(activityStart, activityEnd),
    [activityStart, activityEnd]
  );
  const [slot, setSlot] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const list = [...friends];
    list.sort((a, b) => {
      const aSched = getEffectiveSchedule(a);
      const bSched = getEffectiveSchedule(b);
      const aOver = overlapMinutes(mySched, aSched);
      const bOver = overlapMinutes(mySched, bSched);
      if (mySched.start && (aOver !== bOver)) return bOver - aOver;
      const aStart = aSched.start;
      const bStart = bSched.start;
      if (!aStart) return 1;
      if (!bStart) return -1;
      return aStart.localeCompare(bStart);
    });
    return list;
  }, [friends, mySched.start, mySched.end]);

  const atSlot = useMemo(() => {
    if (!slot) return [];
    return friends.filter((f) => scheduleCoversTime(getEffectiveSchedule(f), slot));
  }, [friends, slot]);

  const overlapWithMe = useMemo(() => {
    if (!mySched.start) return [];
    return friends
      .map((f) => ({ friend: f, mins: overlapMinutes(mySched, getEffectiveSchedule(f)) }))
      .filter((x) => x.mins > 0)
      .sort((a, b) => b.mins - a.mins);
  }, [friends, mySched.start, mySched.end]);

  if (sorted.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.empty}>{t('friends.scheduleEmpty')}</Text>
      </View>
    );
  }

  const myBar =
    mySched.start != null
      ? timeToPercent(mySched.start, mySched.end, activityStart, activityEnd)
      : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.slotCard}>
        <Text style={styles.slotTitle}>{t('friends.slotTitle')}</Text>
        <Text style={styles.slotHint}>{t('friends.slotHint')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotRow}>
          <Pressable
            onPress={() => setSlot(null)}
            style={[styles.slotChip, slot === null && styles.slotChipOn]}
          >
            <Text style={[styles.slotChipText, slot === null && styles.slotChipTextOn]}>{t('common.all')}</Text>
          </Pressable>
          {slots.map((t) => {
            const on = slot === t;
            const count = friends.filter((f) =>
              scheduleCoversTime(getEffectiveSchedule(f), t)
            ).length;
            return (
              <Pressable
                key={t}
                onPress={() => setSlot(on ? null : t)}
                style={[styles.slotChip, on && styles.slotChipOn]}
              >
                <Text style={[styles.slotChipText, on && styles.slotChipTextOn]}>
                  {t}
                  {count > 0 ? ` · ${count}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {slot && (
          <View style={styles.slotResult}>
            {atSlot.length === 0 ? (
              <Text style={styles.slotEmpty}>{t('friends.slotEmpty', { slot })}</Text>
            ) : (
              atSlot.map((f) => (
                <View key={f.id} style={styles.slotPerson}>
                  <Avatar name={f.name} color={f.avatarColor} size={28} showOnline={f.isAtGym} imageUri={f.avatarUri} />
                  <Text style={styles.slotPersonName}>{f.name}</Text>
                  <Text style={styles.slotPersonTime}>
                    {getEffectiveSchedule(f).start}
                    {getEffectiveSchedule(f).end ? `–${getEffectiveSchedule(f).end}` : ''}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
        {!slot && mySched.start && overlapWithMe.length > 0 && (
          <View style={styles.slotResult}>
            <Text style={styles.overlapLabel}>{t('friends.overlapLabel')}</Text>
            {overlapWithMe.slice(0, 8).map(({ friend, mins }) => (
              <View key={friend.id} style={styles.slotPerson}>
                <Avatar
                  name={friend.name}
                  color={friend.avatarColor}
                  size={28}
                  showOnline={friend.isAtGym}
                  imageUri={friend.avatarUri}
                />
                <Text style={styles.slotPersonName}>{friend.name}</Text>
                <Text style={styles.overlapMins}>{t('friends.overlapMins', { mins })}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.timeLabels}>
          <Text style={styles.timeLabel}>{activityStart}</Text>
          <Text style={styles.timeLabel}>{activityEnd}</Text>
        </View>

        {myBar && currentUser && (
          <View style={styles.friendRow}>
            <View style={styles.friendInfo}>
              <Avatar
                name={currentUser.name}
                color={currentUser.avatarColor}
                size={32}
                showOnline={currentUser.isAtGym}
                imageUri={currentUser.avatarUri}
              />
              <View style={styles.nameCol}>
                <Text style={[styles.friendName, styles.meLabel]}>{t('common.me')}</Text>
                <Text style={styles.arrivalTime}>{mySched.start}</Text>
              </View>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  styles.myBar,
                  { left: `${myBar.left}%`, width: `${myBar.width}%` },
                ]}
              />
            </View>
          </View>
        )}

        {sorted.map((friend) => {
          const sched = getEffectiveSchedule(friend);
          const schedule = sched.start
            ? timeToPercent(sched.start, sched.end, activityStart, activityEnd)
            : null;
          const over = overlapMinutes(mySched, sched);
          const highlight = over > 0;
          const dimmed = slot != null && !scheduleCoversTime(sched, slot);

          return (
            <View
              key={friend.id}
              style={[styles.friendRow, dimmed && styles.friendRowDim, highlight && styles.friendRowHi]}
            >
              <View style={styles.friendInfo}>
                <Avatar
                  name={friend.name}
                  color={friend.avatarColor}
                  size={32}
                  showOnline={friend.isAtGym}
                  imageUri={friend.avatarUri}
                />
                <View style={styles.nameCol}>
                  <Text style={styles.friendName}>{friend.name}</Text>
                  {sched.start ? (
                    <Text style={styles.arrivalTime}>{sched.start}</Text>
                  ) : (
                    <Text style={styles.noTime}>—</Text>
                  )}
                  {highlight ? (
                    <Text style={styles.overlapBadge}>{t('friends.overlapBadge', { mins: over })}</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.barTrack}>
                {myBar && highlight && (
                  <View
                    style={[
                      styles.bar,
                      styles.overlapGhost,
                      { left: `${myBar.left}%`, width: `${myBar.width}%` },
                    ]}
                  />
                )}
                {schedule && (
                  <View
                    style={[
                      styles.bar,
                      {
                        left: `${schedule.left}%`,
                        width: `${schedule.width}%`,
                        backgroundColor: highlight
                          ? colors.primary
                          : friend.isAtGym
                            ? colors.primary
                            : colors.accent,
                        opacity: friend.isAtGym || highlight ? 1 : 0.65,
                      },
                    ]}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>
      <Text style={styles.hint}>{t('friends.scheduleFooter')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  slotCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  slotTitle: { ...typography.bodyBold, color: colors.text, fontSize: 14 },
  slotHint: { ...typography.small, color: colors.textMuted, lineHeight: 16 },
  slotRow: { gap: 6, paddingVertical: 4 },
  slotChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  slotChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotChipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600', fontSize: 12 },
  slotChipTextOn: { color: colors.textLight },
  slotResult: { gap: 8, marginTop: 4 },
  slotEmpty: { ...typography.caption, color: colors.textMuted },
  overlapLabel: { ...typography.caption, color: colors.primary, fontWeight: '700', marginBottom: 2 },
  slotPerson: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  slotPersonName: { ...typography.body, color: colors.text, flex: 1, fontSize: 13 },
  slotPersonTime: { ...typography.small, color: colors.textMuted },
  overlapMins: { ...typography.small, color: colors.primary, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    ...shadows.sm,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: '600',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  friendRowDim: { opacity: 0.35 },
  friendRowHi: {},
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: 118,
  },
  nameCol: {
    flex: 1,
    gap: 1,
  },
  friendName: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  meLabel: { color: colors.primary },
  arrivalTime: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  noTime: {
    ...typography.small,
    color: colors.textMuted,
  },
  overlapBadge: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 10,
  },
  barTrack: {
    flex: 1,
    height: 14,
    backgroundColor: colors.divider,
    borderRadius: 7,
    overflow: 'hidden',
    position: 'relative',
  },
  bar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 7,
  },
  myBar: {
    backgroundColor: colors.primary,
    opacity: 0.9,
  },
  overlapGhost: {
    backgroundColor: colors.primary,
    opacity: 0.18,
  },
  hint: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 16,
  },
  emptyWrap: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
  },
});
