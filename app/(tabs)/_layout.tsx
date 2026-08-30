import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Platform, StyleSheet, Pressable, type PressableProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffectiveSafeAreaInsets } from '@/src/hooks/useEffectiveSafeAreaInsets';
import { WebShell } from '@/src/components/layout/WebShell';
import { useAppWindowSize } from '@/src/hooks/useAppWindowSize';
import {
  getTabBarHeight,
  getTabBarPaddingBottom,
  shouldShowTabBarLabels,
} from '@/src/utils/safeArea';
import { MobileShell } from '@/src/components/layout/MobileShell';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { useAuthGuard } from '@/src/hooks/useAuthGuard';
import { useActivityClock } from '@/src/hooks/useActivityStatus';
import { useAuthStore } from '@/src/stores/authStore';
import { useCourtStore } from '@/src/stores/courtStore';
import { useAdminAlertCount } from '@/src/hooks/useAdminAlerts';
import { isStaffUser } from '@/src/utils/staffAccess';
import { NAV_ITEMS, ADMIN_NAV_ITEM } from '@/src/constants/nav';
import { TAB_TOUR_STEPS } from '@/src/constants/tabTour';
import { useTabTourStore } from '@/src/stores/tabTourStore';
import { TourAnchor } from '@/src/utils/tourAnchors';
import { colors } from '@/src/theme';

type IconName = keyof typeof Ionicons.glyphMap;

/** 웹에서 href가 <a>가 되면 문서 전체가 다시 로드된다. 탭은 앱 안에서만 전환. */
function SpaTabButton({
  href: _href,
  onPress,
  style,
  children,
  ...rest
}: PressableProps & { href?: string | null }) {
  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        { flex: 1 },
        Platform.select({ web: { cursor: 'pointer' as const } }),
      ]}
      onPress={(e) => {
        e?.preventDefault?.();
        onPress?.(e);
      }}
    >
      {children}
    </Pressable>
  );
}

function TabIcon({ name, focused, size }: { name: IconName; focused: boolean; size: number }) {
  return (
    <Ionicons
      name={focused ? name : (`${name}-outline` as IconName)}
      size={size}
      color={focused ? colors.primary : colors.textMuted}
    />
  );
}

function AdminTabIcon({ focused, size }: { focused: boolean; size: number }) {
  const alerts = useAdminAlertCount();
  const name = ADMIN_NAV_ITEM.icon;
  return (
    <View style={styles.adminIconWrap}>
      <Ionicons
        name={focused ? name : (`${name}-outline` as IconName)}
        size={size}
        color={focused ? colors.primary : colors.textMuted}
      />
      {alerts > 0 ? (
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>{alerts > 9 ? '9+' : alerts}</Text>
        </View>
      ) : null}
    </View>
  );
}

const TAB_SCREENS = [
  { name: 'index' as const, item: NAV_ITEMS[0] },
  { name: 'friends' as const, item: NAV_ITEMS[1] },
  { name: 'lobby' as const, item: NAV_ITEMS[2] },
  { name: 'profile' as const, item: NAV_ITEMS[3] },
  { name: 'guide' as const, item: NAV_ITEMS[4] },
];

export default function TabLayout() {
  const { isDesktop, scale, isCompact, isLandscape, isNarrow } = useLayoutMode();
  const { width, height } = useAppWindowSize();
  const insets = useEffectiveSafeAreaInsets();
  const isStaff = isStaffUser(useAuthStore((s) => s.currentUser));
  const isGuest = useAuthStore((s) => s.isGuestSession);
  const tabCount = TAB_SCREENS.length + (isStaff ? 1 : 0) - (isGuest ? 1 : 0);
  const showTabLabels = shouldShowTabBarLabels({
    isLandscape,
    isCompact,
    isNarrow,
    tabCount,
    width,
    height,
  });
  const tourHref = useTabTourStore((s) =>
    s.activeIndex === null ? null : TAB_TOUR_STEPS[s.activeIndex]?.href ?? null
  );
  useAuthGuard();
  useActivityClock();

  const tabBarHeight = getTabBarHeight(insets, isLandscape, showTabLabels);
  const tabIconSize = Math.round((showTabLabels ? 24 : 26) * scale);
  const tabLabelSize = Math.max(10, Math.round(11 * scale));
  const tabPaddingBottom = getTabBarPaddingBottom(insets);
  const tabPaddingTop = showTabLabels ? (isLandscape ? 4 : 6) : 8;

  const tabs = (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: isDesktop
          ? styles.tabBarHidden
          : {
              ...styles.tabBar,
              height: tabBarHeight,
              paddingBottom: tabPaddingBottom,
              paddingTop: tabPaddingTop,
            },
        tabBarShowLabel: showTabLabels,
        tabBarLabelStyle: [
          styles.tabLabel,
          { fontSize: tabLabelSize, lineHeight: tabLabelSize + 2 },
        ],
        tabBarItemStyle: styles.tabItem,
        headerShown: false,
        animation: Platform.OS === 'ios' ? 'shift' : 'fade',
      }}
    >
      {TAB_SCREENS.map(({ name, item }) => {
        const hidden = isGuest && name === 'friends';
        return (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: item.tabLabel,
            tabBarIcon: ({ focused }) => <TabIcon name={item.icon} focused={focused} size={tabIconSize} />,
            tabBarAccessibilityLabel: item.label,
            tabBarItemStyle: [
              styles.tabItem,
              tourHref === item.href ? styles.tabItemTour : null,
            ],
            ...(hidden
              ? { href: null }
              : {
                  tabBarButton: (props) => (
                    <TourAnchor href={item.href} style={{ flex: 1 }}>
                      <SpaTabButton {...props} />
                    </TourAnchor>
                  ),
                }),
          }}
          listeners={{
            tabPress: (e) => {
              if (useTabTourStore.getState().activeIndex !== null) {
                e.preventDefault();
                return;
              }
              const { selectedCourtId, selectCourt } = useCourtStore.getState();
              if (selectedCourtId != null) selectCourt(null);
            },
          }}
        />
        );
      })}
      <Tabs.Screen
        name="admin"
        options={{
          title: ADMIN_NAV_ITEM.tabLabel,
          tabBarIcon: ({ focused }) => <AdminTabIcon focused={focused} size={tabIconSize} />,
          tabBarAccessibilityLabel: ADMIN_NAV_ITEM.label,
          ...(isStaff
            ? {
                tabBarButton: (props) => (
                  <TourAnchor href={ADMIN_NAV_ITEM.href} style={{ flex: 1 }}>
                    <SpaTabButton {...props} />
                  </TourAnchor>
                ),
              }
            : { href: null }),
        }}
      />
    </Tabs>
  );

  if (isDesktop) {
    return <WebShell>{tabs}</WebShell>;
  }

  return <MobileShell>{tabs}</MobileShell>;
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.tabBar,
    ...Platform.select({
      web: { boxShadow: '0 -2px 10px rgba(136,148,171,0.14)' } as object,
      ios: {
        shadowColor: '#8894AB',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      default: { elevation: 8 },
    }),
  },
  tabBarHidden: { display: 'none' },
  tabLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    lineHeight: 12,
    marginTop: 0,
  },
  tabItem: {
    paddingTop: 0,
    justifyContent: 'center',
  },
  tabItemTour: {
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
  },
  adminIconWrap: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBadge: {
    position: 'absolute',
    top: -5,
    right: 2,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    borderRadius: 7.5,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBadgeText: {
    color: colors.textLight,
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
});
