import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useLessonStore } from '@/src/stores/lessonStore';
import { useCourtStore } from '@/src/stores/courtStore';
import { useLobbyStore } from '@/src/stores/lobbyStore';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationPrefsStore } from '@/src/stores/notificationPrefsStore';
import type { AppNotification } from '@/src/types';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/theme';
import { formatLessonEtaLabel } from '@/src/utils/lessonEta';
import { router } from 'expo-router';

const INITIAL_VISIBLE = 5;
const LIST_COLLAPSED_MAX = 280;
const LIST_EXPANDED_MAX = 420;

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

const TYPE_ICON: Record<AppNotification['type'], keyof typeof Ionicons.glyphMap> = {
  join: 'people',
  coach: 'school',
  system: 'information-circle',
  friend: 'heart',
};

interface NotificationPanelProps {
  onClose: () => void;
}

function resolveJoinRequestId(item: AppNotification, courts: ReturnType<typeof useCourtStore.getState>['courts']) {
  if (item.joinRequestId) return item.joinRequestId;
  if (item.id.startsWith('join-live-')) return item.id.replace('join-live-', '');
  if (item.type !== 'join' || item.courtId == null || item.title !== '참가 요청') return undefined;
  const court = courts.find((c) => c.id === item.courtId);
  if (!court || court.joinRequests.length === 0) return undefined;
  if (court.joinRequests.length === 1) return court.joinRequests[0].id;
  const nameMatch = item.message.match(/^(.+?)님이/);
  if (nameMatch) {
    const found = court.joinRequests.find((r) => r.userName === nameMatch[1]);
    if (found) return found.id;
  }
  return undefined;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const inboxAll = useNotificationStore((s) => s.inbox);
  const markRead = useNotificationStore((s) => s.markNotificationRead);
  const markAllRead = useNotificationStore((s) => s.markAllNotificationsRead);
  const showToast = useNotificationStore((s) => s.showToast);
  const courts = useCourtStore((s) => s.courts);
  const acceptJoin = useCourtStore((s) => s.acceptJoin);
  const rejectJoin = useCourtStore((s) => s.rejectJoin);
  const rooms = useLobbyStore((s) => s.rooms);
  const acceptLobbyJoin = useLobbyStore((s) => s.acceptJoinRequest);
  const rejectLobbyJoin = useLobbyStore((s) => s.rejectJoinRequest);
  const acceptInvite = useLobbyStore((s) => s.acceptInvite);
  const currentUser = useAuthStore((s) => s.currentUser);
  const lessonQueue = useLessonStore((s) => s.lessonQueue);
  const lessonTurnOn = useNotificationPrefsStore((s) => s.lessonTurn);
  const [expanded, setExpanded] = useState(false);

  const inbox = useMemo(
    () =>
      inboxAll.filter((n) => {
        if (n.targetUserId && (!currentUser || n.targetUserId !== currentUser.id)) return false;
        if (n.type === 'coach' && !lessonTurnOn) return false;
        return true;
      }),
    [inboxAll, currentUser, lessonTurnOn]
  );

  const liveJoin = useMemo(() => {
    if (!currentUser) return [];
    const items: AppNotification[] = [];
    courts.forEach((court) => {
      const isHost =
        court.reservedBy === currentUser.id ||
        court.players[0]?.userId === currentUser.id;
      if (!isHost) return;
      court.joinRequests.forEach((req) => {
        items.push({
          id: `join-live-${req.id}`,
          type: 'join',
          title: '참가 요청',
          message: `${req.userName}님이 ${court.id}번 코트 합류를 요청했어요`,
          read: false,
          createdAt: req.requestedAt ?? new Date().toISOString(),
          courtId: court.id,
          joinRequestId: req.id,
        });
      });
    });
    rooms.forEach((room) => {
      if (room.hostId !== currentUser.id) return;
      (room.joinRequests ?? []).forEach((req) => {
        items.push({
          id: `lobby-join-live-${req.id}`,
          type: 'join',
          title: '모집방 참가 신청',
          message: `${req.name}님이 「${room.title}」 참가를 신청했어요`,
          read: false,
          createdAt: req.requestedAt,
          roomId: room.id,
          joinRequestId: req.id,
        });
      });
    });
    return items;
  }, [courts, rooms, currentUser]);

  const coachAlerts = useMemo(() => {
    if (!currentUser || !lessonTurnOn) return [];
    return lessonQueue
      .filter((e) => e.userId === currentUser.id && (e.status === 'next' || e.status === 'active' || e.status === 'waiting'))
      .map((e) => {
        const eta = formatLessonEtaLabel(e, lessonQueue);
        return {
          id: `coach-${e.id}`,
          type: 'coach' as const,
          title: e.status === 'active' ? '코칭 진행 중' : e.status === 'next' ? '코칭 곧 시작' : '레슨 대기',
          message:
            e.status === 'active'
              ? '코치 코트로 이동해 주세요.'
              : eta ?? '다음 레슨 차례를 기다려 주세요.',
          read: false,
          createdAt: new Date().toISOString(),
        };
      });
  }, [currentUser, lessonQueue, lessonTurnOn]);

  const all = useMemo(() => {
    const liveIds = new Set(liveJoin.map((n) => n.joinRequestId).filter(Boolean));
    const inboxDeduped = inbox.filter((n) => {
      if (n.type === 'join' && (n.title === '참가 요청' || n.title === '모집방 참가 신청')) {
        const rid = n.joinRequestId ?? resolveJoinRequestId(n, courts);
        if (rid && liveIds.has(rid)) return false;
      }
      return true;
    });
    return [...liveJoin, ...coachAlerts, ...inboxDeduped].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [liveJoin, coachAlerts, inbox, courts]);

  const visible = expanded ? all : all.slice(0, INITIAL_VISIBLE);
  const hasMore = all.length > INITIAL_VISIBLE;

  const handleAccept = (item: AppNotification) => {
    if (item.roomId && item.joinRequestId && currentUser) {
      const result = acceptLobbyJoin(item.roomId, item.joinRequestId, currentUser.id);
      showToast({
        type: result.success ? 'success' : 'warning',
        title: '',
        message: result.message,
      });
      markRead(item.id);
      return;
    }
    if (item.courtId == null) return;
    const requestId = resolveJoinRequestId(item, courts);
    if (!requestId) {
      showToast({ type: 'warning', title: '', message: '이미 처리됐거나 요청을 찾을 수 없어요.' });
      return;
    }
    const result = acceptJoin(item.courtId, requestId);
    showToast({
      type: result.success ? 'success' : 'warning',
      title: '',
      message: result.message,
    });
    markRead(item.id);
  };

  const handleReject = (item: AppNotification) => {
    if (item.roomId && item.joinRequestId && currentUser) {
      const result = rejectLobbyJoin(item.roomId, item.joinRequestId, currentUser.id);
      showToast({
        type: result.success ? 'info' : 'warning',
        title: '',
        message: result.message,
      });
      markRead(item.id);
      return;
    }
    if (item.courtId == null) return;
    const requestId = resolveJoinRequestId(item, courts);
    if (!requestId) {
      showToast({ type: 'warning', title: '', message: '이미 처리됐거나 요청을 찾을 수 없어요.' });
      return;
    }
    rejectJoin(item.courtId, requestId);
    showToast({ type: 'info', title: '', message: '합류 요청을 거절했어요.' });
    markRead(item.id);
  };

  const handleAcceptInvite = (item: AppNotification) => {
    if (!currentUser || !item.roomId) return;
    const result = acceptInvite(item.roomId, currentUser.id);
    showToast({
      type: result.success ? 'success' : 'warning',
      title: '',
      message: result.message,
    });
    markRead(item.id);
    if (result.success) {
      onClose();
      router.push('/lobby');
    }
  };

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>알림</Text>
        <View style={styles.headerActions}>
          {all.some((n) => !n.read) && (
            <Pressable onPress={() => markAllRead(currentUser?.id)} hitSlop={8}>
              <Text style={styles.markAll}>모두 읽음</Text>
            </Pressable>
          )}
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={[styles.list, { maxHeight: expanded ? LIST_EXPANDED_MAX : LIST_COLLAPSED_MAX }]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {all.length === 0 ? (
          <Text style={styles.empty}>새 알림이 없어요</Text>
        ) : (
          visible.map((item) => {
            const canActCourtJoin =
              item.type === 'join' &&
              item.title === '참가 요청' &&
              item.courtId != null &&
              Boolean(resolveJoinRequestId(item, courts));
            const canActLobbyJoin =
              item.type === 'join' &&
              item.title === '모집방 참가 신청' &&
              !!item.roomId &&
              !!item.joinRequestId;
            const canActInvite =
              item.type === 'friend' && item.title === '모집방 초대' && !!item.roomId;

            return (
              <View
                key={item.id}
                style={[styles.row, !item.read && styles.rowUnread]}
              >
                <Pressable
                  onPress={() => markRead(item.id)}
                  style={styles.rowMain}
                  accessibilityRole="button"
                >
                  <View style={[styles.iconWrap, styles[`icon_${item.type}`]]}>
                    <Ionicons name={TYPE_ICON[item.type]} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.rowMsg}>{item.message}</Text>
                    <Text style={styles.rowTime}>{formatTime(item.createdAt)}</Text>
                  </View>
                </Pressable>
                {(canActCourtJoin || canActLobbyJoin) && (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => handleAccept(item)}
                      style={[styles.actionBtn, styles.acceptBtn]}
                      accessibilityRole="button"
                      accessibilityLabel="수락"
                    >
                      <Text style={styles.acceptText}>수락</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleReject(item)}
                      style={[styles.actionBtn, styles.rejectBtn]}
                      accessibilityRole="button"
                      accessibilityLabel="거절"
                    >
                      <Text style={styles.rejectText}>거절</Text>
                    </Pressable>
                  </View>
                )}
                {canActInvite && (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => handleAcceptInvite(item)}
                      style={[styles.actionBtn, styles.acceptBtn]}
                      accessibilityRole="button"
                      accessibilityLabel="초대 수락"
                    >
                      <Text style={styles.acceptText}>수락</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {hasMore && (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={styles.moreBtn}
          accessibilityRole="button"
          accessibilityLabel={expanded ? '알림 접기' : '알림 더보기'}
        >
          <Text style={styles.moreText}>{expanded ? '접기' : `더보기 (${all.length - INITIAL_VISIBLE})`}</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.primary}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: 320,
    maxHeight: 520,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.md,
    ...Platform.select({
      web: { boxShadow: '0 10px 32px rgba(136,148,171,0.28)' } as object,
      default: {},
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  markAll: { ...typography.small, color: colors.primary, fontWeight: '600' },
  list: { maxHeight: LIST_COLLAPSED_MAX },
  empty: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    padding: spacing.lg,
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
  },
  rowMain: {
    flexDirection: 'row',
    gap: spacing.sm,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  rowUnread: { backgroundColor: colors.surfaceAlt },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  icon_join: { backgroundColor: colors.primaryLight },
  icon_coach: { backgroundColor: '#E8F0FF' },
  icon_system: { backgroundColor: colors.surfaceAlt },
  icon_friend: { backgroundColor: colors.primaryLight },
  body: { flex: 1, gap: 2 },
  rowTitle: { ...typography.bodyBold, color: colors.text, fontSize: 14 },
  rowMsg: { ...typography.caption, color: colors.textSecondary },
  rowTime: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 44,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.xs,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  acceptBtn: { backgroundColor: colors.primary },
  rejectBtn: { backgroundColor: colors.surfaceAlt },
  acceptText: { ...typography.small, color: colors.textLight, fontWeight: '700' },
  rejectText: { ...typography.small, color: colors.textSecondary, fontWeight: '600' },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  moreText: { ...typography.small, color: colors.primary, fontWeight: '600' },
});
