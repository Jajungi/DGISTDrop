import React, { useMemo } from 'react';
import { Pressable, Text, StyleSheet, Platform, View } from 'react-native';
import { useAuthStore } from '@/src/stores/authStore';
import { useFriendStore } from '@/src/stores/friendStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { colors, borderRadius, typography } from '@/src/theme';

interface FriendActionButtonProps {
  otherUserId: string;
  compact?: boolean;
}

export function FriendActionButton({ otherUserId, compact = false }: FriendActionButtonProps) {
  const currentUserId = useAuthStore((s) => s.currentUser?.id ?? null);
  const friendRequests = useFriendStore((s) => s.friendRequests);
  const friendships = useFriendStore((s) => s.friendships);
  const sendFriendRequest = useFriendStore((s) => s.sendFriendRequest);
  const acceptFriendRequest = useFriendStore((s) => s.acceptFriendRequest);
  const rejectFriendRequest = useFriendStore((s) => s.rejectFriendRequest);
  const cancelFriendRequest = useFriendStore((s) => s.cancelFriendRequest);
  const removeFriend = useFriendStore((s) => s.removeFriend);
  const showToast = useNotificationStore((s) => s.showToast);

  const status = useMemo(() => {
    if (!currentUserId) return 'none' as const;
    if (friendships[currentUserId]?.includes(otherUserId)) return 'friends' as const;
    const pending = friendRequests.find(
      (r) =>
        r.status === 'pending' &&
        ((r.fromUserId === currentUserId && r.toUserId === otherUserId) ||
          (r.fromUserId === otherUserId && r.toUserId === currentUserId))
    );
    if (!pending) return 'none' as const;
    return pending.fromUserId === currentUserId ? ('pending_out' as const) : ('pending_in' as const);
  }, [currentUserId, friendships, friendRequests, otherUserId]);

  const incoming = useMemo(() => {
    if (!currentUserId) return undefined;
    return friendRequests.find(
      (r) =>
        r.status === 'pending' && r.toUserId === currentUserId && r.fromUserId === otherUserId
    );
  }, [currentUserId, friendRequests, otherUserId]);

  const outgoing = useMemo(() => {
    if (!currentUserId) return undefined;
    return friendRequests.find(
      (r) =>
        r.status === 'pending' && r.fromUserId === currentUserId && r.toUserId === otherUserId
    );
  }, [currentUserId, friendRequests, otherUserId]);

  if (!currentUserId || currentUserId === otherUserId) return null;

  const notify = (result: { success: boolean; message: string }) => {
    showToast({
      type: result.success ? 'success' : 'info',
      title: '',
      message: result.message,
    });
  };

  if (status === 'friends') {
    return (
      <Pressable
        onPress={() => notify(removeFriend(currentUserId, otherUserId))}
        style={[styles.btn, styles.btnGhost, compact && styles.btnCompact]}
      >
        <Text style={[styles.btnText, styles.btnTextGhost]} numberOfLines={1}>
          친구 삭제
        </Text>
      </Pressable>
    );
  }

  if (incoming) {
    return (
      <View style={styles.row}>
        <Pressable
          onPress={() => notify(acceptFriendRequest(incoming.id, currentUserId))}
          style={[styles.btn, styles.btnPrimary, compact && styles.btnCompact]}
        >
          <Text style={styles.btnText} numberOfLines={1}>
            수락
          </Text>
        </Pressable>
        <Pressable
          onPress={() => notify(rejectFriendRequest(incoming.id, currentUserId))}
          style={[styles.btn, styles.btnGhost, compact && styles.btnCompact]}
        >
          <Text style={[styles.btnText, styles.btnTextGhost]} numberOfLines={1}>
            거절
          </Text>
        </Pressable>
      </View>
    );
  }

  if (status === 'pending_out' && outgoing) {
    return (
      <Pressable
        onPress={() => notify(cancelFriendRequest(outgoing.id, currentUserId))}
        style={[styles.btn, styles.btnGhost, compact && styles.btnCompact]}
      >
        <Text style={[styles.btnText, styles.btnTextGhost]} numberOfLines={1}>
          신청 취소
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => notify(sendFriendRequest(currentUserId, otherUserId))}
      style={[styles.btn, styles.btnPrimary, compact && styles.btnCompact]}
    >
      <Text style={styles.btnText} numberOfLines={1}>
        친구 신청
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
    flexShrink: 0,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  btnCompact: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnGhost: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnText: {
    ...typography.small,
    color: colors.textLight,
    fontWeight: '700',
    fontSize: 12,
  },
  btnTextGhost: {
    color: colors.textSecondary,
  },
});
