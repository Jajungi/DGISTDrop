import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { router, type Href } from 'expo-router';
import type { FriendRequest } from '@/src/types';
import { Avatar } from '@/src/components/ui/Avatar';
import { useAuthStore } from '@/src/stores/authStore';
import { useFriendStore } from '@/src/stores/friendStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/theme';
import { useI18n } from '@/src/i18n/useI18n';

interface FriendRequestsPanelProps {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}

export function FriendRequestsPanel({ incoming, outgoing }: FriendRequestsPanelProps) {
  const { t } = useI18n();
  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useAuthStore((s) => s.users);
  const acceptFriendRequest = useFriendStore((s) => s.acceptFriendRequest);
  const rejectFriendRequest = useFriendStore((s) => s.rejectFriendRequest);
  const cancelFriendRequest = useFriendStore((s) => s.cancelFriendRequest);
  const showToast = useNotificationStore((s) => s.showToast);

  if (!currentUser) return null;
  if (incoming.length === 0 && outgoing.length === 0) return null;

  const notify = (result: { success: boolean; message: string }) => {
    showToast({ type: result.success ? 'success' : 'info', title: '', message: result.message });
  };

  const avatarFor = (userId: string, fallbackName: string) => {
    const u = users.find((x) => x.id === userId);
    return { name: u?.name ?? fallbackName, color: u?.avatarColor ?? colors.primary };
  };

  return (
    <View style={styles.wrap}>
      {incoming.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.title}>
            {t('friends.incomingRequests', { count: incoming.length })}
          </Text>
          <View style={styles.card}>
            {incoming.map((req, i) => {
              const av = avatarFor(req.fromUserId, req.fromUserName);
              return (
                <View key={req.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.row}>
                    <Pressable
                      onPress={() => router.push(`/user/${req.fromUserId}` as Href)}
                      style={styles.rowMain}
                    >
                      <Avatar
                        name={av.name}
                        color={av.color}
                        imageUri={users.find((x) => x.id === req.fromUserId)?.avatarUri}
                        size={40}
                      />
                      <View style={styles.body}>
                        <Text style={styles.name} numberOfLines={1}>
                          {req.fromUserName}
                        </Text>
                        <Text style={styles.sub} numberOfLines={1}>
                          {t('friends.requestSent')}
                        </Text>
                      </View>
                    </Pressable>
                    <View style={styles.actions}>
                      <Pressable
                        onPress={() => notify(acceptFriendRequest(req.id, currentUser.id))}
                        style={[styles.btn, styles.accept]}
                      >
                        <Text style={styles.btnTextLight} numberOfLines={1}>
                          {t('common.accept')}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => notify(rejectFriendRequest(req.id, currentUser.id))}
                        style={[styles.btn, styles.reject]}
                      >
                        <Text style={styles.btnTextMuted} numberOfLines={1}>
                          {t('common.reject')}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {outgoing.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.title}>
            {t('friends.outgoingRequests', { count: outgoing.length })}
          </Text>
          <View style={styles.card}>
            {outgoing.map((req, i) => {
              const av = avatarFor(req.toUserId, req.toUserName);
              const u = users.find((x) => x.id === req.toUserId);
              return (
                <View key={req.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.row}>
                    <Pressable
                      onPress={() => router.push(`/user/${req.toUserId}` as Href)}
                      style={styles.rowMain}
                    >
                      <Avatar name={av.name} color={av.color} imageUri={u?.avatarUri} size={40} />
                      <View style={styles.body}>
                        <Text style={styles.name} numberOfLines={1}>
                          {req.toUserName}
                        </Text>
                        <Text style={styles.sub} numberOfLines={1}>
                          {t('friends.waitingResponse')}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => notify(cancelFriendRequest(req.id, currentUser.id))}
                      style={[styles.btn, styles.reject]}
                    >
                      <Text style={styles.btnTextMuted} numberOfLines={1}>
                        {t('friends.cancelRequest')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, marginBottom: spacing.md },
  section: { gap: spacing.sm },
  title: { ...typography.label, color: colors.text, fontWeight: '700', paddingHorizontal: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  body: { flex: 1, minWidth: 0, gap: 2 },
  actions: { flexDirection: 'row', gap: spacing.xs, flexShrink: 0 },
  name: { ...typography.bodyBold, color: colors.text },
  sub: { ...typography.caption, color: colors.textMuted },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
    flexShrink: 0,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  accept: { backgroundColor: colors.primary },
  reject: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnTextLight: { ...typography.small, color: colors.textLight, fontWeight: '700' },
  btnTextMuted: { ...typography.small, color: colors.textSecondary, fontWeight: '600' },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.md,
  },
});
