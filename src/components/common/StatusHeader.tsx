import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { GYM_LOCATION } from '@/src/constants';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

interface StatusHeaderProps {
  remaining?: string | null;
  isAtGym: boolean;
  emptyCount: number;
  reservedCount: number;
  playingCount: number;
}

export function StatusHeader({
  remaining,
  isAtGym,
  emptyCount,
  reservedCount,
  playingCount,
}: StatusHeaderProps) {
  const { isDesktop } = useLayoutMode();

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.pageTitle}>코트 현황</Text>
          <Text style={styles.pageSubtitle}>{GYM_LOCATION.name}</Text>
        </View>
        <View style={[styles.locationBadge, isAtGym && styles.atGym]}>
          <View style={[styles.locDot, isAtGym && styles.locDotActive]} />
          <Text style={styles.locText}>{isAtGym ? '현장' : '원격'}</Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        <StatCard label="예약 가능" value={String(emptyCount)} highlight={emptyCount > 0} />
        <StatCard label="예약됨" value={String(reservedCount)} />
        <StatCard label="경기 중" value={String(playingCount)} />
        {remaining && <StatCard label="남은 시간" value={remaining} />}
      </View>
    </View>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.card, highlight && styles.cardHighlight]}>
      <Text style={[styles.cardValue, highlight && styles.cardValueHighlight]}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  containerDesktop: {
    paddingHorizontal: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  pageTitle: { ...typography.h1, color: colors.text },
  pageSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  atGym: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  locDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted },
  locDotActive: { backgroundColor: colors.success },
  locText: { ...typography.small, color: colors.textSecondary },
  cardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: {
    flex: 1,
    minWidth: 72,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  cardHighlight: { backgroundColor: colors.primaryLight },
  cardValue: { ...typography.h2, color: colors.text, fontSize: 22 },
  cardValueHighlight: { color: colors.primary },
  cardLabel: { ...typography.small, color: colors.textMuted },
});
