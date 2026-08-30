import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { router, type Href } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';
import { useFeatureFlagsStore } from '@/src/stores/featureFlagsStore';
import { useSearchStore, filterUsersByQuery } from '@/src/stores/searchStore';
import { Avatar } from '@/src/components/ui/Avatar';
import { RankBadge } from '@/src/components/ui/RankBadge';
import { FriendActionButton } from './FriendActionButton';
import { getWinRate } from '@/src/services/points';
import { formatArrivalLabel } from '@/src/utils/friendsPresence';
import { useI18n } from '@/src/i18n/useI18n';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/theme';

export function FriendSearchPanel() {
  const { t } = useI18n();
  const query = useSearchStore((s) => s.query);
  const clearQuery = useSearchStore((s) => s.clearQuery);
  const users = useAuthStore((s) => s.users);
  const eloOn = useFeatureFlagsStore((s) => s.eloFeaturesEnabled);

  const results = useMemo(() => filterUsersByQuery(users, query), [query, users]);
  const trimmed = query.trim();

  if (!trimmed) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('friends.searchResults')}</Text>
        <Text style={styles.count}>{t('common.peopleCount', { count: results.length })}</Text>
        <Pressable onPress={clearQuery} hitSlop={8} accessibilityLabel={t('common.searchClose')}>
          <Text style={styles.clear}>{t('common.close')}</Text>
        </Pressable>
      </View>
      <Text style={styles.queryLabel}>「{trimmed}」</Text>

      <View style={styles.card}>
        {results.length === 0 ? (
          <Text style={styles.empty}>{t('friends.searchEmpty')}</Text>
        ) : (
          results.map((user, i) => (
            <React.Fragment key={user.id}>
              {i > 0 && <View style={styles.divider} />}
              <Pressable
                onPress={() => router.push(`/user/${user.id}` as Href)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Avatar name={user.name} color={user.avatarColor} size={44} showOnline={user.isAtGym} imageUri={user.avatarUri} />
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={styles.nickname}>{user.name}</Text>
                    {eloOn ? <RankBadge rank={user.rank} size="sm" /> : null}
                  </View>
                  <Text style={styles.arrival}>
                    {formatArrivalLabel(user) ?? t('common.noSchedule')}
                  </Text>
                  <Text style={styles.meta}>
                    {eloOn ? `ELO ${user.elo} · ` : ''}
                    {t('common.winRate')} {getWinRate(user.wins, user.losses)}% · {user.wins}
                    {t('common.wins')} {user.losses}{t('common.losses')}
                  </Text>
                </View>
                <FriendActionButton otherUserId={user.id} compact />
              </Pressable>
            </React.Fragment>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginBottom: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  title: { ...typography.label, color: colors.text, fontSize: 13, fontWeight: '700' },
  count: { ...typography.small, color: colors.textMuted, flex: 1 },
  clear: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  queryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.md,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nickname: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
  arrival: { ...typography.small, color: colors.primary, fontWeight: '600' },
  meta: { ...typography.caption, color: colors.textSecondary },
});
