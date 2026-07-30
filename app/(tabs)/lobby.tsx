import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TextInput,
  Modal,
  Pressable,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLobbyStore } from '@/src/stores/lobbyStore';
import { useAuthStore, useAppStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useGeoLocation } from '@/src/hooks/useGeoLocation';
import { TeamRoomCard } from '@/src/components/lobby/TeamRoomCard';
import { TeamCourtReserveModal } from '@/src/components/lobby/TeamCourtReserveModal';
import { useCourtStore } from '@/src/stores/courtStore';
import { ActivityNoticeBanner } from '@/src/components/guide/ActivityNoticeBanner';
import { ClubEventBanner } from '@/src/components/guide/ClubEventBanner';
import { PageContainer } from '@/src/components/layout/PageContainer';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { Button } from '@/src/components/ui/Button';
import { colors, spacing, typography, borderRadius, glass } from '@/src/theme';

export default function LobbyScreen() {
  useGeoLocation();

  const rooms = useLobbyStore((s) => s.rooms);
  const verifyAndJoinRoom = useLobbyStore((s) => s.verifyAndJoinRoom);
  const createRoom = useLobbyStore((s) => s.createRoom);
  const leaveRoom = useLobbyStore((s) => s.leaveRoom);
  const markRoomReserved = useLobbyStore((s) => s.markRoomReserved);
  const courts = useCourtStore((s) => s.courts);
  const reserveCourtForTeam = useCourtStore((s) => s.reserveCourtForTeam);
  const currentUser = useAuthStore((s) => s.currentUser);
  const isGuest = useAuthStore((s) => s.isGuestSession);
  const checkGeoFence = useAppStore((s) => s.checkGeoFence);
  const showToast = useNotificationStore((s) => s.showToast);

  const [showCreate, setShowCreate] = useState(false);
  const [roomTitle, setRoomTitle] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');

  const [joinTargetId, setJoinTargetId] = useState<string | null>(null);
  const [joinPassword, setJoinPassword] = useState('');
  const [reserveRoomId, setReserveRoomId] = useState<string | null>(null);

  const { isDesktop } = useLayoutMode();

  const joinTargetRoom = joinTargetId ? rooms.find((r) => r.id === joinTargetId) : null;

  const attemptJoin = (roomId: string, password?: string) => {
    if (!currentUser) return;
    if (!checkGeoFence()) {
      showToast({ type: 'warning', title: '', message: '체육관 도착 후 참여할 수 있어요.' });
      return;
    }
    void (async () => {
      const result = await verifyAndJoinRoom(
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

  const handleCreate = () => {
    if (!currentUser || !roomTitle.trim()) return;
    if (usePassword && roomPassword.length < 4) {
      showToast({ type: 'warning', title: '', message: '비밀번호는 4자 이상이어야 해요.' });
      return;
    }
    const result = createRoom({
      hostId: currentUser.id,
      hostName: currentUser.name,
      hostRank: currentUser.rank,
      hostAvatarColor: currentUser.avatarColor,
      title: roomTitle.trim(),
      password: usePassword ? roomPassword : undefined,
    });
    if (!result.success) {
      showToast({ type: 'warning', title: '', message: result.message });
      return;
    }
    setRoomTitle('');
    setRoomPassword('');
    setUsePassword(false);
    setShowCreate(false);
    showToast({ type: 'success', title: '', message: result.message });
  };

  const resetCreateForm = () => {
    setShowCreate(false);
    setRoomTitle('');
    setRoomPassword('');
    setUsePassword(false);
  };

  const handleLeaveRoom = (roomId: string) => {
    if (!currentUser) return;
    leaveRoom(roomId, currentUser.id);
    showToast({ type: 'info', title: '', message: '방에서 나왔어요.' });
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

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <PageContainer>
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <Text style={[styles.title, isDesktop && styles.titleDesktop]}>파트너 모집</Text>
          {!isGuest && (
            <Button title="방 만들기" onPress={() => setShowCreate(true)} size="sm" />
          )}
        </View>

        {isGuest && (
          <Text style={styles.guestHint}>게스트는 모집방 참여만 가능해요. 방 만들기는 회원 전용입니다.</Text>
        )}

        <ClubEventBanner />
        <ActivityNoticeBanner />

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>모집 목록</Text>
          {rooms
            .filter((r) => r.status !== 'closed')
            .map((room) => (
              <TeamRoomCard
                key={room.id}
                room={room}
                onJoin={() => handleJoinPress(room.id)}
                onLeave={() => handleLeaveRoom(room.id)}
                onReserveCourt={() => setReserveRoomId(room.id)}
                isMember={room.members.some((m) => m.userId === currentUser?.id)}
                isHost={room.hostId === currentUser?.id}
              />
            ))}
        </ScrollView>

        {/* 방 만들기 */}
        <Modal visible={showCreate} transparent animationType="slide">
          <Pressable style={styles.modalOverlay} onPress={resetCreateForm}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>새 모집방</Text>
              <TextInput
                style={styles.input}
                placeholder="방 제목"
                placeholderTextColor={colors.textMuted}
                value={roomTitle}
                onChangeText={setRoomTitle}
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>비밀번호 설정</Text>
                <Switch
                  value={usePassword}
                  onValueChange={setUsePassword}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={usePassword ? colors.primary : colors.textMuted}
                />
              </View>

              {usePassword && (
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호 (4자 이상)"
                  placeholderTextColor={colors.textMuted}
                  value={roomPassword}
                  onChangeText={setRoomPassword}
                  secureTextEntry
                  maxLength={12}
                />
              )}

              <Text style={styles.hint}>2~4명 모이면 코트 예약이 가능해요</Text>
              <Button
                title="만들기"
                onPress={handleCreate}
                fullWidth
                size="lg"
                disabled={!roomTitle.trim()}
              />
            </Pressable>
          </Pressable>
        </Modal>

        {/* 비밀번호 입력 */}
        <Modal visible={joinTargetId !== null} transparent animationType="fade">
          <Pressable style={styles.modalOverlayCenter} onPress={() => setJoinTargetId(null)}>
            <Pressable style={styles.passwordSheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>비밀번호 입력</Text>
              <Text style={styles.passwordHint}>
                {joinTargetRoom?.title}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="비밀번호"
                placeholderTextColor={colors.textMuted}
                value={joinPassword}
                onChangeText={setJoinPassword}
                secureTextEntry
                autoFocus
              />
              <View style={styles.passwordActions}>
                <Button title="취소" onPress={() => setJoinTargetId(null)} variant="ghost" />
                <Button title="참여" onPress={handleJoinWithPassword} disabled={!joinPassword} />
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
  modalOverlayCenter: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.lg },
  modalSheet: {
    ...glass.sheet,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  passwordSheet: {
    ...glass.sheet,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  passwordHint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
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
  passwordActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
});
