import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useAuthStore } from '@/src/stores/authStore';
import { useFeatureFlagsStore } from '@/src/stores/featureFlagsStore';
import { Avatar } from '@/src/components/ui/Avatar';
import { RankBadge } from '@/src/components/ui/RankBadge';
import { getEffectiveSchedule } from '@/src/utils/dateFormat';
import { getWinRate } from '@/src/services/points';
import type { User } from '@/src/types';
import { FriendActionButton } from '@/src/components/friends/FriendActionButton';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/theme';

interface PersonSearchResultsProps {
  query: string;
  onSelect?: (user: User) => void;
}

function formatArrival(user: { scheduleDate?: string; scheduledStart?: string; scheduledEnd?: string; isAtGym: boolean }): string {
  if (user.isAtGym) return '체육관 도착';
  const sched = getEffectiveSchedule(user);
  if (sched.start) {
    const end = sched.end ? ` ~ ${sched.end}` : '';
    return `${sched.start} 도착 예정${end}`;
  }
  return '일정 미등록';
}

export function PersonSearchResults({ query, onSelect }: PersonSearchResultsProps) {
  const users = useAuthStore((s) => s.users);
  const eloOn = useFeatureFlagsStore((s) => s.eloFeaturesEnabled);
  const trimmed = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!trimmed) return [];
    return users
      .filter(
        (u) => u.name.toLowerCase().includes(trimmed) || u.studentId.includes(trimmed)
      )
      .slice(0, 6);
  }, [trimmed, users]);

  if (!trimmed) return null;

  return (
    <View style={styles.dropdown}>
      {results.length === 0 ? (
        <Text style={styles.empty}>검색 결과가 없어요</Text>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.list}>
          {results.map((user) => (
            <Pressable
              key={user.id}
              onPress={() => onSelect?.(user)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Avatar name={user.name} color={user.avatarColor} size={40} showOnline={user.isAtGym} />
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.displayName}>{user.name}</Text>
                  <RankBadge rank={user.rank} size="sm" />
                </View>
                <Text style={styles.arrival}>{formatArrival(user)}</Text>
                <Text style={styles.meta}>
                  {eloOn ? `ELO ${user.elo} · ` : ''}승률 {getWinRate(user.wins, user.losses)}% · {user.wins}승 {user.losses}패
                </Text>
              </View>
              <FriendActionButton otherUserId={user.id} compact />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    maxHeight: 320,
    zIndex: 100,
    ...shadows.md,
    ...Platform.select({
      web: { boxShadow: '0 8px 28px rgba(136,148,171,0.28)' } as object,
      default: {},
    }),
  },
  list: { maxHeight: 320 },
  empty: {
    ...typography.caption,
    color: colors.textMuted,
    padding: spacing.md,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  displayName: { ...typography.bodyBold, color: colors.text, fontSize: 15 },
  arrival: { ...typography.small, color: colors.primary, fontWeight: '600' },
  meta: { ...typography.caption, color: colors.textSecondary },
});
