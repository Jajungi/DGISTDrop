import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Switch } from 'react-native';
import { router, type Href } from 'expo-router';
import type { User } from '@/src/types';
import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { RANK_THRESHOLDS } from '@/src/constants';
import { formatArrivalLabel, formatScheduleRange } from '@/src/utils/friendsPresence';
import { FriendActionButton } from './FriendActionButton';
import { FriendInviteModal } from './FriendInviteModal';
import { useAuthStore } from '@/src/stores/authStore';
import { useFriendStore } from '@/src/stores/friendStore';
import { useFriendPrefsStore } from '@/src/stores/friendPrefsStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { colors, spacing, typography } from '@/src/theme';

interface FriendRowProps {
  user: User;
  compact?: boolean;
}

export function FriendRow({ user, compact = false }: FriendRowProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isGuest = useAuthStore((s) => s.isGuestSession);
  const getRelationStatus = useFriendStore((s) => s.getRelationStatus);
  const isArrivalNotifyOn = useFriendPrefsStore((s) => s.isArrivalNotifyOn);
  const setArrivalNotify = useFriendPrefsStore((s) => s.setArrivalNotify);
  const showToast = useNotificationStore((s) => s.showToast);
  const [inviteOpen, setInviteOpen] = useState(false);

  const arrival = formatArrivalLabel(user);
  const range = formatScheduleRange(user);
  const rankLabel = RANK_THRESHOLDS[user.rank]?.label ?? user.rank;
  const isFriend =
    !!currentUser && getRelationStatus(currentUser.id, user.id) === 'friends';
  const canInvite =
    !!currentUser && !isGuest && !compact && user.id !== currentUser.id && isFriend;
  const notifyOn =
    !!currentUser && isFriend && isArrivalNotifyOn(currentUser.id, user.id);

  return (
    <>
      <View style={[styles.row, compact && styles.rowCompact]}>
        <Pressable
          onPress={() => router.push(`/user/${user.id}` as Href)}
          style={({ pressed }) => [styles.main, pressed && styles.rowPressed]}
        >
          <Avatar
            name={user.name}
            color={user.avatarColor}
            imageUri={user.avatarUri}
            size={compact ? 36 : 44}
            showOnline={user.isAtGym}
          />
          <View style={styles.body}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.rank}>{rankLabel}</Text>
            </View>
            {arrival ? (
              <Text style={styles.arrival}>{arrival}</Text>
            ) : (
              <Text style={styles.noSchedule}>일정 미등록</Text>
            )}
            {range && user.scheduledEnd && (
              <Text style={styles.range}>{range}</Text>
            )}
          </View>
          {user.isAtGym && (
            <View style={styles.hereBadge}>
              <Text style={styles.hereText}>체육관</Text>
            </View>
          )}
        </Pressable>
        {isFriend && !compact && (
          <View style={styles.notifyCol}>
            <Text style={styles.notifyLabel}>도착</Text>
            <Switch
              value={notifyOn}
              onValueChange={(on) => {
                if (!currentUser) return;
                void setArrivalNotify(currentUser.id, user.id, on);
                showToast({
                  type: 'info',
                  title: '',
                  message: on
                    ? `${user.name}님 도착 시 알려드릴게요.`
                    : `${user.name}님 도착 알림을 껐어요.`,
                });
              }}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={notifyOn ? colors.primary : colors.textMuted}
            />
          </View>
        )}
        {canInvite && (
          <Button title="초대" size="sm" variant="outline" onPress={() => setInviteOpen(true)} />
        )}
        {!compact && <FriendActionButton otherUserId={user.id} compact />}
      </View>
      {canInvite && (
        <FriendInviteModal
          visible={inviteOpen}
          friendId={user.id}
          friendName={user.name}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  rowCompact: {
    paddingVertical: spacing.sm,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  rowPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  name: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 16,
  },
  rank: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
  },
  arrival: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  noSchedule: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  range: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 1,
  },
  notifyCol: {
    alignItems: 'center',
    gap: 2,
  },
  notifyLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10,
  },
  hereBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  hereText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
});
