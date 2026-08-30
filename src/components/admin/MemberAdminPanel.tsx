import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { NumericConfirmModal, type NumericConfirmStep } from '@/src/components/ui/NumericConfirmModal';
import { generateNumericConfirmCode } from '@/src/utils/confirmCode';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { usePointStore } from '@/src/stores/pointStore';
import { useCourtStore } from '@/src/stores/courtStore';
import { useFriendStore } from '@/src/stores/friendStore';
import { useAdminLogStore } from '@/src/stores/adminLogStore';
import { useFeatureFlagsStore } from '@/src/stores/featureFlagsStore';
import { Avatar } from '@/src/components/ui/Avatar';
import { RankBadge } from '@/src/components/ui/RankBadge';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { getEffectiveSchedule } from '@/src/utils/dateFormat';
import { isGuestStudentId } from '@/src/utils/studentId';
import { clubGradeOf, hasAdminRole, isAdminUser, isOwnerUser, roleBadgeLabel } from '@/src/utils/staffAccess';
import { colors, spacing, typography, borderRadius, withAlpha } from '@/src/theme';
import { POINT_EARN } from '@/src/constants/points';
import { RANK_THRESHOLDS, RANK_ORDER } from '@/src/constants';
import type { MembershipTier, MemberStatus, RankTier, User } from '@/src/types';

const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  pending: '승인 대기',
  approved: '승인됨',
  rejected: '거절됨',
  suspended: '정지됨',
};

const MEMBER_STATUS_COLOR: Record<MemberStatus, string> = {
  pending: colors.warning,
  approved: colors.success,
  rejected: colors.error,
  suspended: '#9333EA',
};

const TIER_LABEL: Record<MembershipTier, string> = {
  guest: '게스트',
  associate: '준회원',
  full: '정회원',
  admin: '관리자',
};

const LESSON_LABEL = {
  none: '없음',
  pending: '승인 대기',
  approved: '권한 있음',
  rejected: '거절',
} as const;

type StatusFilter = 'all' | MemberStatus;
type TierFilter = 'all' | MembershipTier;
type SortKey = 'name' | 'recent' | 'points' | 'elo';
type DeleteStep = NumericConfirmStep;

interface MemberAdminPanelProps {
  adminId: string;
  onToast: (type: 'success' | 'warning' | 'info' | 'error', message: string) => void;
}

export function MemberAdminPanel({ adminId, onToast }: MemberAdminPanelProps) {
  const users = useAuthStore((s) => s.users);
  const attendanceRecords = useAuthStore((s) => s.attendanceRecords);
  const approveMember = useAuthStore((s) => s.approveMember);
  const adminSetMembershipTier = useAuthStore((s) => s.adminSetMembershipTier);
  const adminSetAdminRole = useAuthStore((s) => s.adminSetAdminRole);
  const adminSetMemberStatus = useAuthStore((s) => s.adminSetMemberStatus);
  const adminSetLessonStatus = useAuthStore((s) => s.adminSetLessonStatus);
  const adminSetCoach = useAuthStore((s) => s.adminSetCoach);
  const currentUser = useAuthStore((s) => s.currentUser);
  const canManageAdminTier = isAdminUser(currentUser);
  const adminAdjustPoints = useAuthStore((s) => s.adminAdjustPoints);
  const adminVerifyClubFee = useAuthStore((s) => s.adminVerifyClubFee);
  const adminRevokeClubFee = useAuthStore((s) => s.adminRevokeClubFee);
  const adminRevokeTransaction = usePointStore((s) => s.adminRevokeTransaction);
  const adminAdjustElo = useAuthStore((s) => s.adminAdjustElo);
  const adminPlaceRank = useAuthStore((s) => s.adminPlaceRank);
  const adminSetAdminNote = useAuthStore((s) => s.adminSetAdminNote);
  const adminSendSystemNotice = useAuthStore((s) => s.adminSendSystemNotice);
  const adminDeleteAccount = useAuthStore((s) => s.adminDeleteAccount);
  const pointTransactions = usePointStore((s) => s.transactions);
  const courts = useCourtStore((s) => s.courts);
  const getFriendIds = useFriendStore((s) => s.getFriendIds);
  const adminLogs = useAdminLogStore((s) => s.logs);
  const eloOn = useFeatureFlagsStore((s) => s.eloFeaturesEnabled);
  const pointsOn = useFeatureFlagsStore((s) => s.pointsFeaturesEnabled);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [atGymOnly, setAtGymOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [pointDelta, setPointDelta] = useState('');
  const [pointReason, setPointReason] = useState('');
  const [eloDelta, setEloDelta] = useState('');
  const [eloReason, setEloReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('idle');
  const [confirmCode, setConfirmCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  const selected = users.find((u) => u.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) setAdminNote(selected.adminNote ?? '');
    else setAdminNote('');
  }, [selected?.id, selected?.adminNote]);

  const filtered = useMemo(() => {
    let list = [...users];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.studentId.includes(q) ||
          (u.adminNote?.toLowerCase().includes(q) ?? false)
      );
    }
    if (statusFilter !== 'all') list = list.filter((u) => u.memberStatus === statusFilter);
    if (tierFilter !== 'all') list = list.filter((u) => u.membershipTier === tierFilter);
    if (atGymOnly) list = list.filter((u) => u.isAtGym);

    list.sort((a, b) => {
      if (sortKey === 'points') return b.points - a.points;
      if (sortKey === 'elo') return b.elo - a.elo;
      if (sortKey === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.name.localeCompare(b.name, 'ko');
    });
    return list;
  }, [users, query, statusFilter, tierFilter, atGymOnly, sortKey]);

  const selectedCourt = selected
    ? courts.find(
        (c) =>
          c.reservedBy === selected.id ||
          c.players.some((p) => p.userId === selected.id)
      )
    : undefined;

  const memberLogs = useMemo(() => {
    if (!selected) return [];
    return adminLogs
      .filter(
        (l) =>
          l.targetId === selected.id ||
          l.actorId === selected.id ||
          l.message.includes(selected.name)
      )
      .slice(0, 8);
  }, [adminLogs, selected]);

  const memberPoints = useMemo(() => {
    if (!selected) return [];
    return pointTransactions.filter((t) => t.userId === selected.id).slice(0, 6);
  }, [pointTransactions, selected]);

  const notify = (r: { success: boolean; message: string }, type: 'success' | 'warning' = 'success') => {
    onToast(r.success ? type : 'warning', r.message);
  };

  /** 웹에서는 Alert.alert 버튼이 동작하지 않는 경우가 많아 confirm 사용 */
  const confirmRoleChange = (message: string, action: () => void) => {
    if (Platform.OS === 'web') {
      const ok =
        typeof window !== 'undefined' &&
        typeof window.confirm === 'function' &&
        window.confirm(`역할 변경 확인\n\n${message}`);
      if (ok) action();
      return;
    }
    Alert.alert('역할 변경 확인', message, [
      { text: '취소', style: 'cancel' },
      { text: '확인', style: 'destructive', onPress: action },
    ]);
  };

  const closeDeleteFlow = () => {
    setDeleteStep('idle');
    setConfirmCode('');
    setCodeInput('');
  };

  const startDeleteFlow = () => {
    setDeleteStep('confirm');
    setConfirmCode('');
    setCodeInput('');
  };

  const proceedDeleteToCode = () => {
    setConfirmCode(generateNumericConfirmCode());
    setCodeInput('');
    setDeleteStep('code');
  };

  const executeDelete = async () => {
    if (!selected || codeInput !== confirmCode) return;
    setDeleting(true);
    try {
      const result = await adminDeleteAccount(selected.id, adminId);
      onToast(result.success ? 'success' : 'warning', result.message);
      if (result.success) {
        closeDeleteFlow();
        setSelectedId(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'approved', label: '승인' },
    { key: 'pending', label: '대기' },
    { key: 'suspended', label: '정지' },
    { key: 'rejected', label: '거절' },
  ];

  const tierFilters: { key: TierFilter; label: string }[] = [
    { key: 'all', label: '전체 등급' },
    { key: 'associate', label: '준회원' },
    { key: 'full', label: '정회원' },
    { key: 'admin', label: '관리자' },
  ];

  if (selected) {
    const sched = getEffectiveSchedule(selected);
    const friendCount = getFriendIds(selected.id).length;
    const attendanceCount = attendanceRecords.filter((r) => r.userId === selected.id).length;

    return (
      <View style={styles.detailWrap}>
        <Pressable onPress={() => setSelectedId(null)} style={styles.backBtn}>
          <Text style={styles.backText}>← 회원 목록</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
          <Card style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <Avatar name={selected.name} color={selected.avatarColor} size={56} />
              <View style={styles.profileMeta}>
                <View style={styles.nameRow}>
                  <Text style={styles.profileName}>{selected.name}</Text>
                  <RankBadge rank={selected.rank} size="sm" />
                </View>
                <Text style={styles.profileSub}>{selected.studentId}</Text>
                <View style={styles.badgeRow}>
                  <StatusPill status={selected.memberStatus} />
                  <TierPill label={roleBadgeLabel(selected)} />
                  {selected.isAtGym && <View style={styles.onlineDot}><Text style={styles.onlineText}>체육관</Text></View>}
                </View>
              </View>
            </View>
            <View style={styles.statRow}>
              {eloOn ? <MiniStat label="Elo" value={String(selected.elo)} /> : null}
              {pointsOn ? <MiniStat label="포인트" value={`${selected.points}P`} /> : null}
              <MiniStat label="전적" value={`${selected.wins}승 ${selected.losses}패`} />
              <MiniStat label="친구" value={`${friendCount}명`} />
            </View>
            {selected.suspendedReason && (
              <View style={styles.warnBox}>
                <Text style={styles.warnTitle}>정지 사유</Text>
                <Text style={styles.warnText}>{selected.suspendedReason}</Text>
                {selected.suspendedAt && (
                  <Text style={styles.warnMeta}>
                    {new Date(selected.suspendedAt).toLocaleString('ko-KR')}
                  </Text>
                )}
              </View>
            )}
          </Card>

          <Section title="역할 · 등급">
            <Text style={styles.sectionHint}>
              준회원/정회원은 회비 등급입니다. 관리자·운영자는 별도 권한이라 회원 등급을 바꿔도
              빠지지 않습니다. 관리자를 빼려면 관리자 버튼을 다시 누르세요.
            </Text>
            <View style={styles.chipRow}>
              {(['associate', 'full'] as MembershipTier[]).map((tier) => (
                <Chip
                  key={tier}
                  label={TIER_LABEL[tier]}
                  active={clubGradeOf(selected) === tier}
                  onPress={() =>
                    confirmRoleChange(
                      `${selected.name}님을 ${TIER_LABEL[tier]}(으)로 변경할까요? 관리자·운영자 권한은 유지됩니다.`,
                      () => {
                        void adminSetMembershipTier(selected.id, tier).then((r) => notify(r));
                      }
                    )
                  }
                />
              ))}
              {canManageAdminTier ? (
                <Chip
                  label="관리자"
                  active={hasAdminRole(selected)}
                  onPress={() =>
                    confirmRoleChange(
                      hasAdminRole(selected)
                        ? `${selected.name}님의 관리자 권한을 해제할까요?`
                        : `${selected.name}님에게 관리자 권한을 줄까요?`,
                      () => {
                        void adminSetAdminRole(selected.id, !hasAdminRole(selected)).then((r) => notify(r));
                      }
                    )
                  }
                />
              ) : (
                <Text style={styles.sectionHint}>관리자 부여는 관리자 계정으로만 할 수 있어요.</Text>
              )}
            </View>
          </Section>

          <Section title="계정 상태">
            <View style={styles.actionRow}>
              {selected.memberStatus === 'pending' && (
                <Button title="가입 승인" size="sm" variant="secondary" onPress={() => {
                  approveMember(selected.id);
                  onToast('success', `${selected.name}님 가입을 승인했어요.`);
                }} />
              )}
              {selected.memberStatus !== 'approved' && selected.memberStatus !== 'pending' && (
                <Button title="승인 복구" size="sm" variant="secondary" onPress={() =>
                  notify(adminSetMemberStatus(selected.id, 'approved'))
                } />
              )}
              {selected.memberStatus === 'approved' && (
                <Button title="정지" size="sm" variant="danger" onPress={() => {
                  if (!suspendReason.trim()) {
                    onToast('warning', '정지 사유를 입력해 주세요.');
                    return;
                  }
                  notify(adminSetMemberStatus(selected.id, 'suspended', suspendReason));
                }} />
              )}
              {selected.memberStatus === 'suspended' && (
                <Button title="정지 해제" size="sm" variant="secondary" onPress={() =>
                  notify(adminSetMemberStatus(selected.id, 'approved'))
                } />
              )}
              {selected.memberStatus !== 'rejected' && selected.id !== adminId && (
                <Button title="영구 거절" size="sm" variant="outline" onPress={() =>
                  notify(adminSetMemberStatus(selected.id, 'rejected', '운영진 판단'))
                } />
              )}
              {selected.id !== adminId && (
                <Button
                  title="계정 삭제"
                  size="sm"
                  variant="danger"
                  onPress={startDeleteFlow}
                />
              )}
            </View>
            {selected.memberStatus === 'approved' && (
              <TextInput
                style={styles.input}
                placeholder="정지 사유 (정지 버튼 전 입력)"
                placeholderTextColor={colors.textMuted}
                value={suspendReason}
                onChangeText={setSuspendReason}
              />
            )}
          </Section>

          <Section title="레슨 권한">
            <Text style={styles.sectionHint}>현재: {LESSON_LABEL[selected.lessonStatus ?? 'none']}</Text>
            <View style={styles.chipRow}>
              <Chip label="권한 부여" active={selected.lessonStatus === 'approved'} onPress={() =>
                notify(adminSetLessonStatus(selected.id, 'approved'))
              } />
              <Chip label="대기" active={selected.lessonStatus === 'pending'} onPress={() =>
                notify(adminSetLessonStatus(selected.id, 'pending'))
              } />
              <Chip label="거절" active={selected.lessonStatus === 'rejected'} onPress={() =>
                notify(adminSetLessonStatus(selected.id, 'rejected'))
              } />
              <Chip label="초기화" active={selected.lessonStatus === 'none'} onPress={() =>
                notify(adminSetLessonStatus(selected.id, 'none'))
              } />
            </View>
          </Section>

          <Section title="코치 권한">
            <Text style={styles.sectionHint}>
              코치 공지 작성 권한 · 현재: {selected.isCoach ? '코치' : '없음'}
            </Text>
            <View style={styles.chipRow}>
              <Chip
                label="코치 권한 부여"
                active={!!selected.isCoach}
                onPress={() =>
                  confirmRoleChange(`${selected.name}님에게 코치 권한을 부여할까요?`, () =>
                    notify(adminSetCoach(selected.id, true))
                  )
                }
              />
              <Chip
                label="권한 해제"
                active={!selected.isCoach}
                onPress={() =>
                  confirmRoleChange(`${selected.name}님의 코치 권한을 회수할까요?`, () =>
                    notify(adminSetCoach(selected.id, false))
                  )
                }
              />
            </View>
          </Section>

          <Section title="운영자 권한">
            <Text style={styles.sectionHint}>
              운영자 권한은 고정입니다. 이 화면에서 부여하거나 회수하지 않습니다. 현재:{' '}
              {selected.isOperator || isOwnerUser(selected) ? '운영자' : '없음'}
              {isOwnerUser(selected) ? ' (고정 학번)' : ''}
            </Text>
          </Section>

          <Section title={pointsOn ? '동아리비 · 포인트' : '동아리비'}>
            <Text style={styles.sectionHint}>
              {pointsOn
                ? `회비 인증: +${POINT_EARN.CLUB_FEE}P (웰컴 리워드) · 보유 ${selected.points}P`
                : '회비 납부 여부를 기록합니다.'}
              {selected.clubFeeVerifiedAt ? ' · 회비 인증됨' : ''}
            </Text>
            <View style={styles.actionRow}>
              {!selected.clubFeeVerifiedAt && selected.memberStatus === 'approved' && (
                <Button
                  title={pointsOn ? `회비 납부 인증 (+${POINT_EARN.CLUB_FEE}P)` : '회비 납부 인증'}
                  size="sm"
                  onPress={() => notify(adminVerifyClubFee(selected.id, adminId))}
                />
              )}
              {selected.clubFeeVerifiedAt && (
                <Button
                  title="회비 인증 취소"
                  size="sm"
                  variant="danger"
                  onPress={() => notify(adminRevokeClubFee(selected.id, adminId))}
                />
              )}
            </View>
          </Section>

          {pointsOn || eloOn ? (
          <Section title={pointsOn && eloOn ? '포인트 · Elo 조정' : eloOn ? 'Elo 조정' : '포인트 조정'}>
            {pointsOn ? (
            <View style={styles.adjustRow}>
              <TextInput
                style={[styles.input, styles.inputSm]}
                placeholder="±포인트"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={pointDelta}
                onChangeText={setPointDelta}
              />
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="사유"
                placeholderTextColor={colors.textMuted}
                value={pointReason}
                onChangeText={setPointReason}
              />
              <Button title="적용" size="sm" onPress={() =>
                notify(adminAdjustPoints(selected.id, parseInt(pointDelta, 10) || 0, pointReason))
              } />
            </View>
            ) : null}
            {eloOn ? (
            <View style={styles.adjustRow}>
              <TextInput
                style={[styles.input, styles.inputSm]}
                placeholder="±Elo"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={eloDelta}
                onChangeText={setEloDelta}
              />
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="사유"
                placeholderTextColor={colors.textMuted}
                value={eloReason}
                onChangeText={setEloReason}
              />
              <Button title="적용" size="sm" onPress={() =>
                notify(adminAdjustElo(selected.id, parseInt(eloDelta, 10) || 0, eloReason))
              } />
            </View>
            ) : null}
          </Section>
          ) : null}

          {eloOn ? (
          <Section title="시작 랭크 배치">
            <Text style={styles.sectionHint}>
              전반적인 실력에 맞춰 해당 랭크의 시작 점수로 Elo를 설정합니다. 배치 전 기본 시작
              점수는 1000점(실버)입니다.
            </Text>
            <View style={styles.rankGrid}>
              {RANK_ORDER.map((rank) => {
                const active = selected.rank === rank;
                return (
                  <Pressable
                    key={rank}
                    onPress={() => notify(adminPlaceRank(selected.id, rank as RankTier))}
                    style={[
                      styles.rankChip,
                      { borderColor: RANK_THRESHOLDS[rank].color },
                      active && { backgroundColor: `${RANK_THRESHOLDS[rank].color}22` },
                    ]}
                  >
                    <Text style={[styles.rankChipLabel, { color: RANK_THRESHOLDS[rank].color }]}>
                      {RANK_THRESHOLDS[rank].label}
                    </Text>
                    <Text style={styles.rankChipElo}>{RANK_THRESHOLDS[rank].min}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>
          ) : null}

          <Section title="운영 메모">
            <Text style={styles.sectionHint}>회원에게 보이지 않는 내부 메모입니다.</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="주의 사항, 상담 기록 등..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={adminNote}
              onChangeText={setAdminNote}
            />
            <Button title="메모 저장" size="sm" variant="outline" onPress={() =>
              notify(adminSetAdminNote(selected.id, adminNote))
            } />
          </Section>

          <Section title="알림 보내기">
            <TextInput
              style={styles.input}
              placeholder="제목"
              placeholderTextColor={colors.textMuted}
              value={noticeTitle}
              onChangeText={setNoticeTitle}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="내용"
              placeholderTextColor={colors.textMuted}
              multiline
              value={noticeBody}
              onChangeText={setNoticeBody}
            />
            <Button title="시스템 알림 전송" size="sm" variant="secondary" onPress={() =>
              notify(adminSendSystemNotice(selected.id, noticeTitle, noticeBody))
            } />
          </Section>

          <Section title="활동 요약">
            <DetailLine label="가입일" value={new Date(selected.createdAt).toLocaleDateString('ko-KR')} />
            <DetailLine label="누적 출석" value={`${attendanceCount}회`} />
            {pointsOn ? (
              <DetailLine label="청소 기여" value={`${selected.cleaningContributions}회`} />
            ) : null}
            <DetailLine label="피크 예약(오늘)" value={`${selected.peakTimeReservations}회`} />
            {sched.start && (
              <DetailLine
                label="오늘 도착"
                value={`${sched.start}${sched.end ? ` ~ ${sched.end}` : ''}`}
              />
            )}
            {selectedCourt && (
              <DetailLine
                label="코트"
                value={`${selectedCourt.id}번 · ${selectedCourt.status}`}
              />
            )}
          </Section>

          {pointsOn && memberPoints.length > 0 && (
            <Section title="최근 포인트">
              {memberPoints.map((tx) => (
                <View key={tx.id} style={styles.logRow}>
                  <Text style={styles.logLine}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount}P · {tx.description}
                    {tx.revokedAt ? ' (취소됨)' : ''}
                  </Text>
                  {!tx.revokedAt && tx.amount !== 0 && (
                    <Button
                      title="취소"
                      size="sm"
                      variant="ghost"
                      onPress={() =>
                        notify(adminRevokeTransaction(tx.id, adminId))
                      }
                    />
                  )}
                </View>
              ))}
            </Section>
          )}

          {memberLogs.length > 0 && (
            <Section title="관련 로그">
              {memberLogs.map((log) => (
                <Text key={log.id} style={styles.logLine}>
                  {new Date(log.createdAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {log.message}
                </Text>
              ))}
            </Section>
          )}
        </ScrollView>

        <NumericConfirmModal
          visible={deleteStep !== 'idle'}
          step={deleteStep === 'confirm' || deleteStep === 'code' ? deleteStep : 'confirm'}
          title="계정 삭제"
          body={
            selected.membershipTier === 'guest' || isGuestStudentId(selected.studentId)
              ? `${selected.name} 게스트 계정을 삭제합니다. 되돌릴 수 없어요.`
              : `${selected.name} (${selected.studentId}) 계정을 삭제합니다. 같은 학번으로 다시 가입할 수 있어요.`
          }
          codeHint={`아래 10자리 숫자를 그대로 입력하면 ${selected.name}님 계정이 삭제됩니다.`}
          confirmCode={confirmCode}
          codeInput={codeInput}
          onCodeInputChange={setCodeInput}
          onClose={closeDeleteFlow}
          onProceedToCode={proceedDeleteToCode}
          onExecute={() => void executeDelete()}
          executeLabel="계정 삭제"
          executing={deleting}
          executingLabel="삭제 중…"
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.searchInput}
        placeholder="이름 · 학번 · 이메일 · 메모 검색"
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {statusFilters.map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            active={statusFilter === f.key}
            onPress={() => setStatusFilter(f.key)}
          />
        ))}
        <View style={styles.filterDivider} />
        {tierFilters.map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            active={tierFilter === f.key}
            onPress={() => setTierFilter(f.key)}
          />
        ))}
        <Chip label="체육관만" active={atGymOnly} onPress={() => setAtGymOnly((v) => !v)} />
      </ScrollView>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>정렬</Text>
        {(
          [
            ['name', '이름'],
            ['recent', '최근 가입'],
            ...(pointsOn ? ([['points', '포인트']] as [SortKey, string][]) : []),
            ...(eloOn ? ([['elo', 'Elo']] as [SortKey, string][]) : []),
          ] as [SortKey, string][]
        ).map(([key, label]) => (
          <Pressable key={key} onPress={() => setSortKey(key)} style={styles.sortChip}>
            <Text style={[styles.sortChipText, sortKey === key && styles.sortChipActive]}>{label}</Text>
          </Pressable>
        ))}
        <Text style={styles.countLabel}>{filtered.length}명</Text>
      </View>

      {filtered.length === 0 ? (
        <Text style={styles.empty}>조건에 맞는 회원이 없습니다</Text>
      ) : (
        filtered.map((user) => (
          <MemberRow key={user.id} user={user} showPoints={pointsOn} onPress={() => setSelectedId(user.id)} />
        ))
      )}
    </View>
  );
}

function MemberRow({ user, onPress, showPoints }: { user: User; onPress: () => void; showPoints: boolean }) {
  return (
    <Pressable onPress={onPress} style={styles.memberRow}>
      <View style={styles.avatarWrap}>
        <Avatar name={user.name} color={user.avatarColor} size={40} />
        {user.isAtGym && <View style={styles.onlineIndicator} />}
      </View>
      <View style={styles.memberBody}>
        <View style={styles.nameRow}>
          <Text style={styles.memberName}>{user.name}</Text>
          <RankBadge rank={user.rank} size="sm" />
        </View>
        <Text style={styles.memberSub}>{user.studentId}</Text>
        <View style={styles.badgeRow}>
          <StatusPill status={user.memberStatus} small />
          <TierPill label={roleBadgeLabel(user)} small />
          {showPoints ? <Text style={styles.memberPts}>{user.points}P</Text> : null}
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function StatusPill({ status, small }: { status: MemberStatus; small?: boolean }) {
  return (
    <View style={[styles.pill, { backgroundColor: MEMBER_STATUS_COLOR[status] + '22' }, small && styles.pillSm]}>
      <Text style={[styles.pillText, { color: MEMBER_STATUS_COLOR[status] }, small && styles.pillTextSm]}>
        {MEMBER_STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

function TierPill({ label, small }: { label: string; small?: boolean }) {
  const color =
    label === '운영자' || label === '관리자' ? colors.primary : colors.textSecondary;
  return (
    <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }, small && styles.pillSm]}>
      <Text style={[styles.pillText, { color }, small && styles.pillTextSm]}>{label}</Text>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  detailWrap: { flex: 1, gap: spacing.sm },
  detailScroll: { paddingBottom: spacing.xxl, gap: spacing.sm },
  backBtn: { paddingVertical: spacing.xs, ...Platform.select({ web: { cursor: 'pointer' as const } }) },
  backText: { ...typography.button, color: colors.primary, fontSize: 14 },
  searchInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterScroll: { flexGrow: 0, marginBottom: spacing.xs },
  filterDivider: { width: 1, height: 20, backgroundColor: colors.divider, marginHorizontal: 4, alignSelf: 'center' },
  sortRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
  sortLabel: { ...typography.small, color: colors.textMuted, marginRight: 4 },
  sortChip: { paddingHorizontal: 8, paddingVertical: 4, ...Platform.select({ web: { cursor: 'pointer' as const } }) },
  sortChipText: { ...typography.small, color: colors.textMuted },
  sortChipActive: { color: colors.primary, fontWeight: '700' },
  countLabel: { ...typography.small, color: colors.textMuted, marginLeft: 'auto' },
  empty: { ...typography.caption, color: colors.textMuted, paddingVertical: spacing.lg, textAlign: 'center' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  avatarWrap: { position: 'relative' },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surfaceAlt,
  },
  memberBody: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { ...typography.bodyBold, color: colors.text },
  memberSub: { ...typography.caption, color: colors.textMuted },
  memberPts: { ...typography.small, color: colors.primary, fontWeight: '700', marginLeft: 4 },
  chevron: { ...typography.h3, color: colors.textMuted, fontSize: 20 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  pillSm: { paddingHorizontal: 6, paddingVertical: 2 },
  pillText: { ...typography.small, fontWeight: '700', fontSize: 11 },
  pillTextSm: { fontSize: 10 },
  profileCard: { gap: spacing.sm },
  profileHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  profileMeta: { flex: 1, gap: 4 },
  profileName: { ...typography.h3, color: colors.text },
  profileSub: { ...typography.caption, color: colors.textMuted },
  onlineDot: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  onlineText: { ...typography.small, color: colors.success, fontWeight: '700', fontSize: 10 },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  miniStat: {
    minWidth: '22%',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  miniStatValue: { ...typography.bodyBold, color: colors.text, fontSize: 14 },
  miniStatLabel: { ...typography.small, color: colors.textMuted, fontSize: 10 },
  warnBox: {
    backgroundColor: withAlpha('#A78BFA', 0.16),
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    gap: 2,
  },
  warnTitle: { ...typography.small, color: colors.accent, fontWeight: '700' },
  warnText: { ...typography.caption, color: colors.text },
  warnMeta: { ...typography.small, color: colors.textMuted, fontSize: 10 },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.bodyBold, color: colors.text, fontSize: 15 },
  sectionHint: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  chipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipText: { ...typography.small, color: colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: colors.primary },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  adjustRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  rankChip: {
    borderWidth: 1.5,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 60,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  rankChipLabel: { ...typography.caption, fontWeight: '700' },
  rankChipElo: { ...typography.small, color: colors.textMuted, fontSize: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    marginBottom: spacing.xs,
  },
  inputSm: { width: 72 },
  inputFlex: { flex: 1 },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  detailLabel: { ...typography.caption, color: colors.textMuted },
  detailValue: { ...typography.caption, color: colors.text, fontWeight: '600' },
  logLine: { ...typography.small, color: colors.textSecondary, lineHeight: 18, flex: 1 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
