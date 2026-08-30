import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Platform } from 'react-native';
import { useLobbyStore } from '@/src/stores/lobbyStore';
import { useCoachingStore } from '@/src/stores/coachingStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useAuthStore } from '@/src/stores/authStore';
import { recordAdminLogAsActor } from '@/src/services/adminLog';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

const ROOM_STATUS: Record<string, string> = {
  open: '모집 중',
  ready: '인원 충족',
  reserved: '코트 예약됨',
  closed: '종료',
};

interface AdminOperationsPanelProps {
  adminId: string;
  adminName: string;
  onToast: (type: 'success' | 'info' | 'warning', message: string) => void;
}

export function AdminOperationsPanel({
  adminId,
  adminName,
  onToast,
}: AdminOperationsPanelProps) {
  const rooms = useLobbyStore((s) => s.rooms);
  const adminCloseRoom = useLobbyStore((s) => s.adminCloseRoom);
  const announcements = useCoachingStore((s) => s.announcements);
  const postAnnouncement = useCoachingStore((s) => s.postAnnouncement);
  const removeAnnouncement = useCoachingStore((s) => s.removeAnnouncement);
  const adminBroadcastNotice = useNotificationStore((s) => s.adminBroadcastNotice);
  const users = useAuthStore((s) => s.users);
  const adminSetUserAtGym = useAuthStore((s) => s.adminSetUserAtGym);

  const approvedMembers = useMemo(
    () => users.filter((u) => u.memberStatus === 'approved'),
    [users]
  );

  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [coachTitle, setCoachTitle] = useState('');
  const [coachBody, setCoachBody] = useState('');

  const openRooms = rooms.filter((r) => r.status !== 'closed');

  return (
    <View style={styles.wrap}>
      <Card style={styles.block}>
        <Text style={styles.blockTitle}>전체 공지 보내기</Text>
        <Text style={styles.hint}>승인된 모든 회원 알림함에 도착합니다.</Text>
        <TextInput
          style={styles.input}
          placeholder="제목"
          placeholderTextColor={colors.textMuted}
          value={noticeTitle}
          onChangeText={setNoticeTitle}
        />
        <TextInput
          style={[styles.input, styles.inputMulti]}
          placeholder="내용"
          placeholderTextColor={colors.textMuted}
          value={noticeBody}
          onChangeText={setNoticeBody}
          multiline
        />
        <Button
          title="공지 발송"
          onPress={() => {
            const r = adminBroadcastNotice(adminId, noticeTitle, noticeBody);
            onToast(r.success ? 'success' : 'warning', r.message);
            if (r.success) {
              setNoticeTitle('');
              setNoticeBody('');
            }
          }}
          size="sm"
          fullWidth
        />
      </Card>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>코칭 · 레슨 공지</Text>
        <TextInput
          style={styles.input}
          placeholder="공지 제목"
          placeholderTextColor={colors.textMuted}
          value={coachTitle}
          onChangeText={setCoachTitle}
        />
        <TextInput
          style={[styles.input, styles.inputMulti]}
          placeholder="공지 내용"
          placeholderTextColor={colors.textMuted}
          value={coachBody}
          onChangeText={setCoachBody}
          multiline
        />
        <Button
          title="코칭 화면에 공지 등록"
          onPress={() => {
            const r = postAnnouncement(adminId, adminName, coachTitle, coachBody);
            if (r.success) {
              recordAdminLogAsActor(adminId, {
                category: 'lesson',
                action: 'coach.announcement',
                message: `코칭 공지: ${coachTitle.trim()}`,
              });
              setCoachTitle('');
              setCoachBody('');
            }
            onToast(r.success ? 'success' : 'warning', r.message);
          }}
          size="sm"
          variant="secondary"
          fullWidth
        />
        {announcements.slice(0, 5).map((a) => (
          <View key={a.id} style={styles.itemCard}>
            <Text style={styles.itemTitle}>{a.title}</Text>
            <Text style={styles.itemSub} numberOfLines={2}>
              {a.message}
            </Text>
            <Button
              title="삭제"
              onPress={() => {
                removeAnnouncement(a.id);
                recordAdminLogAsActor(adminId, {
                  category: 'lesson',
                  action: 'coach.announcement.remove',
                  message: `코칭 공지 삭제: ${a.title}`,
                });
                onToast('info', '공지를 삭제했어요.');
              }}
              size="sm"
              variant="danger"
            />
          </View>
        ))}
      </Card>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>모집방 ({openRooms.length})</Text>
        {openRooms.length === 0 && (
          <Text style={styles.empty}>열린 모집방이 없습니다</Text>
        )}
        {openRooms.map((room) => (
          <View key={room.id} style={styles.itemCard}>
            <Text style={styles.itemTitle}>{room.title}</Text>
            <Text style={styles.itemSub}>
              {room.hostName} · {room.members.length}/{room.maxMembers}명 ·{' '}
              {ROOM_STATUS[room.status] ?? room.status}
            </Text>
            <Button
              title="모집방 강제 종료"
              onPress={() => {
                const r = adminCloseRoom(room.id);
                if (r.success) {
                  recordAdminLogAsActor(adminId, {
                    category: 'social',
                    action: 'lobby.close',
                    message: `모집방 종료: ${room.title}`,
                    meta: { roomId: room.id },
                  });
                }
                onToast(r.success ? 'info' : 'warning', r.message);
              }}
              size="sm"
              variant="danger"
            />
          </View>
        ))}
      </Card>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>체육관 도착 상태</Text>
        <Text style={styles.hint}>출석과 별개로 「지금 체육관」 표시를 바꿉니다.</Text>
        {approvedMembers.slice(0, 10).map((user) => (
          <View key={user.id} style={styles.itemCard}>
            <Text style={styles.itemTitle}>
              {user.name}{' '}
              <Text style={user.isAtGym ? styles.atGym : styles.notAtGym}>
                {user.isAtGym ? '· 도착' : '· 미도착'}
              </Text>
            </Text>
            <View style={styles.rowActions}>
              <Button
                title="도착 처리"
                onPress={() => {
                  const r = adminSetUserAtGym(user.id, true, adminId);
                  onToast(r.success ? 'success' : 'warning', r.message);
                }}
                size="sm"
                variant="outline"
              />
              <Button
                title="미도착 처리"
                onPress={() => {
                  const r = adminSetUserAtGym(user.id, false, adminId);
                  onToast(r.success ? 'info' : 'warning', r.message);
                }}
                size="sm"
                variant="ghost"
              />
            </View>
          </View>
        ))}
      </Card>

      <Card style={styles.hintCard}>
        <Text style={styles.hintTitle}>관리자 권한</Text>
        <Text style={styles.hintText}>
          · 지오펜스·활동 시간 제한 없이 코트·예약 조작 가능{'\n'}
          · 회원·출석·경기·레슨·코트·포인트·친구·모집방 전체 관리{'\n'}
          · 모든 작업은 활동 로그에 기록됨
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  block: { gap: spacing.sm },
  blockTitle: { ...typography.h3, color: colors.text },
  hint: { ...typography.small, color: colors.textMuted, marginBottom: 4 },
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
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  itemCard: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.xs,
  },
  itemTitle: { ...typography.caption, fontWeight: '700', color: colors.text },
  itemSub: { ...typography.small, color: colors.textMuted },
  empty: { ...typography.caption, color: colors.textMuted },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
  atGym: { color: colors.success, fontWeight: '600' },
  notAtGym: { color: colors.textMuted },
  hintCard: {
    backgroundColor: colors.primaryLight,
    gap: spacing.xs,
  },
  hintTitle: { ...typography.caption, fontWeight: '700', color: colors.primaryDark },
  hintText: { ...typography.small, color: colors.textSecondary, lineHeight: 18 },
});
