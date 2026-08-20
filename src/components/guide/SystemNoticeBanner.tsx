import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

/**
 * 전체 공지(알림함 system)를 홈·친구·모집 상단에도 표시.
 * 읽지 않은 공지만, 최근 3건.
 */
export function SystemNoticeBanner() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const inbox = useNotificationStore((s) => s.inbox);
  const markRead = useNotificationStore((s) => s.markNotificationRead);

  const notices = useMemo(() => {
    if (!currentUser) return [];
    return inbox
      .filter(
        (n) =>
          n.type === 'system' &&
          !n.read &&
          (!n.targetUserId || n.targetUserId === currentUser.id)
      )
      .slice(0, 3);
  }, [inbox, currentUser]);

  if (!notices.length) return null;

  return (
    <View style={styles.wrap}>
      {notices.map((n) => (
        <Pressable
          key={n.id}
          style={styles.banner}
          onPress={() => markRead(n.id)}
          accessibilityRole="button"
          accessibilityLabel={`공지 ${n.title} 읽음 처리`}
        >
          <Ionicons name="megaphone-outline" size={18} color={colors.primary} />
          <View style={styles.body}>
            <Text style={styles.title}>공지 · {n.title}</Text>
            {!!n.message && <Text style={styles.sub}>{n.message}</Text>}
            <Text style={styles.hint}>탭하면 읽음 처리됩니다</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginBottom: spacing.md },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    backgroundColor: colors.primaryLight,
    borderColor: colors.border,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  body: { flex: 1, gap: 2 },
  title: { ...typography.caption, fontWeight: '700', color: colors.text },
  sub: { ...typography.small, color: colors.textSecondary, lineHeight: 16 },
  hint: { ...typography.small, color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
