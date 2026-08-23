import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import type { PointTransaction } from '@/src/types';
import { usePointStore } from '@/src/stores/pointStore';
import { colors, spacing, typography, borderRadius, glass, withAlpha } from '@/src/theme';

type FilterTab = 'all' | 'earned' | 'spent';

interface PointsHistorySheetProps {
  visible: boolean;
  userId: string;
  balance: number;
  onClose: () => void;
}

const TAB_LABELS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'earned', label: '받은 내역' },
  { key: 'spent', label: '쓴 내역' },
];

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `오늘 ${time}`;

  return d.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function typeIcon(type: PointTransaction['type']) {
  switch (type) {
    case 'check_in':
      return '✓';
    case 'court_reserve':
      return '🏸';
    case 'match_win':
      return '🏆';
    case 'match_loss':
      return '🤝';
    case 'cleaning':
      return '🧹';
    case 'net_setup':
      return '🥅';
    case 'club_fee':
      return '💳';
    case 'shuttlecock':
      return '🏸';
    case 'welcome':
      return '🎉';
    case 'bonus':
      return '⭐';
    default:
      return '•';
  }
}

function TransactionRow({ tx }: { tx: PointTransaction }) {
  const earned = tx.amount > 0;

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, earned ? styles.iconEarned : styles.iconSpent]}>
        <Text style={styles.iconText}>{typeIcon(tx.type)}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {tx.description}
        </Text>
        <Text style={styles.rowWhen}>{formatWhen(tx.createdAt)}</Text>
      </View>
      <Text style={[styles.rowAmount, earned ? styles.amountEarned : styles.amountSpent]}>
        {earned ? '+' : ''}
        {tx.amount}P
      </Text>
    </View>
  );
}

export function PointsHistorySheet({ visible, userId, balance, onClose }: PointsHistorySheetProps) {
  const getTransactionsForUser = usePointStore((s) => s.getTransactionsForUser);
  const [tab, setTab] = useState<FilterTab>('all');

  const all = useMemo(() => getTransactionsForUser(userId), [getTransactionsForUser, userId]);

  const filtered = useMemo(() => {
    if (tab === 'earned') return all.filter((t) => t.amount > 0);
    if (tab === 'spent') return all.filter((t) => t.amount < 0);
    return all;
  }, [all, tab]);

  const earnedTotal = useMemo(
    () => all.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
    [all]
  );
  const spentTotal = useMemo(
    () => Math.abs(all.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)),
    [all]
  );

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>포인트 내역</Text>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>보유 포인트</Text>
          <Text style={styles.balanceValue}>{balance}P</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryEarned}>받음 +{earnedTotal}P</Text>
            <Text style={styles.summarySpent}>사용 -{spentTotal}P</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {TAB_LABELS.map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={[styles.tab, tab === key && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {filtered.length === 0 ? (
            <Text style={styles.empty}>내역이 없어요.</Text>
          ) : (
            filtered.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
          )}
        </ScrollView>

        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>닫기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  sheet: {
    ...glass.sheet,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    maxHeight: '78%',
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
  balanceCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  balanceLabel: { ...typography.caption, color: colors.textSecondary },
  balanceValue: { ...typography.h1, color: colors.primary, fontSize: 32 },
  summaryRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
  summaryEarned: { ...typography.small, color: colors.success, fontWeight: '600' },
  summarySpent: { ...typography.small, color: colors.error, fontWeight: '600' },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: colors.textLight },
  list: { flexGrow: 0 },
  listContent: { paddingBottom: spacing.sm },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEarned: { backgroundColor: colors.accentLight },
  iconSpent: { backgroundColor: withAlpha(colors.error, 0.14) },
  iconText: { fontSize: 16 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, color: colors.text, fontSize: 14 },
  rowWhen: { ...typography.small, color: colors.textMuted },
  rowAmount: { ...typography.bodyBold, fontSize: 15, minWidth: 56, textAlign: 'right' },
  amountEarned: { color: colors.success },
  amountSpent: { color: colors.error },
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
