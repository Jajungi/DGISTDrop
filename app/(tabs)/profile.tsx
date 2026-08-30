import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TextInput, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useAppStore } from '@/src/stores/authStore';
import { useFeatureFlagsStore } from '@/src/stores/featureFlagsStore';
import { roleBadgeLabel } from '@/src/utils/staffAccess';
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
import { useI18n } from '@/src/i18n/useI18n';
import { useLocaleStore } from '@/src/stores/localeStore';
import {
  getCleaningAreaLabels,
  getNetAreaLabels,
  getShuttlecockCarryAreaLabels,
} from '@/src/i18n/volunteerAreas';
import { colors, spacing, typography, borderRadius, shadows, glass } from '@/src/theme';

export default function ProfileScreen() {
  const locale = useLocaleStore((s) => s.locale);
  const { t } = useI18n();
  const cleaningLabels = useMemo(() => getCleaningAreaLabels(locale), [locale]);
  const netLabels = useMemo(() => getNetAreaLabels(locale), [locale]);
  const shuttlecockLabels = useMemo(() => getShuttlecockCarryAreaLabels(locale), [locale]);
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
  const pointsOn = useFeatureFlagsStore((s) => s.pointsFeaturesEnabled);
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
          <Text style={styles.emptyText}>{t('settings.loginRequired')}</Text>
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
        title: t('profile.geoTitle'),
        message: t('profile.geoCleaningOnly'),
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
      title: t('profile.cleaningSuccessTitle'),
      message: t('profile.cleaningSuccessMessage', { points: POINT_EARN.CLEANING }),
    });
  };

  const handleNetSetupSubmit = () => {
    if (!checkGeoFence()) {
      showToast({
        type: 'error',
        title: t('profile.geoTitle'),
        message: t('profile.geoNetOnly'),
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
      title: t('profile.netSuccessTitle'),
      message: t('profile.netSuccessMessage', { points: POINT_EARN.NET_SETUP }),
    });
  };

  const handleCockCarrySubmit = () => {
    if (!checkGeoFence()) {
      showToast({
        type: 'error',
        title: t('profile.geoTitle'),
        message: t('profile.geoShuttlecockCarryOnly'),
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
      title: t('profile.shuttlecockCarrySuccessTitle'),
      message: t('profile.shuttlecockCarrySuccessMessage', { points: POINT_EARN.NET_SETUP }),
    });
  };

  const handleShuttlecockClaim = () => {
    if (!checkGeoFence()) {
      showToast({
        type: 'error',
        title: t('profile.geoTitle'),
        message: t('profile.geoShuttlecockClaimOnly'),
      });
      return;
    }
    const r = claimShuttlecock(currentUser.id);
    showToast({
      type: r.success ? 'success' : 'warning',
      title: r.success ? t('profile.shuttlecockClaimTitle') : '',
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
                  {roleBadgeLabel(currentUser)}
                </Text>
              </View>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            style={styles.settingsBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.settings')}
          >
            <Ionicons name="settings-outline" size={22} color={colors.primary} />
            <Text style={styles.settingsBtnText}>{t('common.settings')}</Text>
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
            <Text style={styles.statHint}>{t('profile.viewRanking')}</Text>
          </Pressable>
          ) : null}
          <Card style={[styles.statCard, isMobile && styles.statCardMobile]}>
            <Text style={[styles.statValue, isMobile && statValueMobile(scaledTypography)]}>{hasGameStats ? `${winRate}%` : '—'}</Text>
            <Text style={[styles.statLabel, isMobile && styles.statLabelMobile]}>{t('profile.winRate')}</Text>
          </Card>
          {pointsOn ? (
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
            <Text style={[styles.statLabel, isMobile && styles.statLabelMobile]}>{t('profile.points')}</Text>
            <Text style={styles.statHint}>{t('profile.viewHistory')}</Text>
          </Pressable>
          ) : null}
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
            <Text style={[styles.statLabel, isMobile && styles.statLabelMobile]}>{t('profile.totalGames')}</Text>
            <Text style={styles.statHint}>{t('profile.viewMatches')}</Text>
          </Pressable>
        </View>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.sectionAttendance')}</Text>
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

        {pointsOn ? (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.volunteerTitle')}</Text>
          <Text style={styles.sectionHint}>
            {t('profile.volunteerPointsHint', {
              cleaning: POINT_EARN.CLEANING,
              net: POINT_EARN.NET_SETUP,
              shuttlecock: POINT_SPEND.SHUTTLECOCK,
            })}
          </Text>
          {cleaningEntries.length === 0 ? (
            <ProfileEmptyState message={t('profile.volunteerEmptyLeaderboard')} />
          ) : (
            cleaningEntries.map((entry, idx) => (
            <View key={entry.id} style={styles.leaderRow}>
              <Text style={styles.rank}>{idx + 1}</Text>
              <Text style={styles.leaderName}>{entry.userName}</Text>
              <Text style={styles.leaderArea}>{entry.area}</Text>
              {pointsOn ? <Text style={styles.leaderPts}>+{entry.points}P</Text> : null}
            </View>
            ))
          )}
          <View style={styles.serviceActions}>
            <Button
              title={t('profile.volunteerCleaning', { points: POINT_EARN.CLEANING })}
              onPress={() => setShowCleaning(true)}
              fullWidth
              variant="outline"
            />
            <Button
              title={t('profile.volunteerNet', { points: POINT_EARN.NET_SETUP })}
              onPress={() => setShowNetSetup(true)}
              fullWidth
              variant="outline"
            />
            <Button
              title={t('profile.volunteerShuttlecockCarry', { points: POINT_EARN.NET_SETUP })}
              onPress={() => setShowCockCarry(true)}
              fullWidth
              variant="outline"
            />
            <Button
              title={t('profile.volunteerShuttlecockClaim', { points: POINT_SPEND.SHUTTLECOCK })}
              onPress={handleShuttlecockClaim}
              fullWidth
              variant="secondary"
            />
          </View>
        </Card>
        ) : null}

        <Button
          title={t('common.logout')}
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
          <Text style={styles.deleteAccountText}>{t('profile.deleteAccount')}</Text>
        </Pressable>
      </ScrollView>
      </PageContainer>

      {showPointsHistory && pointsOn && (
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

      {pointsOn && showNetSetup && (
        <View style={styles.cleaningModal}>
          <View style={styles.cleaningSheet}>
            <Text style={styles.modalTitle}>{t('profile.modalNetTitle')}</Text>
            <Text style={styles.label}>{t('profile.modalTaskSelect')}</Text>
            <View style={styles.areaGrid}>
              {NET_SETUP_AREAS.map((area, i) => (
                <Pressable
                  key={area}
                  onPress={() => setSelectedNetArea(area)}
                  style={[styles.areaChip, selectedNetArea === area && styles.areaChipActive]}
                >
                  <Text style={[styles.areaText, selectedNetArea === area && styles.areaTextActive]}>
                    {netLabels[i]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>{t('profile.modalParticipantCount')}</Text>
            <TextInput
              style={styles.input}
              value={participantCount}
              onChangeText={setParticipantCount}
              keyboardType="number-pad"
            />
            <View style={styles.modalActions}>
              <Button title={t('common.cancel')} onPress={() => setShowNetSetup(false)} variant="ghost" />
              <Button title={t('common.submit')} onPress={handleNetSetupSubmit} variant="secondary" />
            </View>
          </View>
        </View>
      )}
      {pointsOn && showCockCarry && (
        <View style={styles.cleaningModal}>
          <View style={styles.cleaningSheet}>
            <Text style={styles.modalTitle}>{t('profile.modalShuttlecockCarryTitle')}</Text>
            <Text style={styles.label}>{t('profile.modalTaskSelect')}</Text>
            <View style={styles.areaGrid}>
              {SHUTTLECOCK_CARRY_AREAS.map((area, i) => (
                <Pressable
                  key={area}
                  onPress={() => setSelectedCockArea(area)}
                  style={[styles.areaChip, selectedCockArea === area && styles.areaChipActive]}
                >
                  <Text style={[styles.areaText, selectedCockArea === area && styles.areaTextActive]}>
                    {shuttlecockLabels[i]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>{t('profile.modalParticipantCount')}</Text>
            <TextInput
              style={styles.input}
              value={participantCount}
              onChangeText={setParticipantCount}
              keyboardType="number-pad"
            />
            <View style={styles.modalActions}>
              <Button title={t('common.cancel')} onPress={() => setShowCockCarry(false)} variant="ghost" />
              <Button title={t('common.submit')} onPress={handleCockCarrySubmit} variant="secondary" />
            </View>
          </View>
        </View>
      )}
      {pointsOn && showCleaning && (
        <View style={styles.cleaningModal}>
          <View style={styles.cleaningSheet}>
            <Text style={styles.modalTitle}>{t('profile.modalCleaningTitle')}</Text>
            <Text style={styles.label}>{t('profile.modalAreaSelect')}</Text>
            <View style={styles.areaGrid}>
              {CLEANING_AREAS.map((area, i) => (
                <Pressable
                  key={area}
                  onPress={() => setSelectedArea(area)}
                  style={[styles.areaChip, selectedArea === area && styles.areaChipActive]}
                >
                  <Text style={[styles.areaText, selectedArea === area && styles.areaTextActive]}>
                    {cleaningLabels[i]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>{t('profile.modalParticipantCount')}</Text>
            <TextInput
              style={styles.input}
              value={participantCount}
              onChangeText={setParticipantCount}
              keyboardType="number-pad"
            />
            <View style={styles.modalActions}>
              <Button title={t('common.cancel')} onPress={() => setShowCleaning(false)} variant="ghost" />
              <Button title={t('common.submit')} onPress={handleCleaningSubmit} variant="secondary" />
            </View>
          </View>
        </View>
      )}

      <NumericConfirmModal
        visible={deleteStep !== 'idle'}
        step={deleteStep === 'confirm' || deleteStep === 'code' ? deleteStep : 'confirm'}
        title={t('profile.deleteAccount')}
        body={t('profile.deleteAccountBody')}
        codeHint={t('profile.deleteAccountCodeHint')}
        confirmCode={deleteConfirmCode}
        codeInput={deleteCodeInput}
        onCodeInputChange={setDeleteCodeInput}
        onClose={closeDeleteFlow}
        onProceedToCode={proceedDeleteToCode}
        onExecute={() => void executeDeleteAccount()}
        executeLabel={t('profile.deleteAccount')}
        executing={deletingAccount}
        executingLabel={t('profile.deleteAccountExecuting')}
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
    backgroundColor: colors.surfaceAlt,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
});
