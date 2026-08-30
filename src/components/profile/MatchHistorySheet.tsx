import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { MatchHistoryList } from './MatchHistoryList';
import { useI18n } from '@/src/i18n/useI18n';
import { colors, spacing, typography, borderRadius, glass } from '@/src/theme';

interface MatchHistorySheetProps {
  visible: boolean;
  userId: string;
  totalGames: number;
  wins: number;
  losses: number;
  onClose: () => void;
}

export function MatchHistorySheet({
  visible,
  userId,
  totalGames,
  wins,
  losses,
  onClose,
}: MatchHistorySheetProps) {
  const { t } = useI18n();

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{t('profile.matchHistoryTitle')}</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalGames}</Text>
            <Text style={styles.summaryLabel}>{t('profile.totalGames')}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.success }]}>{wins}</Text>
            <Text style={styles.summaryLabel}>{t('common.wins')}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.error }]}>{losses}</Text>
            <Text style={styles.summaryLabel}>{t('common.losses')}</Text>
          </View>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          <MatchHistoryList userId={userId} />
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
  title: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { ...typography.h2, color: colors.text, fontSize: 24 },
  summaryLabel: { ...typography.caption, color: colors.textMuted },
  summaryDivider: { width: 1, height: 32, backgroundColor: colors.border },
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.sm },
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
