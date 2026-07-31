import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { useLobbyStore } from '@/src/stores/lobbyStore';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { Button } from '@/src/components/ui/Button';
import { colors, spacing, typography, borderRadius, glass } from '@/src/theme';

interface FriendInviteModalProps {
  visible: boolean;
  friendId: string;
  friendName: string;
  onClose: () => void;
}

/** 친구를 내가 참여 중인 모집방에 초대 */
export function FriendInviteModal({
  visible,
  friendId,
  friendName,
  onClose,
}: FriendInviteModalProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const rooms = useLobbyStore((s) => s.rooms);
  const inviteFriendToRoom = useLobbyStore((s) => s.inviteFriendToRoom);
  const showToast = useNotificationStore((s) => s.showToast);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const myRooms = useMemo(() => {
    if (!currentUser) return [];
    return rooms.filter(
      (r) =>
        r.status !== 'closed' &&
        r.status !== 'reserved' &&
        (r.hostId === currentUser.id || r.members.some((m) => m.userId === currentUser.id)) &&
        !r.members.some((m) => m.userId === friendId) &&
        r.members.length < r.maxMembers
    );
  }, [rooms, currentUser, friendId]);

  const handleInvite = () => {
    if (!currentUser || !selectedId) return;
    const result = inviteFriendToRoom(selectedId, currentUser.id, friendId);
    showToast({
      type: result.success ? 'success' : 'warning',
      title: '',
      message: result.message,
    });
    if (result.success) {
      setSelectedId(null);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{friendName}님 초대</Text>
          <Text style={styles.hint}>초대하면 친구가 알림에서 수락해 바로 참여할 수 있어요.</Text>
          {myRooms.length === 0 ? (
            <Text style={styles.empty}>초대할 수 있는 모집방이 없어요. 먼저 방을 만들거나 참여해 주세요.</Text>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {myRooms.map((room) => {
                const on = selectedId === room.id;
                return (
                  <Pressable
                    key={room.id}
                    onPress={() => setSelectedId(room.id)}
                    style={[styles.roomRow, on && styles.roomRowOn]}
                  >
                    <Text style={[styles.roomTitle, on && styles.roomTitleOn]} numberOfLines={1}>
                      {room.title}
                    </Text>
                    <Text style={styles.roomMeta}>
                      {room.members.length}/{room.maxMembers}명
                      {room.hostId === currentUser?.id ? ' · 내 방' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <View style={styles.actions}>
            <Button title="취소" onPress={onClose} variant="ghost" />
            <Button
              title="초대 보내기"
              onPress={handleInvite}
              disabled={!selectedId}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    ...glass.sheet,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  title: { ...typography.h3, color: colors.text, marginBottom: spacing.xs },
  hint: { ...typography.small, color: colors.textMuted, marginBottom: spacing.md, lineHeight: 16 },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  list: { maxHeight: 240, marginBottom: spacing.md },
  roomRow: {
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    marginBottom: spacing.sm,
  },
  roomRowOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  roomTitle: { ...typography.bodyBold, color: colors.text, fontSize: 14 },
  roomTitleOn: { color: colors.primary },
  roomMeta: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
