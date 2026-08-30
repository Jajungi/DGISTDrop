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
import { useNotificationPrefsStore, isNotificationPrefEnabledForType } from '@/src/stores/notificationPrefsStore';
import { useAppWindowSize } from '@/src/hooks/useAppWindowSize';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import type { AppNotification } from '@/src/types';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/theme';
import { formatLessonEtaLabel } from '@/src/utils/lessonEta';
import { todayAttendanceIntent } from '@/src/utils/attendanceIntent';
import { isActivityDay } from '@/src/services/activityTime';
import { useActivityScheduleStore } from '@/src/stores/activityScheduleStore';
import { useClubEventStore } from '@/src/stores/clubEventStore';
import { useSeoulTodayKey } from '@/src/hooks/useSeoulTodayKey';
import { isGuestUser } from '@/src/utils/guestAccess';
import { useI18n } from '@/src/i18n/useI18n';
import { router } from 'expo-router';

const INITIAL_VISIBLE = 5;
const LIST_COLLAPSED_MAX = 280;
const LIST_EXPANDED_MAX = 420;

function formatTime(iso: string, locale: 'ko' | 'en') {
  const d = new Date(iso);
  return d.toLocaleTimeString(locale === 'en' ? 'en-US' : 'ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const TYPE_ICON: Record<AppNotification['type'], keyof typeof Ionicons.glyphMap> = {
  join: 'people',
  coach: 'school',
  system: 'information-circle',
  friend: 'heart',
};

interface NotificationPanelProps {
  onClose: () => void;
  /** 모달로 띄울 때 상·하단 여백을 더 둠 */
  layout?: 'dropdown' | 'modal';
}

function resolveJoinRequestId(item: AppNotification, courts: ReturnType<typeof useCourtStore.getState>['courts']) {
  if (item.joinRequestId) return item.joinRequestId;
  if (item.id.startsWith('join-live-')) return item.id.replace('join-live-', '');
  if (item.type !== 'join' || item.courtId == null) return undefined;
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

export function NotificationPanel({ onClose, layout = 'dropdown' }: NotificationPanelProps) {
  const { width: screenW, height: screenH } = useAppWindowSize();
  const { headerHeight, tabBarHeight } = useLayoutMode();
  const inboxAll = useNotificationStore((s) => s.inbox);
  const dismissedLiveAlertIds = useNotificationStore((s) => s.dismissedLiveAlertIds);
  const markRead = useNotificationStore((s) => s.markNotificationRead);
  const showToast = useNotificationStore((s) => s.showToast);
  const courts = useCourtStore((s) => s.courts);
  const acceptJoin = useCourtStore((s) => s.acceptJoin);
  const rejectJoin = useCourtStore((s) => s.rejectJoin);
  const rooms = useLobbyStore((s) => s.rooms);
  const acceptLobbyJoin = useLobbyStore((s) => s.acceptJoinRequest);
  const rejectLobbyJoin = useLobbyStore((s) => s.rejectJoinRequest);
  const acceptInvite = useLobbyStore((s) => s.acceptInvite);
  const currentUser = useAuthStore((s) => s.currentUser);
  const setAttendanceIntent = useAuthStore((s) => s.setAttendanceIntent);
  const schedule = useActivityScheduleStore((s) => s.schedule);
  const cancelledDate = useActivityScheduleStore((s) => s.cancelledDate);
  const events = useClubEventStore((s) => s.events);
  const todayKey = useSeoulTodayKey();
  const lessonQueue = useLessonStore((s) => s.lessonQueue);
  const lessonTurnOn = useNotificationPrefsStore((s) => s.lessonTurn);
  const joinAlertsOn = useNotificationPrefsStore((s) => s.joinAlerts);
  const systemAlertsOn = useNotificationPrefsStore((s) => s.systemAlerts);
  const { t, locale } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const inbox = useMemo(
    () =>
      inboxAll.filter((n) => {
        if (n.targetUserId && (!currentUser || n.targetUserId !== currentUser.id)) return false;
        return isNotificationPrefEnabledForType(n.type);
      }),
    [inboxAll, currentUser]
  );

  const liveJoin = useMemo(() => {
    if (!currentUser || !joinAlertsOn) return [];
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
          title: t('notifications.joinCourtTitle'),
          message: t('notifications.joinCourtMessage', { name: req.userName, court: court.id }),
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
          title: t('notifications.joinLobbyTitle'),
          message: t('notifications.joinLobbyMessage', { name: req.name, room: room.title }),
          read: false,
          createdAt: req.requestedAt,
          roomId: room.id,
          joinRequestId: req.id,
        });
      });
    });
    return items;
  }, [courts, rooms, currentUser, joinAlertsOn, t]);

  const attendancePrompt = useMemo(() => {
    if (!systemAlertsOn) return null;
    if (!currentUser || isGuestUser(currentUser) || currentUser.memberStatus !== 'approved') {
      return null;
    }
    if (!isActivityDay()) return null;
    if (todayAttendanceIntent(currentUser, todayKey)) return null;
    return {
      id: 'attendance-today',
      type: 'system' as const,
      title: t('notifications.attendanceTitle'),
      message: t('notifications.attendanceMessage'),
      read: false,
      createdAt: new Date().toISOString(),
      targetUserId: currentUser.id,
    };
  }, [currentUser, schedule, events, cancelledDate, todayKey, systemAlertsOn, t]);

  const coachAlerts = useMemo(() => {
    if (!currentUser || !lessonTurnOn) return [];
    return lessonQueue
      .filter((e) => e.userId === currentUser.id && (e.status === 'next' || e.status === 'active' || e.status === 'waiting'))
      .map((e) => {
        const eta = formatLessonEtaLabel(e, lessonQueue);
        const alertId = `coach-${e.id}-${e.status}`;
        const inboxRead = inbox.some(
          (n) =>
            n.type === 'coach' &&
            n.read &&
            (n.targetUserId === currentUser.id || !n.targetUserId) &&
            n.message.includes(String(e.position))
        );
        return {
          id: alertId,
          type: 'coach' as const,
          title:
            e.status === 'active'
              ? t('notifications.coachActiveTitle')
              : e.status === 'next'
                ? t('notifications.coachNextTitle')
                : t('notifications.coachWaitingTitle'),
          message:
            e.status === 'active'
              ? t('notifications.coachActiveMessage')
              : eta ?? t('notifications.coachWaitMessage'),
          read: dismissedLiveAlertIds.includes(alertId) || inboxRead,
          createdAt: e.joinedAt,
        };
      });
  }, [currentUser, lessonQueue, lessonTurnOn, dismissedLiveAlertIds, inbox, t]);

  const all = useMemo(() => {
    const liveIds = new Set(liveJoin.map((n) => n.joinRequestId).filter(Boolean));
    const inboxDeduped = inbox.filter((n) => {
      if (n.type === 'join' && n.joinRequestId) {
        if (liveIds.has(n.joinRequestId)) return false;
      }
      return true;
    });
    const rest = [...liveJoin, ...coachAlerts, ...inboxDeduped].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return attendancePrompt ? [attendancePrompt, ...rest] : rest;
  }, [liveJoin, coachAlerts, attendancePrompt, inbox, courts]);

  const visible = expanded ? all : all.slice(0, INITIAL_VISIBLE);
  const hasMore = all.length > INITIAL_VISIBLE;

  const panelWidth =
    layout === 'modal'
      ? screenW - 16
      : Math.min(320, Math.max(260, screenW - 16));
  const chromeReserve = layout === 'modal' ? 48 : headerHeight + 16;
  const panelMaxHeight = Math.min(
    520,
    Math.max(200, screenH - chromeReserve - (layout === 'modal' ? 24 : tabBarHeight))
  );
  const listMaxHeight = Math.min(
    expanded ? LIST_EXPANDED_MAX : LIST_COLLAPSED_MAX,
    Math.max(120, panelMaxHeight - 88)
  );

  const handleAttendance = (intent: 'going' | 'not_going') => {
    if (!currentUser) return;
    const result = setAttendanceIntent(currentUser.id, intent);
    showToast({
      type: result.success ? (intent === 'going' ? 'success' : 'info') : 'warning',
      title: '',
      message:
        result.success && intent === 'going'
          ? '참석으로 표시했어요. 언제 올지 칸에서 골라 주세요.'
          : result.message,
    });
    if (intent === 'going') onClose();
  };

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
      showToast({ type: 'warning', title: '', message: t('notifications.joinProcessed') });
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
      showToast({ type: 'warning', title: '', message: t('notifications.joinProcessed') });
      return;
    }
    rejectJoin(item.courtId, requestId);
    showToast({ type: 'info', title: '', message: t('notifications.joinRejected') });
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
    <View style={[styles.panel, { width: panelWidth, maxHeight: panelMaxHeight }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('notifications.title')}</Text>
        <View style={styles.headerActions}>
          {all.some((n) => !n.read) && (
            <Pressable
              onPress={() => all.filter((n) => !n.read).forEach((n) => markRead(n.id))}
              hitSlop={8}
            >
              <Text style={styles.markAll}>{t('notifications.markAllRead')}</Text>
            </Pressable>
          )}
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={[styles.list, { maxHeight: listMaxHeight }]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {all.length === 0 ? (
          <Text style={styles.empty}>{t('notifications.empty')}</Text>
        ) : (
          visible.map((item) => {
            const canActAttendance = item.id === 'attendance-today';
            const canActCourtJoin =
              item.type === 'join' &&
              item.courtId != null &&
              !item.roomId &&
              Boolean(resolveJoinRequestId(item, courts));
            const canActLobbyJoin =
              item.type === 'join' && !!item.roomId && !!item.joinRequestId;
            const inviteRoomId = 'roomId' in item ? item.roomId : undefined;
            const inviteRoom = inviteRoomId ? rooms.find((r) => r.id === inviteRoomId) : undefined;
            const canActInvite =
              item.type === 'friend' &&
              !!inviteRoomId &&
              !!inviteRoom &&
              inviteRoom.status !== 'reserved' &&
              inviteRoom.status !== 'closed' &&
              !inviteRoom.members.some((m) => m.userId === currentUser?.id);

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
                    <View style={styles.titleRow}>
                      <Text style={[styles.rowTitle, !item.read && styles.rowTitleUnread]} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {item.read ? <Text style={styles.readBadge}>{t('notifications.read')}</Text> : null}
                    </View>
                    <Text style={styles.rowMsg} numberOfLines={3}>
                      {item.message}
                    </Text>
                    <Text style={styles.rowTime}>{formatTime(item.createdAt, locale)}</Text>
                  </View>
                </Pressable>
                {canActAttendance && (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => handleAttendance('going')}
                      style={[styles.actionBtn, styles.acceptBtn]}
                      accessibilityRole="button"
                      accessibilityLabel="참석"
                    >
                      <Text style={styles.acceptText}>{t('notifications.going')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleAttendance('not_going')}
                      style={[styles.actionBtn, styles.rejectBtn]}
                      accessibilityRole="button"
                      accessibilityLabel="불참"
                    >
                      <Text style={styles.rejectText}>{t('notifications.notGoing')}</Text>
                    </Pressable>
                  </View>
                )}
                {(canActCourtJoin || canActLobbyJoin) && (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => handleAccept(item)}
                      style={[styles.actionBtn, styles.acceptBtn]}
                      accessibilityRole="button"
                      accessibilityLabel="수락"
                    >
                      <Text style={styles.acceptText}>{t('notifications.accept')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleReject(item)}
                      style={[styles.actionBtn, styles.rejectBtn]}
                      accessibilityRole="button"
                      accessibilityLabel="거절"
                    >
                      <Text style={styles.rejectText}>{t('notifications.reject')}</Text>
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
                      <Text style={styles.acceptText}>{t('notifications.accept')}</Text>
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
          accessibilityLabel={expanded ? t('notifications.collapse') : t('notifications.expand')}
        >
          <Text style={styles.moreText}>
            {expanded
              ? t('notifications.collapse')
              : `${t('notifications.expand')} (${all.length - INITIAL_VISIBLE})`}
          </Text>
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
    maxWidth: '100%',
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
  body: { flex: 1, gap: 2, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  rowTitle: { ...typography.bodyBold, color: colors.text, fontSize: 14, flex: 1 },
  rowTitleUnread: { color: colors.text },
  readBadge: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceAlt,
  },
  rowMsg: { ...typography.caption, color: colors.textSecondary, flexShrink: 1 },
  rowTime: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
