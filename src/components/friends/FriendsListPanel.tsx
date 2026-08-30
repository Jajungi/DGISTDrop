import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { User } from '@/src/types';
import { FriendRow } from './FriendRow';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/theme';
import { useI18n } from '@/src/i18n/useI18n';

interface FriendsListPanelProps {
  onlineFriends: User[];
  offlineFriends: User[];
  othersCheckedIn: User[];
}

function Section({
  title,
  subtitle,
  children,
  emptyMessage,
  isEmpty,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.card}>
        {isEmpty ? (
          <Text style={styles.empty}>{emptyMessage}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

export function FriendsListPanel({
  onlineFriends,
  offlineFriends,
  othersCheckedIn,
}: FriendsListPanelProps) {
  const { t } = useI18n();
  const hasFriends = onlineFriends.length > 0 || offlineFriends.length > 0;

  return (
    <View style={styles.wrap}>
      <Section
        title={t('friends.sectionAtGym')}
        subtitle={t('friends.sectionAtGymSub')}
        isEmpty={onlineFriends.length === 0}
        emptyMessage={t('friends.sectionAtGymEmpty')}
      >
        {onlineFriends.map((user, i) => (
          <React.Fragment key={user.id}>
            {i > 0 && <Divider />}
            <FriendRow user={user} />
          </React.Fragment>
        ))}
      </Section>

      <Section
        title={t('friends.sectionOffline')}
        subtitle={t('friends.sectionOfflineSub')}
        isEmpty={offlineFriends.length === 0}
        emptyMessage={
          hasFriends ? t('friends.sectionOfflineAllHere') : t('friends.sectionOfflineEmpty')
        }
      >
        {offlineFriends.map((user, i) => (
          <React.Fragment key={user.id}>
            {i > 0 && <Divider />}
            <FriendRow user={user} />
          </React.Fragment>
        ))}
      </Section>

      <Section
        title={t('friends.sectionOthers')}
        subtitle={t('friends.sectionOthersSub')}
        isEmpty={othersCheckedIn.length === 0}
        emptyMessage={t('friends.sectionOthersEmpty')}
      >
        {othersCheckedIn.map((user, i) => (
          <React.Fragment key={user.id}>
            {i > 0 && <Divider />}
            <FriendRow user={user} compact />
          </React.Fragment>
        ))}
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    gap: 2,
    paddingHorizontal: spacing.xs,
  },
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
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
});
