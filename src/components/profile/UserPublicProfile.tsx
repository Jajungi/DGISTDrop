import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { User } from '@/src/types';
import { Avatar } from '@/src/components/ui/Avatar';
import { RankBadge } from '@/src/components/ui/RankBadge';
import { Card } from '@/src/components/ui/Card';
import { getWinRate } from '@/src/services/points';
import { formatArrivalLabel, formatScheduleRange } from '@/src/utils/friendsPresence';
import { getEffectiveSchedule } from '@/src/utils/dateFormat';
import { RANK_THRESHOLDS } from '@/src/constants';
import { useFeatureFlagsStore } from '@/src/stores/featureFlagsStore';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

interface UserPublicProfileProps {
  user: User;
}

export function UserPublicProfile({ user }: UserPublicProfileProps) {
  const winRate = getWinRate(user.wins, user.losses);
  const rankLabel = RANK_THRESHOLDS[user.rank]?.label ?? user.rank;
  const eloOn = useFeatureFlagsStore((s) => s.eloFeaturesEnabled);
  const arrival = formatArrivalLabel(user);
  const schedule = formatScheduleRange(user);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Avatar name={user.name} color={user.avatarColor} size={72} showOnline={user.isAtGym} imageUri={user.avatarUri} />
        <View style={styles.headerInfo}>
          <Text style={styles.displayName}>{user.name}</Text>
          <View style={styles.badges}>
            <RankBadge rank={user.rank} size="lg" />
            {eloOn ? (
            <View style={styles.rankPill}>
              <Text style={styles.rankPillText}>{rankLabel}</Text>
            </View>
            ) : null}
          </View>
          {user.isAtGym ? (
            <Text style={styles.atGym}>지금 체육관</Text>
          ) : arrival ? (
            <Text style={styles.schedule}>{arrival}</Text>
          ) : (
            <Text style={styles.noSchedule}>일정 미등록</Text>
          )}
          {schedule && getEffectiveSchedule(user).end ? (
            <Text style={styles.scheduleRange}>{schedule}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.statsGrid}>
        {eloOn ? (
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{user.elo}</Text>
          <Text style={styles.statLabel}>Elo</Text>
        </Card>
        ) : null}
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{winRate}%</Text>
          <Text style={styles.statLabel}>승률</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{user.wins}</Text>
          <Text style={styles.statLabel}>승</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{user.losses}</Text>
          <Text style={styles.statLabel}>패</Text>
        </Card>
      </View>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>활동</Text>
        <InfoRow label="총 게임" value={`${user.totalGames}경기`} />
        <InfoRow label="청소 기여" value={`${user.cleaningContributions}회`} />
        <InfoRow
          label="회원 등급"
          value={
            user.membershipTier === 'full'
              ? '정회원'
              : user.membershipTier === 'associate'
                ? '준회원'
                : '동아리원'
          }
        />
      </Card>

      <Text style={styles.privacyNote}>
        학번·이메일·실명·포인트 등 개인정보는 표시되지 않습니다.
      </Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  header: {
    flexDirection: 'row',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
  },
  headerInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  displayName: { ...typography.h2, color: colors.text },
  badges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  rankPill: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
  },
  rankPillText: { ...typography.small, color: colors.textSecondary, fontSize: 11 },
  atGym: { ...typography.bodyBold, color: colors.success, marginTop: 4 },
  schedule: { ...typography.bodyBold, color: colors.text, marginTop: 4, fontSize: 18 },
  scheduleRange: { ...typography.caption, color: colors.textSecondary },
  noSchedule: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: { width: '47%', alignItems: 'center', padding: spacing.lg },
  statValue: { ...typography.h2, color: colors.text },
  statLabel: { ...typography.label, color: colors.textMuted, marginTop: spacing.xs, textTransform: 'none' },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.xs },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  infoLabel: { ...typography.body, color: colors.textSecondary },
  infoValue: { ...typography.bodyBold, color: colors.text },
  privacyNote: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingBottom: spacing.md,
  },
});
