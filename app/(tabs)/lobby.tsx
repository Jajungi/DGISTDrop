import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TextInput,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLobbyStore } from '@/src/stores/lobbyStore';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { TeamRoomCard } from '@/src/components/lobby/TeamRoomCard';
import { TeamCourtReserveModal } from '@/src/components/lobby/TeamCourtReserveModal';
import { useCourtStore } from '@/src/stores/courtStore';
import { ActivityNoticeBanner } from '@/src/components/guide/ActivityNoticeBanner';
import { ClubEventBanner } from '@/src/components/guide/ClubEventBanner';
import { SystemNoticeBanner } from '@/src/components/guide/SystemNoticeBanner';
import { PageContainer } from '@/src/components/layout/PageContainer';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { Button } from '@/src/components/ui/Button';
import { Toggle } from '@/src/components/ui/Toggle';
import { RANK_ORDER, RANK_THRESHOLDS } from '@/src/constants';
import { getRankIndex } from '@/src/services/elo';
import { useFeatureFlagsStore } from '@/src/stores/featureFlagsStore';
import type { RankTier } from '@/src/types';
import { colors, spacing, typography, borderRadius, glass } from '@/src/theme';
import { useI18n } from '@/src/i18n/useI18n';

export default function LobbyScreen() {
  const { t } = useI18n();

  const rooms = useLobbyStore((s) => s.rooms);
  const requestJoinRoom = useLobbyStore((s) => s.requestJoinRoom);
  const acceptJoinRequest = useLobbyStore((s) => s.acceptJoinRequest);
  const rejectJoinRequest = useLobbyStore((s) => s.rejectJoinRequest);
  const createRoom = useLobbyStore((s) => s.createRoom);
  const leaveRoom = useLobbyStore((s) => s.leaveRoom);
  const markRoomReserved = useLobbyStore((s) => s.markRoomReserved);
  const expireStaleRooms = useLobbyStore((s) => s.expireStaleRooms);
  const courts = useCourtStore((s) => s.courts);
  const reserveCourtForTeam = useCourtStore((s) => s.reserveCourtForTeam);
  const currentUser = useAuthStore((s) => s.currentUser);
  const isGuest = useAuthStore((s) => s.isGuestSession);
  const showToast = useNotificationStore((s) => s.showToast);
  const eloOn = useFeatureFlagsStore((s) => s.eloFeaturesEnabled);

  const [showCreate, setShowCreate] = useState(false);
  const [roomTitle, setRoomTitle] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const [useRankLimit, setUseRankLimit] = useState(false);
  const [minRank, setMinRank] = useState<RankTier | null>(null);
  const [maxRank, setMaxRank] = useState<RankTier | null>(null);

  const [joinTargetId, setJoinTargetId] = useState<string | null>(null);
  const [joinPassword, setJoinPassword] = useState('');
  const [reserveRoomId, setReserveRoomId] = useState<string | null>(null);

  const { isDesktop } = useLayoutMode();

  useFocusEffect(
    useCallback(() => {
      const n = expireStaleRooms();
      if (n > 0) {
        showToast({
          type: 'info',
          title: '',
          message: t('lobby.expiredRooms', { count: n }),
        });
      }
    }, [expireStaleRooms, showToast, t])
  );

  const joinTargetRoom = joinTargetId ? rooms.find((r) => r.id === joinTargetId) : null;

  const attemptJoin = (roomId: string, password?: string) => {
    if (!currentUser) return;
    void (async () => {
      const result = await requestJoinRoom(
        roomId,
        {
          userId: currentUser.id,
          name: currentUser.name,
          rank: currentUser.rank,
          avatarColor: currentUser.avatarColor,
        },
        password
      );
      if (result.success) {
        setJoinTargetId(null);
        setJoinPassword('');
      }
      showToast({
        type: result.success ? 'success' : 'warning',
        title: '',
        message: result.message,
      });
    })();
  };

  const handleJoinPress = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    if (room.hasPassword) {
      setJoinTargetId(roomId);
      setJoinPassword('');
      return;
    }
    attemptJoin(roomId);
  };

  const handleJoinWithPassword = () => {
    if (!joinTargetId) return;
    attemptJoin(joinTargetId, joinPassword);
  };

  const resetCreateForm = () => {
    setShowCreate(false);
    setRoomTitle('');
    setRoomPassword('');
    setUsePassword(false);
    setUseRankLimit(false);
    setMinRank(null);
    setMaxRank(null);
  };

  const handleCreate = () => {
    if (!currentUser || !roomTitle.trim()) return;
    if (usePassword && roomPassword.length < 4) {
      showToast({ type: 'warning', title: '', message: t('lobby.passwordTooShort') });
      return;
    }
    if (eloOn && useRankLimit && minRank && maxRank && getRankIndex(minRank) > getRankIndex(maxRank)) {
      showToast({ type: 'warning', title: '', message: t('lobby.rankRangeInvalid') });
      return;
    }
    const result = createRoom({
      hostId: currentUser.id,
      hostName: currentUser.name,
      hostRank: currentUser.rank,
      hostAvatarColor: currentUser.avatarColor,
      title: roomTitle.trim(),
      minRank: eloOn && useRankLimit ? (minRank ?? undefined) : undefined,
      maxRank: eloOn && useRankLimit ? (maxRank ?? undefined) : undefined,
      password: usePassword ? roomPassword : undefined,
    });
    if (!result.success) {
      showToast({ type: 'warning', title: '', message: result.message });
      return;
    }
    resetCreateForm();
    showToast({ type: 'success', title: '', message: result.message });
  };

  const handleLeaveRoom = (roomId: string) => {
    if (!currentUser) return;
    leaveRoom(roomId, currentUser.id);
    showToast({ type: 'info', title: '', message: t('lobby.leftRoom') });
  };

  const handleTeamReserve = (courtId: number, gameCount: number) => {
    if (!currentUser || !reserveRoomId) return;
    const room = rooms.find((r) => r.id === reserveRoomId);
    if (!room) return;

    const memberIds = room.members.map((m) => m.userId);
    const result = reserveCourtForTeam(courtId, currentUser.id, memberIds, gameCount);
    if (result.success) {
      markRoomReserved(reserveRoomId, courtId);
      setReserveRoomId(null);
    }
    showToast({
      type: result.success ? 'success' : 'warning',
      title: '',
      message: result.message,
    });
  };

  const renderRankChips = (
    selected: RankTier | null,
    onSelect: (rank: RankTier | null) => void
  ) => (
    <View style={styles.rankChipRow}>
      <Pressable
        onPress={() => onSelect(null)}
        style={[styles.rankChip, selected === null && styles.rankChipOn]}
      >
        <Text style={[styles.rankChipText, selected === null && styles.rankChipTextOn]}>
          {t('common.none')}
        </Text>
      </Pressable>
      {RANK_ORDER.map((rank) => {
        const on = selected === rank;
        return (
          <Pressable
            key={rank}
            onPress={() => onSelect(rank)}
            style={[styles.rankChip, on && styles.rankChipOn]}
          >
            <Text style={[styles.rankChipText, on && styles.rankChipTextOn]}>
              {RANK_THRESHOLDS[rank].label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <PageContainer>
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <Text style={[styles.title, isDesktop && styles.titleDesktop]}>{t('lobby.title')}</Text>
          {!isGuest && (
            <Button title={t('lobby.createRoom')} onPress={() => setShowCreate(true)} size="sm" />
          )}
        </View>

        {isGuest && (
          <Text style={styles.guestHint}>{t('lobby.guestHint')}</Text>
        )}

        <ClubEventBanner />
        <SystemNoticeBanner />
        <ActivityNoticeBanner />

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>{t('lobby.roomList')}</Text>
          {rooms
            .filter((r) => r.status !== 'closed')
            .map((room) => (
              <TeamRoomCard
                key={room.id}
                room={room}
                onJoin={() => handleJoinPress(room.id)}
                onLeave={() => handleLeaveRoom(room.id)}
                onReserveCourt={() => setReserveRoomId(room.id)}
                onAcceptJoin={(requestId) => {
                  if (!currentUser) return;
                  const result = acceptJoinRequest(room.id, requestId, currentUser.id);
                  showToast({
                    type: result.success ? 'success' : 'warning',
                    title: '',
                    message: result.message,
                  });
                }}
                onRejectJoin={(requestId) => {
                  if (!currentUser) return;
                  const result = rejectJoinRequest(room.id, requestId, currentUser.id);
                  showToast({
                    type: result.success ? 'info' : 'warning',
                    title: '',
                    message: result.message,
                  });
                }}
                isMember={room.members.some((m) => m.userId === currentUser?.id)}
                isHost={room.hostId === currentUser?.id}
                hasPendingRequest={
                  !!currentUser &&
                  (room.joinRequests ?? []).some((r) => r.userId === currentUser.id)
                }
              />
            ))}
        </ScrollView>

        <Modal visible={showCreate} transparent animationType="slide">
          <Pressable style={styles.modalOverlay} onPress={resetCreateForm}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{t('lobby.newRoom')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('lobby.roomTitlePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  value={roomTitle}
                  onChangeText={setRoomTitle}
                />

                {eloOn && (
                  <>
                    <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>{t('lobby.rankLimit')}</Text>
                      <Toggle
                        value={useRankLimit}
                        onValueChange={(next) => {
                          setUseRankLimit(next);
                          if (!next) {
                            setMinRank(null);
                            setMaxRank(null);
                          }
                        }}
                        accessibilityLabel={t('lobby.rankLimit')}
                      />
                    </View>
                    {useRankLimit && (
                      <>
                        <Text style={styles.fieldLabel}>{t('lobby.minRank')}</Text>
                        {renderRankChips(minRank, setMinRank)}
                        <Text style={styles.fieldLabel}>{t('lobby.maxRank')}</Text>
                        {renderRankChips(maxRank, setMaxRank)}
                        <Text style={styles.rankHint}>{t('lobby.rankHint')}</Text>
                      </>
                    )}
                  </>
                )}

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>{t('lobby.passwordToggle')}</Text>
                  <Toggle
                    value={usePassword}
                    onValueChange={setUsePassword}
                    accessibilityLabel={t('lobby.passwordToggle')}
                  />
                </View>

                {usePassword && (
                  <TextInput
                    style={styles.input}
                    placeholder={t('lobby.passwordPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    value={roomPassword}
                    onChangeText={setRoomPassword}
                    secureTextEntry
                    maxLength={12}
                  />
                )}

                <Text style={styles.hint}>{t('lobby.createHint')}</Text>
                <Button
                  title={t('common.create')}
                  onPress={handleCreate}
                  fullWidth
                  size="lg"
                  disabled={!roomTitle.trim()}
                />
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={joinTargetId !== null} transparent animationType="fade">
          <Pressable style={styles.modalOverlayCenter} onPress={() => setJoinTargetId(null)}>
            <Pressable style={styles.passwordSheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>{t('lobby.enterPassword')}</Text>
              <Text style={styles.passwordHint}>{joinTargetRoom?.title}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('common.password')}
                placeholderTextColor={colors.textMuted}
                value={joinPassword}
                onChangeText={setJoinPassword}
                secureTextEntry
                autoFocus
              />
              <View style={styles.passwordActions}>
                <Button title={t('common.cancel')} onPress={() => setJoinTargetId(null)} variant="ghost" />
                <Button title={t('common.join')} onPress={handleJoinWithPassword} disabled={!joinPassword} />
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <TeamCourtReserveModal
          visible={reserveRoomId !== null}
          courts={courts}
          onClose={() => setReserveRoomId(null)}
          onReserve={handleTeamReserve}
        />
      </PageContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  headerDesktop: { paddingTop: spacing.xl, paddingBottom: spacing.lg },
  title: { ...typography.h1, color: colors.text, fontSize: 28 },
  titleDesktop: { ...typography.h1, color: colors.text },
  guestHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  content: { paddingBottom: spacing.xxl },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalSheet: {
    ...glass.sheet,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '88%',
  },
  passwordSheet: {
    ...glass.sheet,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  passwordHint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
  fieldLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: spacing.xs,
  },
  rankChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  rankChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  rankChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  rankChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  rankChipTextOn: { color: colors.textLight },
  rankHint: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  input: {
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceAlt,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  switchLabel: { ...typography.body, color: colors.text },
  hint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.lg },
  passwordActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
