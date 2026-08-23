import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Platform, Switch } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useAppStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useLessonStore } from '@/src/stores/lessonStore';
import { useCourtStore } from '@/src/stores/courtStore';
import { useShellStore } from '@/src/stores/shellStore';
import { useSearchStore } from '@/src/stores/searchStore';
import { useNotificationPrefsStore } from '@/src/stores/notificationPrefsStore';
import { isStaffUser } from '@/src/utils/staffAccess';
import { Avatar } from '@/src/components/ui/Avatar';
import { NotificationPanel } from './NotificationPanel';
import { DropBrand } from './DropBrand';
import { HamburgerIcon } from './HamburgerIcon';
import { ThemeToggleButton } from './ThemeToggleButton';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { colors, spacing, typography, shadows } from '@/src/theme';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function AppHeader() {
  const { isDesktop, isMobile, scale, isCompact, scaledTypography } = useLayoutMode();
  const currentUser = useAuthStore((s) => s.currentUser);
  const attendanceRecords = useAuthStore((s) => s.attendanceRecords);
  const checkIn = useAuthStore((s) => s.checkIn);
  const isAtGym = useAppStore((s) => s.isAtGym);
  const demoMode = useAppStore((s) => s.demoMode);
  const setDemoMode = useAppStore((s) => s.setDemoMode);
  const checkGeoFence = useAppStore((s) => s.checkGeoFence);
  const showToast = useNotificationStore((s) => s.showToast);
  const inbox = useNotificationStore((s) => s.inbox);
  const lessonQueue = useLessonStore((s) => s.lessonQueue);
  const lessonTurnOn = useNotificationPrefsStore((s) => s.lessonTurn);
  const courts = useCourtStore((s) => s.courts);
  const sidebarExpanded = useShellStore((s) => s.sidebarExpanded);
  const toggleSidebar = useShellStore((s) => s.toggleSidebar);
  const searchQuery = useSearchStore((s) => s.query);
  const setSearchQuery = useSearchStore((s) => s.setQuery);

  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openNotif = () => {
    if (notifCloseTimer.current) {
      clearTimeout(notifCloseTimer.current);
      notifCloseTimer.current = null;
    }
    setNotifOpen(true);
  };

  const scheduleCloseNotif = () => {
    if (notifCloseTimer.current) clearTimeout(notifCloseTimer.current);
    notifCloseTimer.current = setTimeout(() => {
      setNotifOpen(false);
      notifCloseTimer.current = null;
    }, 180);
  };

  const handleSearchSubmit = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setSearchFocused(false);
    router.push('/friends');
  };
  const todayRecord = attendanceRecords.find(
    (r) => r.userId === currentUser?.id && r.date === todayKey()
  );

  const unreadCount = useMemo(() => {
    let count = inbox.filter(
      (n) =>
        !n.read &&
        (!n.targetUserId || n.targetUserId === currentUser?.id) &&
        !(n.type === 'coach' && !lessonTurnOn)
    ).length;
    if (currentUser) {
      courts.forEach((court) => {
        const isHost =
          court.reservedBy === currentUser.id ||
          court.players[0]?.userId === currentUser.id;
        if (isHost) count += court.joinRequests.length;
      });
      const coach = lessonTurnOn
        ? lessonQueue.filter(
            (e) => e.userId === currentUser.id && (e.status === 'next' || e.status === 'active')
          )
        : [];
      count += coach.length;
    }
    return count;
  }, [courts, currentUser, inbox, lessonQueue, lessonTurnOn]);

  const handleCheckIn = () => {
    if (!currentUser) return;
    if (!checkGeoFence()) {
      showToast({ type: 'warning', title: '', message: 'S1 체육관 근처에서만 출석할 수 있어요.' });
      return;
    }
    const result = checkIn(currentUser.id);
    showToast({
      type: result.success ? 'success' : 'info',
      title: '',
      message: result.message,
    });
  };

  return (
    <View style={[styles.header, isMobile && styles.headerMobile, isCompact && styles.headerCompact]}>
      <View style={[styles.left, isMobile && styles.leftMobile]}>
        {isDesktop && (
          <Pressable
            onPress={toggleSidebar}
            style={styles.menuSlot}
            accessibilityRole="button"
            accessibilityLabel={sidebarExpanded ? '메뉴 닫기' : '메뉴 열기'}
            accessibilityState={{ expanded: sidebarExpanded }}
            hitSlop={8}
          >
            <HamburgerIcon active={sidebarExpanded} />
          </Pressable>
        )}
        {!isMobile && <DropBrand compact={false} scale={scale} style={{ marginRight: spacing.sm }} />}
        <View style={[styles.searchArea, isMobile && styles.searchAreaMobile]}>
          <View
            style={[
              styles.searchWrap,
              isMobile && styles.searchWrapMobile,
              isMobile && { height: Math.round(34 * scale) },
              searchFocused && styles.searchWrapFocused,
            ]}
          >
            <TextInput
              style={[
                styles.searchInput,
                isMobile && styles.searchInputMobile,
                isMobile && { fontSize: scaledTypography.body.fontSize },
              ]}
              placeholder={isMobile ? '검색' : '인원 검색'}
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            <Pressable onPress={handleSearchSubmit} hitSlop={8} accessibilityLabel="검색">
              <Ionicons name="search" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={[styles.right, isMobile && styles.rightMobile]}>
        {isStaffUser(currentUser) && (
          <View style={styles.demoToggle}>
            <Switch
              value={demoMode}
              onValueChange={setDemoMode}
              trackColor={{ false: colors.borderSubtle, true: colors.primaryLight }}
              thumbColor={demoMode ? colors.primary : colors.textMuted}
              style={styles.demoSwitch}
            />
            {!isMobile && <Text style={styles.demoLabel}>데모</Text>}
          </View>
        )}
        <Pressable
          style={[styles.actionBtn, isMobile && styles.actionBtnMobile, todayRecord && styles.actionBtnDone]}
          onPress={handleCheckIn}
          disabled={!!todayRecord || !isAtGym}
          accessibilityLabel="출석"
        >
          <Ionicons
            name={todayRecord ? 'checkmark-circle' : 'location-outline'}
            size={isMobile ? 20 : 18}
            color={todayRecord ? colors.success : isAtGym ? colors.primary : colors.textMuted}
          />
          {!isMobile && (
            <Text
              style={[
                styles.actionLabel,
                todayRecord && styles.actionLabelDone,
                !isAtGym && !todayRecord && styles.actionLabelMuted,
              ]}
            >
              {todayRecord ? '출석완료' : '출석'}
            </Text>
          )}
        </Pressable>

        {!isMobile && <ThemeToggleButton />}
        <View
          style={styles.notifWrap}
          {...(Platform.OS === 'web'
            ? {
                onMouseEnter: openNotif,
                onMouseLeave: scheduleCloseNotif,
              }
            : {})}
        >
          <Pressable
            style={styles.iconBtn}
            onPress={() => setNotifOpen((v) => !v)}
            accessibilityLabel="알림"
            accessibilityState={{ expanded: notifOpen }}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
          {notifOpen && (
            <View style={styles.notifDropdown}>
              <NotificationPanel onClose={() => setNotifOpen(false)} />
            </View>
          )}
        </View>

        {currentUser && (
          <Pressable
            style={[styles.profileBtn, isMobile && styles.profileBtnMobile]}
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel={`${currentUser.name} 프로필`}
          >
            <Avatar name={currentUser.name} color={currentUser.avatarColor} size={isMobile ? Math.round(30 * scale) : 32} imageUri={currentUser.avatarUri} />
            {!isMobile && (
              <Text style={styles.profileName} numberOfLines={1}>
                {currentUser.name}
              </Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    zIndex: 50,
  },
  headerMobile: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: spacing.sm,
    minWidth: 0,
  },
  leftMobile: {
    gap: 6,
    marginRight: 6,
  },
  menuSlot: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  searchArea: {
    flex: 1,
    maxWidth: 480,
    position: 'relative',
    zIndex: 100,
    minWidth: 0,
  },
  searchAreaMobile: {
    maxWidth: undefined,
  },
  searchWrap: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  searchWrapMobile: {
    height: 34,
    paddingHorizontal: spacing.sm,
  },
  searchWrapFocused: {
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(58,117,108,0.18)' } as object,
      default: {},
    }),
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: typography.body.fontFamily,
    fontSize: 15,
    color: colors.text,
    ...Platform.select({
      web: { outlineStyle: 'none', backgroundColor: 'transparent' } as object,
      default: { backgroundColor: 'transparent' },
    }),
  },
  searchInputMobile: {
    fontSize: 14,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rightMobile: {
    gap: 4,
    flexShrink: 0,
  },
  demoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginRight: 4,
  },
  demoSwitch: {
    transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }],
  },
  demoLabel: {
    ...typography.small,
    fontSize: 10,
    color: colors.textMuted,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  actionBtnMobile: {
    width: 34,
    height: 34,
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: 'center',
  },
  actionBtnDone: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  actionLabel: {
    ...typography.small,
    fontWeight: '600',
    color: colors.primary,
    fontSize: 12,
  },
  actionLabelDone: { color: colors.success },
  actionLabelMuted: { color: colors.textMuted },
  notifWrap: {
    position: 'relative',
    zIndex: 200,
  },
  notifDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    paddingTop: 8,
    zIndex: 200,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    gap: 6,
    maxWidth: 120,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  profileBtnMobile: {
    paddingLeft: 0,
    borderLeftWidth: 0,
    maxWidth: 34,
  },
  profileName: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 14,
  },
});
