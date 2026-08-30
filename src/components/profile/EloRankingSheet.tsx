import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { useAuthStore } from '@/src/stores/authStore';
import { Avatar } from '@/src/components/ui/Avatar';
import { RankBadge } from '@/src/components/ui/RankBadge';
import { useI18n } from '@/src/i18n/useI18n';
import { colors, spacing, typography, borderRadius, glass } from '@/src/theme';

interface EloRankingSheetProps {
  visible: boolean;
  currentUserId: string;
  onClose: () => void;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function EloRankingSheet({ visible, currentUserId, onClose }: EloRankingSheetProps) {
  const { t } = useI18n();
  const users = useAuthStore((s) => s.users);

  const ranked = useMemo(
    () =>
      users
        .filter((u) => u.membershipTier !== 'guest' && u.memberStatus === 'approved')
        .sort((a, b) => b.elo - a.elo),
    [users]
  );

  const myRank = ranked.findIndex((u) => u.id === currentUserId) + 1;

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{t('profile.rankingTitle')}</Text>
        {myRank > 0 && (
          <Text style={styles.myRankText}>
            {t('profile.rankingMyRank', { total: ranked.length, rank: myRank })}
          </Text>
        )}

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {ranked.length === 0 ? (
            <Text style={styles.empty}>{t('profile.rankingEmpty')}</Text>
          ) : (
            ranked.map((u, i) => {
              const isMe = u.id === currentUserId;
              return (
                <View key={u.id} style={[styles.row, isMe && styles.rowMe]}>
                  <View style={styles.rankCol}>
                    {i < 3 ? (
                      <Text style={styles.medal}>{MEDALS[i]}</Text>
                    ) : (
                      <Text style={styles.rankNum}>{i + 1}</Text>
                    )}
                  </View>
                  <Avatar name={u.name} color={u.avatarColor} size={32} />
                  <View style={styles.nameCol}>
                    <Text style={styles.name} numberOfLines={1}>
                      {u.name}
                      {isMe ? t('profile.rankingMeSuffix') : ''}
                    </Text>
                    <RankBadge rank={u.rank} size="sm" />
                  </View>
                  <Text style={styles.elo}>{u.elo}</Text>
                </View>
              );
            })
          )}
        </ScrollView>

        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>{t('common.close')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', zIndex: 100 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  sheet: {
    ...glass.sheet,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    height: '90%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  title: { ...typography.h3, color: colors.text },
  myRankText: { ...typography.caption, color: colors.primary, marginTop: 4, marginBottom: spacing.sm },
  list: { flex: 1, marginTop: spacing.sm },
  listContent: { paddingBottom: spacing.sm },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    borderRadius: borderRadius.sm,
  },
  rowMe: { backgroundColor: colors.primaryLight },
  rankCol: { width: 28, alignItems: 'center' },
  medal: { fontSize: 18 },
  rankNum: { ...typography.bodyBold, color: colors.textMuted },
  nameCol: { flex: 1, gap: 3 },
  name: { ...typography.body, color: colors.text, fontSize: 14, fontWeight: '600' },
  elo: { ...typography.bodyBold, color: colors.primary, fontSize: 16, minWidth: 48, textAlign: 'right' },
  closeBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceAlt,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  closeBtnText: { ...typography.bodyBold, color: colors.textSecondary },
});
