import React, { useRef, useState } from 'react';
import { View, StyleSheet, Platform, Text, Pressable } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWindowDimensions } from 'react-native';
import { AppHeader } from './AppHeader';
import { useShellStore } from '@/src/stores/shellStore';
import { useAuthStore } from '@/src/stores/authStore';
import { useCourtStore } from '@/src/stores/courtStore';
import { useAdminAlertCount } from '@/src/hooks/useAdminAlerts';
import { isStaffUser } from '@/src/utils/staffAccess';
import { NAV_ITEMS, ADMIN_NAV_ITEM, WEB_BREAKPOINT } from '@/src/constants/nav';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

const SIDEBAR_COLLAPSED = 56;
const SIDEBAR_EXPANDED = 196;
const MAIN_GAP_COLLAPSED = 8;
const MAIN_GAP_EXPANDED = 20;
const ANIM_MS = 150;
const HOVER_CLOSE_MS = 160;

const sidebarTransition = Platform.select({
  web: {
    transitionProperty: 'width',
    transitionDuration: `${ANIM_MS}ms`,
    transitionTimingFunction: 'ease',
    willChange: 'width',
  } as object,
  default: {},
});

const mainTransition = Platform.select({
  web: {
    transitionProperty: 'margin-left',
    transitionDuration: `${ANIM_MS}ms`,
    transitionTimingFunction: 'ease',
    willChange: 'margin-left',
  } as object,
  default: {},
});

const labelTransition = Platform.select({
  web: {
    transitionProperty: 'opacity',
    transitionDuration: `${ANIM_MS}ms`,
    transitionTimingFunction: 'ease',
  } as object,
  default: {},
});

export function WebShell({ children }: { children?: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const router = useRouter();
  const sidebarPinned = useShellStore((s) => s.sidebarExpanded);
  const isDesktop = Platform.OS === 'web' && width >= WEB_BREAKPOINT;
  const currentUser = useAuthStore((s) => s.currentUser);
  const isStaff = isStaffUser(currentUser);
  const isGuest = useAuthStore((s) => s.isGuestSession);
  const selectedCourtId = useCourtStore((s) => s.selectedCourtId);
  const selectCourt = useCourtStore((s) => s.selectCourt);
  const adminAlerts = useAdminAlertCount();
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sidebarExpanded = sidebarPinned || hoverExpanded;
  const navItems = (isStaff ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS).filter(
    (item) => !isGuest || item.href !== '/friends'
  );

  const openHover = () => {
    if (hoverCloseTimer.current) {
      clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
    setHoverExpanded(true);
  };

  const scheduleCloseHover = () => {
    if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
    hoverCloseTimer.current = setTimeout(() => {
      setHoverExpanded(false);
      hoverCloseTimer.current = null;
    }, HOVER_CLOSE_MS);
  };

  if (!isDesktop) {
    return <>{children}</>;
  }

  const handleNavPress = (href: string) => {
    const onCourts =
      href === '/' &&
      (pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/');
    if (onCourts && selectedCourtId != null) {
      selectCourt(null);
      return;
    }
    router.push(href as '/');
  };

  return (
    <View style={styles.root}>
      <AppHeader />

      <View style={styles.content}>
        <View
          style={[
            styles.sidebar,
            sidebarTransition,
            { width: sidebarExpanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED },
          ]}
          {...(Platform.OS === 'web'
            ? {
                onMouseEnter: openHover,
                onMouseLeave: scheduleCloseHover,
              }
            : {})}
        >
          {navItems.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/'
                : pathname.includes(item.href.replace('/', ''));
            const alerting = item.href === '/admin' && adminAlerts > 0;
            return (
              <Pressable
                key={item.href}
                onPress={() => handleNavPress(item.href)}
                style={[styles.navRow, active && styles.navRowActive]}
                accessibilityRole="button"
                accessibilityLabel={
                  alerting ? `${item.label} (확인 필요 ${adminAlerts}건)` : item.label
                }
              >
                <View style={[styles.navIcon, active && styles.navIconActive]}>
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={active ? colors.textLight : colors.text}
                  />
                  {alerting ? (
                    <View style={styles.navBadge}>
                      <Text style={styles.navBadgeText}>
                        {adminAlerts > 9 ? '9+' : adminAlerts}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.navLabel,
                    active && styles.navLabelActive,
                    labelTransition,
                    { opacity: sidebarExpanded ? 1 : 0 },
                  ]}
                  numberOfLines={1}
                  pointerEvents="none"
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View
          style={[
            styles.main,
            mainTransition,
            { marginLeft: sidebarExpanded ? MAIN_GAP_EXPANDED : MAIN_GAP_COLLAPSED },
          ]}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    minHeight: '100vh' as unknown as number,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    paddingRight: spacing.md,
    paddingBottom: spacing.md,
  },
  sidebar: {
    paddingVertical: 28,
    paddingHorizontal: spacing.sm,
    overflow: 'hidden',
    flexShrink: 0,
    zIndex: 20,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: borderRadius.md,
    marginBottom: 4,
    position: 'relative',
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  navRowActive: {
    backgroundColor: colors.navHover,
  },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  navBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBadgeText: {
    color: colors.textLight,
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
  navIconActive: {
    backgroundColor: colors.navActive,
  },
  navLabel: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 14,
    flexShrink: 1,
  },
  navLabelActive: {
    color: colors.text,
  },
  main: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
});
