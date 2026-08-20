import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TextInput, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useAppStore } from '@/src/stores/authStore';
import { useFeatureFlagsStore } from '@/src/stores/featureFlagsStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useGeoLocation } from '@/src/hooks/useGeoLocation';
import { getWinRate } from '@/src/services/points';
import { ProfileEmptyState } from '@/src/components/profile/ProfileEmptyState';
import { ProfileAvatarEditor } from '@/src/components/profile/ProfileAvatarEditor';
import { ArrivalScheduleCard } from '@/src/components/profile/ArrivalScheduleCard';
import { RankBadge } from '@/src/components/ui/RankBadge';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { EloChart } from '@/src/components/profile/EloChart';
import { HourlyHeadcountChart } from '@/src/components/profile/HourlyHeadcountChart';
import { MatchHistorySheet } from '@/src/components/profile/MatchHistorySheet';
import { EloRankingSheet } from '@/src/components/profile/EloRankingSheet';
import { AttendanceCard } from '@/src/components/profile/AttendanceCard';
import { LessonApplyCard } from '@/src/components/profile/LessonApplyCard';
import { PointsHistorySheet } from '@/src/components/profile/PointsHistorySheet';
import { GuestProfileCard } from '@/src/components/profile/GuestProfileCard';
import { PageContainer } from '@/src/components/layout/PageContainer';
import { NumericConfirmModal, type NumericConfirmStep } from '@/src/components/ui/NumericConfirmModal';
import { generateNumericConfirmCode } from '@/src/utils/confirmCode';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { CLEANING_AREAS } from '@/src/constants';
import { NET_SETUP_AREAS, SHUTTLECOCK_CARRY_AREAS, POINT_EARN, POINT_SPEND } from '@/src/constants/points';
import { colors, spacing, typography, borderRadius, shadows, glass } from '@/src/theme';

export default function ProfileScreen() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const deleteMyAccount = useAuthStore((s) => s.deleteMyAccount);
  const updateUserProfile = useAuthStore((s) => s.updateUserProfile);
  const checkGeoFence = useAppStore((s) => s.checkGeoFence);
  const cleaningLeaderboard = useNotificationStore((s) => s.cleaningLeaderboard);
  const submitCleaning = useNotificationStore((s) => s.submitCleaning);
  const submitNetSetup = useNotificationStore((s) => s.submitNetSetup);
  const submitShuttlecockCarry = useNotificationStore((s) => s.submitShuttlecockCarry);
  const claimShuttlecock = useAuthStore((s) => s.claimShuttlecock);
  const showToast = useNotificationStore((s) => s.showToast);
  const { isMobile, isNarrow, scale, scaledTypography, scaledSpacing } = useLayoutMode();
  const isGuest = useAuthStore((s) => s.isGuestSession);
  const eloOn = useFeatureFlagsStore((s) => s.eloFeaturesEnabled);
  useGeoLocation();

  const [showCleaning, setShowCleaning] = useState(false);
  const [showNetSetup, setShowNetSetup] = useState(false);
  const [showPointsHistory, setShowPointsHistory] = useState(false);
  const [showMatchHistory, setShowMatchHistory] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [selectedArea, setSelectedArea] = useState(CLEANING_AREAS[0]);
  const [selectedNetArea, setSelectedNetArea] = useState<string>(NET_SETUP_AREAS[0]);
  const [showCockCarry, setShowCockCarry] = useState(false);
  const [selectedCockArea, setSelectedCockArea] = useState<string>(SHUTTLECOCK_CARRY_AREAS[0]);
  const [participantCount, setParticipantCount] = useState('1');
  const [deleteStep, setDeleteStep] = useState<NumericConfirmStep>('idle');
  const [deleteConfirmCode, setDeleteConfirmCode] = useState('');
  const [deleteCodeInput, setDeleteCodeInput] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const closeDeleteFlow = () => {
    setDeleteStep('idle');
    setDeleteConfirmCode('');
    setDeleteCodeInput('');
  };

  const startDeleteFlow = () => {
    setDeleteStep('confirm');
    setDeleteConfirmCode('');
    setDeleteCodeInput('');
  };

  const proceedDeleteToCode = () => {
    setDeleteConfirmCode(generateNumericConfirmCode());
    setDeleteCodeInput('');
    setDeleteStep('code');
  };

  const executeDeleteAccount = async () => {
    if (deleteCodeInput !== deleteConfirmCode) return;
    setDeletingAccount(true);
    try {
      const result = await deleteMyAccount();
      showToast({
        type: result.success ? 'info' : 'warning',
        title: '',
        message: result.message,
      });
      if (result.success) {
        closeDeleteFlow();
        router.replace('/login');
      }
    } finally {
      setDeletingAccount(false);
    }
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>로그인이 필요합니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isGuest) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <PageContainer>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              isMobile && { padding: scaledSpacing.md, paddingBottom: spacing.xxl },
            ]}
          >
            <GuestProfileCard
              name={currentUser.name}
              avatarColor={currentUser.avatarColor}
              onLogout={() => {
                void logout().then(() => router.replace('/login'));
              }}
            />
          </ScrollView>
        </PageContainer>
      </SafeAreaView>
    );
  }

  const winRate = getWinRate(currentUser.wins, currentUser.losses);
  const hasGameStats = currentUser.totalGames > 0;
  const cleaningEntries = cleaningLeaderboard
    .filter((e) => !e.revokedAt && (e.kind ?? 'cleaning') === 'cleaning')
    .slice(0, 5);

  const handleCleaningSubmit = () => {
    if (!checkGeoFence()) {
      showToast({
        type: 'error',
        title: '위치 인증 필요',
        message: '체육관에서만 청소 인증이 가능해요!',
      });
      return;
    }
    submitCleaning({
      userId: currentUser.id,
      userName: currentUser.name,
      area: selectedArea,
      participantCount: parseInt(participantCount, 10) || 1,
    });
    setShowCleaning(false);
    showToast({
      type: 'success',
      title: '청소 인증 완료!',
      message: `+${POINT_EARN.CLEANING}P · 기여해주셔서 감사합니다 🧹`,
    });
  };

  const handleNetSetupSubmit = () => {
    if (!checkGeoFence()) {
      showToast({
        type: 'error',
        title: '위치 인증 필요',
        message: '체육관에서만 네트 인증이 가능해요!',
      });
      return;
    }
    submitNetSetup({
      userId: currentUser.id,
      userName: currentUser.name,
      area: selectedNetArea,
      participantCount: parseInt(participantCount, 10) || 1,
    });
    setShowNetSetup(false);
    showToast({
      type: 'success',
      title: '네트 인증 완료!',
      message: `+${POINT_EARN.NET_SETUP}P · 수고하셨습니다 🥅`,
    });
  };

  const handleCockCarrySubmit = () => {
    if (!checkGeoFence()) {
      showToast({
        type: 'error',
        title: '위치 인증 필요',
        message: '체육관에서만 콕 운반 인증이 가능해요!',
      });
      return;
    }
    submitShuttlecockCarry({
      userId: currentUser.id,
      userName: currentUser.name,
      area: selectedCockArea,
      participantCount: parseInt(participantCount, 10) || 1,
    });
    setShowCockCarry(false);
    showToast({
      type: 'success',
      title: '콕 운반 인증 완료!',
      message: `+${POINT_EARN.NET_SETUP}P · 감사합니다 🏸`,
    });
  };

  const handleShuttlecockClaim = () => {
    if (!checkGeoFence()) {
      showToast({
        type: 'error',
        title: '위치 인증 필요',
        message: '체육관에서만 셔틀콕을 수령할 수 있어요!',
      });
      return;
    }
    const r = claimShuttlecock(currentUser.id);
    showToast({
      type: r.success ? 'success' : 'warning',
      title: r.success ? '셔틀콕 수령' : '',
      message: r.message,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <PageContainer>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isMobile && { padding: scaledSpacing.md, paddingBottom: spacing.xxl },
        ]}
      >
        <View
          style={[
            styles.profileHeader,
            isMobile && styles.profileHeaderMobile,
            isNarrow && styles.profileHeaderNarrow,
          ]}
        >
          <ProfileAvatarEditor
            name={currentUser.name}
            color={currentUser.avatarColor}
            imageUri={currentUser.avatarUri}
            size={isNarrow ? Math.round(56 * scale) : isMobile ? Math.round(64 * scale) : 88}
            compact={isMobile}
            onChange={(uri) => {
              void (async () => {
                const result = await updateUserProfile(currentUser.id, { avatarUri: uri });
                showToast({
                  type: result.success ? 'success' : 'warning',
                  title: '',
                  message: result.message,
                });
              })();
            }}
          />
          <View style={styles.profileInfo}>
            <Text
              style={[
                styles.name,
                isMobile && {
                  fontSize: scaledTypography.h3.fontSize,
                  lineHeight: scaledTypography.h3.lineHeight,
                },
              ]}
              numberOfLines={1}
            >
              {currentUser.name}
            </Text>
            <Text style={[styles.studentId, isMobile && { fontSize: scaledTypography.caption.fontSize }]}>
              {currentUser.studentId}
            </Text>
            <View style={styles.badges}>
              {eloOn ? <RankBadge rank={currentUser.rank} size="lg" /> : null}
              <View style={styles.tierBadge}>
                <Text style={styles.tierText}>
                  {currentUser.membershipTier === 'full' ? '정회원' : currentUser.membershipTier === 'associate' ? '준회원' : '비회원'}
                </Text>
              </View>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            style={styles.settingsBtn}
            accessibilityRole="button"
            accessibilityLabel="설정"
          >
            <Ionicons name="settings-outline" size={22} color={colors.primary} />
            <Text style={styles.settingsBtnText}>설정</Text>
          </Pressable>
        </View>

        <View style={[styles.statsGrid, isMobile && styles.statsGridMobile]}>
          {eloOn ? (
          <Pressable
            onPress={() => setShowRanking(true)}
            style={({ pressed }) => [
              styles.statCard,
              isMobile && styles.statCardMobile,
              styles.statCardPressable,
              pressed && styles.statCardPressed,
            ]}
          >
            <Text style={[styles.statValue, isMobile && statValueMobile(scaledTypography)]}>{currentUser.elo}</Text>
            <Text style={[styles.statLabel, isMobile && styles.statLabelMobile]}>Elo</Text>
            <Text style={styles.statHint}>순위표 보기</Text>
          </Pressable>
          ) : null}
          <Card style={[styles.statCard, isMobile && styles.statCardMobile]}>
            <Text style={[styles.statValue, isMobile && statValueMobile(scaledTypography)]}>{hasGameStats ? `${winRate}%` : '—'}</Text>
            <Text style={[styles.statLabel, isMobile && styles.statLabelMobile]}>승률</Text>
          </Card>
          <Pressable
            onPress={() => setShowPointsHistory(true)}
            style={({ pressed }) => [
              styles.statCard,
              isMobile && styles.statCardMobile,
              styles.statCardPressable,
              pressed && styles.statCardPressed,
            ]}
          >
            <Text style={[styles.statValue, isMobile && statValueMobile(scaledTypography)]}>{currentUser.points}P</Text>
            <Text style={[styles.statLabel, isMobile && styles.statLabelMobile]}>포인트</Text>
            <Text style={styles.statHint}>내역 보기</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowMatchHistory(true)}
            style={({ pressed }) => [
              styles.statCard,
              isMobile && styles.statCardMobile,
              styles.statCardPressable,
              pressed && styles.statCardPressed,
            ]}
          >
            <Text style={[styles.statValue, isMobile && statValueMobile(scaledTypography)]}>{currentUser.totalGames}</Text>
            <Text style={[styles.statLabel, isMobile && styles.statLabelMobile]}>총 게임</Text>
            <Text style={styles.statHint}>전적 보기</Text>
          </Pressable>
        </View>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>오늘 도착 일정</Text>
          <ArrivalScheduleCard />
        </Card>

        <Card style={styles.section}>
          <AttendanceCard />
        </Card>

        <Card style={styles.section}>
          <LessonApplyCard />
        </Card>

        <View style={[styles.chartsRow, isNarrow && styles.chartsCol]}>
          {eloOn ? (
          <Card style={[styles.section, styles.chartCard]}>
            <EloChart data={[]} height={280} />
          </Card>
          ) : null}
          <Card style={[styles.section, styles.chartCard]}>
            <HourlyHeadcountChart cellHeight={48} />
          </Card>
        </View>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>🧹 봉사 · 소모품</Text>
          <Text style={styles.sectionHint}>
            청소 +{POINT_EARN.CLEANING}P · 네트 +{POINT_EARN.NET_SETUP}P · 셔틀콕 -{POINT_SPEND.SHUTTLECOCK}P
          </Text>
          {cleaningEntries.length === 0 ? (
            <ProfileEmptyState message="아직 청소 인증 기록이 없어요" />
          ) : (
            cleaningEntries.map((entry, idx) => (
            <View key={entry.id} style={styles.leaderRow}>
              <Text style={styles.rank}>{idx + 1}</Text>
              <Text style={styles.leaderName}>{entry.userName}</Text>
              <Text style={styles.leaderArea}>{entry.area}</Text>
              <Text style={styles.leaderPts}>+{entry.points}P</Text>
            </View>
            ))
          )}
          <View style={styles.serviceActions}>
            <Button
              title={`청소 인증 (+${POINT_EARN.CLEANING}P)`}
              onPress={() => setShowCleaning(true)}
              fullWidth
              variant="outline"
            />
            <Button
              title={`네트 설치·철거 (+${POINT_EARN.NET_SETUP}P)`}
              onPress={() => setShowNetSetup(true)}
              fullWidth
              variant="outline"
            />
            <Button
              title={`콕 운반 (동방) (+${POINT_EARN.NET_SETUP}P)`}
              onPress={() => setShowCockCarry(true)}
              fullWidth
              variant="outline"
            />
            <Button
              title={`셔틀콕 수령 (-${POINT_SPEND.SHUTTLECOCK}P)`}
              onPress={handleShuttlecockClaim}
              fullWidth
              variant="secondary"
            />
          </View>
        </Card>

        <Button
          title="로그아웃"
          onPress={() => {
            void logout().then(() => router.replace('/login'));
          }}
          fullWidth
          variant="ghost"
          style={{ marginTop: spacing.md }}
        />
        <Pressable
          onPress={startDeleteFlow}
          style={styles.deleteAccountBtn}
          accessibilityRole="button"
        >
          <Text style={styles.deleteAccountText}>계정 삭제</Text>
        </Pressable>
      </ScrollView>
      </PageContainer>

      {showPointsHistory && (
        <PointsHistorySheet
          visible={showPointsHistory}
          userId={currentUser.id}
          balance={currentUser.points}
          onClose={() => setShowPointsHistory(false)}
        />
      )}

      {showMatchHistory && (
        <MatchHistorySheet
          visible={showMatchHistory}
          userId={currentUser.id}
          totalGames={currentUser.totalGames}
          wins={currentUser.wins}
          losses={currentUser.losses}
          onClose={() => setShowMatchHistory(false)}
        />
      )}

      {showRanking && eloOn && (
        <EloRankingSheet
          visible={showRanking}
          currentUserId={currentUser.id}
          onClose={() => setShowRanking(false)}
        />
      )}

      {showNetSetup && (
        <View style={styles.cleaningModal}>
          <View style={styles.cleaningSheet}>
            <Text style={styles.modalTitle}>네트 설치 · 철거 인증</Text>
            <Text style={styles.label}>작업 선택</Text>
            <View style={styles.areaGrid}>
              {NET_SETUP_AREAS.map((area) => (
                <Pressable
                  key={area}
                  onPress={() => setSelectedNetArea(area)}
                  style={[styles.areaChip, selectedNetArea === area && styles.areaChipActive]}
                >
                  <Text style={[styles.areaText, selectedNetArea === area && styles.areaTextActive]}>
                    {area}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>참여 인원</Text>
            <TextInput
              style={styles.input}
              value={participantCount}
              onChangeText={setParticipantCount}
              keyboardType="number-pad"
            />
            <View style={styles.modalActions}>
              <Button title="취소" onPress={() => setShowNetSetup(false)} variant="ghost" />
              <Button title="인증 제출" onPress={handleNetSetupSubmit} variant="secondary" />
            </View>
          </View>
        </View>
      )}
      {showCockCarry && (
        <View style={styles.cleaningModal}>
          <View style={styles.cleaningSheet}>
            <Text style={styles.modalTitle}>셔틀콕 운반 인증</Text>
            <Text style={styles.label}>작업 선택</Text>
            <View style={styles.areaGrid}>
              {SHUTTLECOCK_CARRY_AREAS.map((area) => (
                <Pressable
                  key={area}
                  onPress={() => setSelectedCockArea(area)}
                  style={[styles.areaChip, selectedCockArea === area && styles.areaChipActive]}
                >
                  <Text style={[styles.areaText, selectedCockArea === area && styles.areaTextActive]}>
                    {area}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>참여 인원</Text>
            <TextInput
              style={styles.input}
              value={participantCount}
              onChangeText={setParticipantCount}
              keyboardType="number-pad"
            />
            <View style={styles.modalActions}>
              <Button title="취소" onPress={() => setShowCockCarry(false)} variant="ghost" />
              <Button title="인증 제출" onPress={handleCockCarrySubmit} variant="secondary" />
            </View>
          </View>
        </View>
      )}
      {showCleaning && (
        <View style={styles.cleaningModal}>
          <View style={styles.cleaningSheet}>
            <Text style={styles.modalTitle}>청소 인증</Text>
            <Text style={styles.label}>구역 선택</Text>
            <View style={styles.areaGrid}>
              {CLEANING_AREAS.map((area) => (
                <Pressable
                  key={area}
                  onPress={() => setSelectedArea(area)}
                  style={[styles.areaChip, selectedArea === area && styles.areaChipActive]}
                >
                  <Text style={[styles.areaText, selectedArea === area && styles.areaTextActive]}>
                    {area}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>참여 인원</Text>
            <TextInput
              style={styles.input}
              value={participantCount}
              onChangeText={setParticipantCount}
              keyboardType="number-pad"
            />
            <View style={styles.modalActions}>
              <Button title="취소" onPress={() => setShowCleaning(false)} variant="ghost" />
              <Button title="인증 제출" onPress={handleCleaningSubmit} variant="secondary" />
            </View>
          </View>
        </View>
      )}

      <NumericConfirmModal
        visible={deleteStep !== 'idle'}
        step={deleteStep === 'confirm' || deleteStep === 'code' ? deleteStep : 'confirm'}
        title="계정 삭제"
        body="계정을 삭제하면 전적·포인트 기록이 사라지고, 같은 학번으로 다시 가입할 수 있어요."
        codeHint="아래 10자리 숫자를 그대로 입력하면 계정이 삭제됩니다."
        confirmCode={deleteConfirmCode}
        codeInput={deleteCodeInput}
        onCodeInputChange={setDeleteCodeInput}
        onClose={closeDeleteFlow}
        onProceedToCode={proceedDeleteToCode}
        onExecute={() => void executeDeleteAccount()}
        executeLabel="계정 삭제"
        executing={deletingAccount}
        executingLabel="삭제 중…"
      />
    </SafeAreaView>
  );
}

function statValueMobile(scaledTypography: ReturnType<typeof useLayoutMode>['scaledTypography']) {
  return {
    fontSize: scaledTypography.bodyBold.fontSize,
    lineHeight: scaledTypography.bodyBold.lineHeight,
  } as const;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted },
  deleteAccountBtn: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  deleteAccountText: {
    ...typography.small,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  profileHeader: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  profileHeaderMobile: {
    gap: spacing.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  profileHeaderNarrow: {
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  profileInfo: { flex: 1, justifyContent: 'center' },
  settingsBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  settingsBtnText: { ...typography.small, color: colors.primary, fontWeight: '700' },
  name: { ...typography.h2, color: colors.text },
  studentId: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  badges: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  tierBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.xs,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tierText: { ...typography.small, color: colors.primary },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statsGridMobile: { marginBottom: spacing.md },
  statCard: {
    // space-between 기준 고정 2열 — 좁은 화면에서도 세로로 무너지지 않음
    width: '48%',
    marginBottom: spacing.md,
    alignItems: 'center',
    padding: spacing.lg,
  },
  statCardMobile: { padding: spacing.sm, marginBottom: spacing.sm },
  statCardPressable: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    ...shadows.sm,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  statCardPressed: { opacity: 0.85 },
  statHint: { ...typography.small, color: colors.primary, marginTop: 2, fontSize: 10 },
  statValue: { ...typography.h2, color: colors.text },
  statLabel: { ...typography.label, color: colors.textMuted, marginTop: spacing.xs, textTransform: 'none' },
  statLabelMobile: { fontSize: 11, marginTop: 2 },
  section: { marginBottom: spacing.lg },
  chartsRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'stretch' },
  chartsCol: { flexDirection: 'column', gap: 0 },
  chartCard: { flex: 1, minWidth: 0 },
  sectionTitle: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.md, fontSize: 16 },
  sectionHint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  serviceActions: { gap: spacing.sm, marginTop: spacing.md },
  scheduleHint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scheduleInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  scheduleSep: { ...typography.body, color: colors.textMuted },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rank: { ...typography.bodyBold, color: colors.primary, width: 24 },
  leaderName: { ...typography.body, color: colors.text, flex: 1 },
  leaderArea: { ...typography.caption, color: colors.textMuted },
  leaderPts: { ...typography.caption, color: colors.accent, fontWeight: '700' },
  cleaningModal: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  cleaningSheet: {
    ...glass.sheet,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  label: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.sm },
  areaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  areaChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  areaChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  areaText: { ...typography.caption, color: colors.text },
  areaTextActive: { color: colors.textLight },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
});
