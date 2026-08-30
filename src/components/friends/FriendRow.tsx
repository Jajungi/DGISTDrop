import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { router, type Href } from 'expo-router';
import type { User } from '@/src/types';
import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { Toggle } from '@/src/components/ui/Toggle';
import { RANK_THRESHOLDS } from '@/src/constants';
import { formatArrivalLabel, formatScheduleRange } from '@/src/utils/friendsPresence';
import { FriendActionButton } from './FriendActionButton';
import { FriendInviteModal } from './FriendInviteModal';
import { useAuthStore } from '@/src/stores/authStore';
import { useFriendStore } from '@/src/stores/friendStore';
import { useFriendPrefsStore } from '@/src/stores/friendPrefsStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useFeatureFlagsStore } from '@/src/stores/featureFlagsStore';
import { colors, spacing, typography } from '@/src/theme';

interface FriendRowProps {
  user: User;
  compact?: boolean;
}

export function FriendRow({ user, compact = false }: FriendRowProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentUserId = currentUser?.id;
  const isGuest = useAuthStore((s) => s.isGuestSession);
  const isFriend = useFriendStore((s) =>
    currentUserId ? (s.friendships[currentUserId] ?? []).includes(user.id) : false
  );
  const notifyOn = useFriendPrefsStore((s) =>
    currentUserId ? (s.arrivalNotify[currentUserId] ?? []).includes(user.id) : false
  );
  const setArrivalNotify = useFriendPrefsStore((s) => s.setArrivalNotify);
  const showToast = useNotificationStore((s) => s.showToast);
  const eloOn = useFeatureFlagsStore((s) => s.eloFeaturesEnabled);
  const [inviteOpen, setInviteOpen] = useState(false);

  const arrival = formatArrivalLabel(user);
  const range = formatScheduleRange(user);
  const rankLabel = RANK_THRESHOLDS[user.rank]?.label ?? user.rank;
  const canInvite =
    !!currentUser && !isGuest && !compact && user.id !== currentUser.id && isFriend;
  const showActions = isFriend && !compact;

  return (
    <>
      <View style={[styles.wrap, compact && styles.wrapCompact]}>
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
              <Text style={styles.name} numberOfLines={1}>
                {user.name}
              </Text>
              {eloOn ? (
                <Text style={styles.rank} numberOfLines={1}>
                  {rankLabel}
                </Text>
              ) : null}
            </View>
            {arrival ? (
              <Text style={styles.arrival} numberOfLines={1}>
                {arrival}
              </Text>
            ) : (
              <Text style={styles.noSchedule} numberOfLines={1}>
                일정 미등록
              </Text>
            )}
            {range && user.scheduledEnd ? (
              <Text style={styles.range} numberOfLines={1}>
                {range}
              </Text>
            ) : null}
          </View>
          {user.isAtGym ? (
            <View style={styles.hereBadge}>
              <Text style={styles.hereText} numberOfLines={1}>
                체육관
              </Text>
            </View>
          ) : null}
        </Pressable>
        {showActions ? (
          <View style={styles.actions}>
            <View style={styles.notifyCol}>
              <Text
                style={[styles.notifyLabel, notifyOn && styles.notifyLabelOn]}
                numberOfLines={1}
              >
                도착
              </Text>
              <Toggle
                size="sm"
                value={notifyOn}
                accessibilityLabel={`${user.name} 도착 알림`}
                onValueChange={(on) => {
                  if (!currentUserId) return;
                  void setArrivalNotify(currentUserId, user.id, on);
                  showToast({
                    type: 'info',
                    title: '',
                    message: on
                      ? `${user.name}님 도착 시 알려드릴게요.`
                      : `${user.name}님 도착 알림을 껐어요.`,
                  });
                }}
              />
            </View>
            {canInvite ? (
              <Button title="초대" size="sm" variant="outline" onPress={() => setInviteOpen(true)} />
            ) : null}
            <FriendActionButton otherUserId={user.id} compact />
          </View>
        ) : null}
      </View>
      {canInvite ? (
        <FriendInviteModal
          visible={inviteOpen}
          friendId={user.id}
          friendName={user.name}
          onClose={() => setInviteOpen(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  wrapCompact: {
    paddingVertical: spacing.sm,
  },
  main: {
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
    minWidth: 0,
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
    flexShrink: 1,
  },
  rank: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
    flexShrink: 0,
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'nowrap',
    gap: spacing.sm,
    flexShrink: 0,
  },
  notifyCol: {
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  notifyLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10,
  },
  notifyLabelOn: {
    color: colors.primary,
    fontWeight: '700',
  },
  hereBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexShrink: 0,
  },
  hereText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
});
