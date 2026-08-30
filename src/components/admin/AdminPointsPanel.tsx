import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useAuthStore } from '@/src/stores/authStore';
import { usePointStore } from '@/src/stores/pointStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import {
  POINT_EARN,
  POINT_SPEND,
  PEAK_TIME_RESERVATION_LIMIT,
  POINT_TYPE_LABELS,
} from '@/src/constants/points';
import { getReservationCost, getRankDiscountPercent } from '@/src/services/points';
import { usePeakHoursStore } from '@/src/stores/peakHoursStore';
import { formatPeakHoursLabel } from '@/src/utils/peakHours';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Avatar } from '@/src/components/ui/Avatar';
import { colors, spacing, typography, borderRadius } from '@/src/theme';
import type { PointTransaction, PointTransactionType, User } from '@/src/types';

type TxFilter = 'all' | 'earned' | 'spent' | 'revoked';

interface AdminPointsPanelProps {
  adminId: string;
  onToast: (type: 'success' | 'warning' | 'info', message: string) => void;
}

const GRANT_PRESETS: { label: string; amount: number; type: PointTransactionType; desc: string }[] = [
  { label: '출석', amount: POINT_EARN.ATTENDANCE_FULL, type: 'check_in', desc: '출석 인증 (운영진)' },
  { label: '청소', amount: POINT_EARN.CLEANING, type: 'cleaning', desc: '청소·정리 인증 (운영진)' },
  { label: '네트', amount: POINT_EARN.NET_SETUP, type: 'net_setup', desc: '네트 설치·철거 (운영진)' },
  { label: '경기승', amount: POINT_EARN.MATCH_WIN, type: 'match_win', desc: '경기 승리 (운영진)' },
  { label: '경기패', amount: POINT_EARN.MATCH_LOSS, type: 'match_loss', desc: '경기 참여 (운영진)' },
  { label: '회비', amount: POINT_EARN.CLUB_FEE, type: 'club_fee', desc: '동아리비 납부 인증 (운영진)' },
];

export function AdminPointsPanel({ adminId, onToast }: AdminPointsPanelProps) {
  const users = useAuthStore((s) => s.users);
  const transactions = usePointStore((s) => s.transactions);
  const adminRevokeTransaction = usePointStore((s) => s.adminRevokeTransaction);
  const adminGrantPoints = usePointStore((s) => s.adminGrantPoints);
  const adminAdjustPoints = useAuthStore((s) => s.adminAdjustPoints);
  const adminVerifyClubFee = useAuthStore((s) => s.adminVerifyClubFee);
  const adminRevokeClubFee = useAuthStore((s) => s.adminRevokeClubFee);
  const cleaningLeaderboard = useNotificationStore((s) => s.cleaningLeaderboard);
  const adminRevokeCleaning = useNotificationStore((s) => s.adminRevokeCleaning);
  const adminRevokeNetSetup = useNotificationStore((s) => s.adminRevokeNetSetup);
  const peakHours = usePeakHoursStore((s) => s.hours);

  const [userQuery, setUserQuery] = useState('');
  const [txQuery, setTxQuery] = useState('');
  const [txFilter, setTxFilter] = useState<TxFilter>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [revokeReason, setRevokeReason] = useState('운영진 취소');

  const approvedMembers = useMemo(
    () => users.filter((u) => u.memberStatus === 'approved'),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return approvedMembers.slice(0, 8);
    return approvedMembers
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.studentId.includes(q)
      )
      .slice(0, 12);
  }, [approvedMembers, userQuery]);

  const selectedUser = selectedUserId
    ? users.find((u) => u.id === selectedUserId) ?? null
    : null;

  const filteredTx = useMemo(() => {
    let list = [...transactions];
    if (txFilter === 'earned') list = list.filter((t) => t.amount > 0);
    if (txFilter === 'spent') list = list.filter((t) => t.amount < 0);
    if (txFilter === 'revoked') list = list.filter((t) => t.revokedAt);
    if (selectedUserId) list = list.filter((t) => t.userId === selectedUserId);
    const q = txQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          (POINT_TYPE_LABELS[t.type] ?? t.type).toLowerCase().includes(q) ||
          (users.find((u) => u.id === t.userId)?.name.toLowerCase().includes(q) ?? false)
      );
    }
    return list.slice(0, 40);
  }, [transactions, txFilter, selectedUserId, txQuery, users]);

  const topHolders = useMemo(
    () => [...approvedMembers].sort((a, b) => b.points - a.points).slice(0, 5),
    [approvedMembers]
  );

  const serviceEntries = useMemo(
    () =>
      cleaningLeaderboard
        .filter((e) => !e.revokedAt)
        .slice(0, 8),
    [cleaningLeaderboard]
  );

  const resolveUser = (id: string) => users.find((u) => u.id === id);

  const grantToSelected = (
    amount: number,
    type: PointTransactionType,
    description: string
  ) => {
    if (!selectedUser) {
      onToast('warning', '회원을 먼저 선택해 주세요.');
      return;
    }
    const r = adminGrantPoints(selectedUser.id, amount, type, description, adminId);
    onToast(r.success ? 'success' : 'warning', r.message);
  };

  return (
    <View style={styles.wrap}>
      <Card style={styles.policyCard}>
        <Text style={styles.policyTitle}>포인트 정책</Text>
        <Text style={styles.policyText}>
          적립: 회비 +{POINT_EARN.CLUB_FEE} · 출석 정회원 +{POINT_EARN.ATTENDANCE_FULL}/준회원 +
          {POINT_EARN.ATTENDANCE_ASSOCIATE} · 청소 +{POINT_EARN.CLEANING} · 네트 +{POINT_EARN.NET_SETUP}{' '}
          · 경기승 +{POINT_EARN.MATCH_WIN}/패 +{POINT_EARN.MATCH_LOSS}
        </Text>
        <Text style={styles.policyText}>
          사용: 일반 코트 -{POINT_SPEND.COURT_GENERAL} · 중앙(4~6) -{POINT_SPEND.COURT_CENTER} · 셔틀콕 -
          {POINT_SPEND.SHUTTLECOCK}
        </Text>
        <Text style={styles.policyText}>
          제한: 충전 불가 · Gold+ 최대 {getRankDiscountPercent('master')}% 예약 할인 · 동시 1코트만 예약 ·
          피크({formatPeakHoursLabel(peakHours)}) 1일 {PEAK_TIME_RESERVATION_LIMIT}회
        </Text>
        <Text style={styles.policyHint}>
          예시: 골드 일반 코트 {getReservationCost('gold', false)}P · 중앙 코트{' '}
          {getReservationCost('gold', true)}P
        </Text>
      </Card>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>회원 검색 · 포인트 관리</Text>
        <TextInput
          style={styles.input}
          placeholder="이름 · 학번 검색"
          placeholderTextColor={colors.textMuted}
          value={userQuery}
          onChangeText={setUserQuery}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.userScroll}>
          {filteredUsers.map((u) => (
            <Pressable
              key={u.id}
              onPress={() => setSelectedUserId(u.id === selectedUserId ? null : u.id)}
              style={[styles.userChip, selectedUserId === u.id && styles.userChipActive]}
            >
              <Avatar name={u.name} color={u.avatarColor} size={28} imageUri={u.avatarUri} />
              <View>
                <Text style={styles.userChipName}>{u.name}</Text>
                <Text style={styles.userChipPts}>{u.points}P</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {selectedUser && (
          <View style={styles.selectedBox}>
            <Text style={styles.selectedTitle}>
              {selectedUser.name} · {selectedUser.points}P
              {selectedUser.clubFeeVerifiedAt ? ' · 회비✓' : ' · 회비 미인증'}
            </Text>
            <View style={styles.presetRow}>
              {GRANT_PRESETS.map((p) => (
                <Button
                  key={p.label}
                  title={`${p.label} +${p.amount}`}
                  size="sm"
                  variant="outline"
                  onPress={() => grantToSelected(p.amount, p.type, p.desc)}
                />
              ))}
            </View>
            <View style={styles.actionRow}>
              {!selectedUser.clubFeeVerifiedAt ? (
                <Button
                  title={`회비 인증 (+${POINT_EARN.CLUB_FEE}P)`}
                  size="sm"
                  onPress={() => {
                    const r = adminVerifyClubFee(selectedUser.id, adminId);
                    onToast(r.success ? 'success' : 'warning', r.message);
                  }}
                />
              ) : (
                <Button
                  title="회비 인증 취소"
                  size="sm"
                  variant="danger"
                  onPress={() => {
                    const r = adminRevokeClubFee(selectedUser.id, adminId, revokeReason);
                    onToast(r.success ? 'info' : 'warning', r.message);
                  }}
                />
              )}
            </View>
            <View style={styles.adjustRow}>
              <TextInput
                style={[styles.input, styles.inputSm]}
                placeholder="±포인트"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={customAmount}
                onChangeText={setCustomAmount}
              />
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="사유"
                placeholderTextColor={colors.textMuted}
                value={customReason}
                onChangeText={setCustomReason}
              />
              <Button
                title="조정"
                size="sm"
                onPress={() => {
                  const r = adminAdjustPoints(
                    selectedUser.id,
                    parseInt(customAmount, 10) || 0,
                    customReason
                  );
                  onToast(r.success ? 'success' : 'warning', r.message);
                }}
              />
            </View>
          </View>
        )}
      </Card>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>포인트 TOP 5</Text>
        {topHolders.map((user, i) => (
          <Pressable
            key={user.id}
            onPress={() => setSelectedUserId(user.id)}
            style={styles.itemCard}
          >
            <Text style={styles.rankNum}>{i + 1}</Text>
            <Avatar name={user.name} color={user.avatarColor} size={32} imageUri={user.avatarUri} />
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle}>{user.name}</Text>
              <Text style={styles.itemSub}>{TIER_SHORT[user.membershipTier]}</Text>
            </View>
            <Text style={styles.pointValue}>{user.points.toLocaleString()}P</Text>
          </Pressable>
        ))}
      </Card>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>봉사 인증 (청소 · 네트)</Text>
        {serviceEntries.length === 0 && (
          <Text style={styles.empty}>봉사 인증 기록이 없습니다</Text>
        )}
        {serviceEntries.map((entry) => (
          <View key={entry.id} style={styles.itemCard}>
            <Text style={styles.itemTitle}>
              {entry.userName} · {(entry.kind ?? 'cleaning') === 'net_setup' ? '네트' : '청소'}
            </Text>
            <Text style={styles.itemSub}>
              {entry.area} · +{entry.points}P ·{' '}
              {new Date(entry.submittedAt).toLocaleString('ko-KR')}
            </Text>
            <Button
              title="인증 취소 · 포인트 회수"
              size="sm"
              variant="danger"
              onPress={() => {
                const r =
                  (entry.kind ?? 'cleaning') === 'net_setup'
                    ? adminRevokeNetSetup(entry.id, adminId, revokeReason)
                    : adminRevokeCleaning(entry.id, adminId, revokeReason);
                onToast(r.success ? 'info' : 'warning', r.message);
              }}
            />
          </View>
        ))}
      </Card>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>전체 거래 내역</Text>
        <View style={styles.filterRow}>
          {(['all', 'earned', 'spent', 'revoked'] as TxFilter[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => setTxFilter(f)}
              style={[styles.filterChip, txFilter === f && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, txFilter === f && styles.filterTextActive]}>
                {f === 'all' ? '전체' : f === 'earned' ? '적립' : f === 'spent' ? '사용' : '취소됨'}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="설명 · 회원명 검색"
          placeholderTextColor={colors.textMuted}
          value={txQuery}
          onChangeText={setTxQuery}
        />
        {filteredTx.map((tx) => (
          <TxRow
            key={tx.id}
            tx={tx}
            user={resolveUser(tx.userId)}
            revokeReason={revokeReason}
            onRevoke={(id) => {
              const r = adminRevokeTransaction(id, adminId, revokeReason);
              onToast(r.success ? 'info' : 'warning', r.message);
            }}
          />
        ))}
      </Card>
    </View>
  );
}

const TIER_SHORT: Record<User['membershipTier'], string> = {
  guest: '비회원',
  associate: '준회원',
  full: '정회원',
  admin: '관리자',
};

function TxRow({
  tx,
  user,
  revokeReason,
  onRevoke,
}: {
  tx: PointTransaction;
  user?: User;
  revokeReason: string;
  onRevoke: (id: string) => void;
}) {
  const revoked = Boolean(tx.revokedAt);
  return (
    <View style={[styles.itemCard, revoked && styles.itemRevoked]}>
      <Text style={styles.itemTitle}>
        {user?.name ?? tx.userId}{' '}
        <Text style={tx.amount >= 0 ? styles.positive : styles.negative}>
          {tx.amount >= 0 ? '+' : ''}
          {tx.amount}P
        </Text>
        {revoked && <Text style={styles.revokedTag}> (취소됨)</Text>}
      </Text>
      <Text style={styles.itemSub}>
        [{POINT_TYPE_LABELS[tx.type] ?? tx.type}] {tx.description}
      </Text>
      <Text style={styles.itemSub}>
        {new Date(tx.createdAt).toLocaleString('ko-KR')}
      </Text>
      {!revoked && tx.amount !== 0 && (
        <Button
          title="거래 취소"
          size="sm"
          variant="danger"
          onPress={() => onRevoke(tx.id)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  policyCard: {
    backgroundColor: colors.primaryLight,
    gap: spacing.xs,
  },
  policyTitle: { ...typography.bodyBold, color: colors.primaryDark },
  policyText: { ...typography.small, color: colors.textSecondary, lineHeight: 18 },
  policyHint: { ...typography.small, color: colors.textMuted, marginTop: 4 },
  block: { gap: spacing.sm },
  blockTitle: { ...typography.h3, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: Platform.OS === 'web' ? 10 : spacing.sm,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputSm: { width: 80 },
  inputFlex: { flex: 1 },
  userScroll: { flexGrow: 0 },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  userChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  userChipName: { ...typography.caption, fontWeight: '700', color: colors.text },
  userChipPts: { ...typography.small, color: colors.primary },
  selectedBox: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.sm,
  },
  selectedTitle: { ...typography.bodyBold, color: colors.text },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  adjustRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  itemCard: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  itemRevoked: { opacity: 0.55 },
  rankNum: { ...typography.bodyBold, color: colors.primary, width: 20 },
  itemBody: { flex: 1, minWidth: 100 },
  itemTitle: { ...typography.caption, fontWeight: '700', color: colors.text, flex: 1 },
  itemSub: { ...typography.small, color: colors.textMuted, width: '100%' },
  pointValue: { ...typography.bodyBold, color: colors.primary },
  positive: { color: colors.success },
  negative: { color: colors.error },
  revokedTag: { color: colors.textMuted, fontWeight: '400' },
  empty: { ...typography.caption, color: colors.textMuted },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  filterChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  filterText: { ...typography.small, color: colors.textMuted, fontWeight: '600' },
  filterTextActive: { color: colors.primary },
});
