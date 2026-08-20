import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '@/src/stores/authStore';
import { useFriendStore } from '@/src/stores/friendStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { Avatar } from '@/src/components/ui/Avatar';
import { FriendActionButton } from './FriendActionButton';
import { countPlayPartners } from '@/src/utils/playPartners';
import { RANK_THRESHOLDS } from '@/src/constants';
import { useFeatureFlagsStore } from '@/src/stores/featureFlagsStore';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/theme';

/** 최근 같이 친 비친구 → 친구 추천 */
export function PartnerSuggestPanel() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useAuthStore((s) => s.users);
  const matchHistory = useNotificationStore((s) => s.matchHistory);
  const getRelationStatus = useFriendStore((s) => s.getRelationStatus);
  const eloOn = useFeatureFlagsStore((s) => s.eloFeaturesEnabled);

  const suggestions = useMemo(() => {
    if (!currentUser) return [];
    const stats = countPlayPartners(matchHistory, currentUser.id, { limit: 12, minCount: 1 });
    return stats
      .map((s) => {
        const user = users.find((u) => u.id === s.userId);
        if (!user || user.memberStatus !== 'approved') return null;
        if (user.membershipTier === 'guest') return null;
        const rel = getRelationStatus(currentUser.id, user.id);
        if (rel === 'friends') return null;
        return { user, count: s.count, rel };
      })
      .filter(Boolean)
      .slice(0, 6) as {
      user: (typeof users)[0];
      count: number;
      rel: ReturnType<typeof getRelationStatus>;
    }[];
  }, [currentUser, users, matchHistory, getRelationStatus]);

  if (!currentUser || suggestions.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>자주 치는 파트너</Text>
        <Text style={styles.sectionSubtitle}>최근 같이 친 횟수 · 친구 추천</Text>
      </View>
      <View style={styles.card}>
        {suggestions.map(({ user, count, rel }, i) => (
          <React.Fragment key={user.id}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.row}>
              <Avatar
                name={user.name}
                color={user.avatarColor}
                imageUri={user.avatarUri}
                size={40}
                showOnline={user.isAtGym}
              />
              <View style={styles.body}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.meta}>
                  같이 {count}경기
                  {eloOn ? ` · ${RANK_THRESHOLDS[user.rank]?.label ?? user.rank}` : ''}
                  {rel === 'pending_out' ? ' · 신청함' : rel === 'pending_in' ? ' · 받은 신청' : ''}
                </Text>
              </View>
              <FriendActionButton otherUserId={user.id} compact />
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  sectionHeader: { gap: 2, paddingHorizontal: spacing.xs },
  sectionTitle: {
    ...typography.label,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  body: { flex: 1, gap: 2 },
  name: { ...typography.bodyBold, color: colors.text, fontSize: 15 },
  meta: { ...typography.small, color: colors.textMuted },
});
