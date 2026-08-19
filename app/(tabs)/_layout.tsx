import React, { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebShell } from '@/src/components/layout/WebShell';
import { MobileShell } from '@/src/components/layout/MobileShell';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { useAuthGuard } from '@/src/hooks/useAuthGuard';
import { useActivityClock } from '@/src/hooks/useActivityStatus';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useCourtStore } from '@/src/stores/courtStore';
import { useAdminAlertCount } from '@/src/hooks/useAdminAlerts';
import { isStaffUser } from '@/src/utils/staffAccess';
import { NAV_ITEMS, ADMIN_NAV_ITEM } from '@/src/constants/nav';
import { View, Text } from 'react-native';
import { colors } from '@/src/theme';

type IconName = keyof typeof Ionicons.glyphMap;

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
  const { isDesktop, scale, isCompact } = useLayoutMode();
  const insets = useSafeAreaInsets();
  const isStaff = isStaffUser(useAuthStore((s) => s.currentUser));
  const isGuest = useAuthStore((s) => s.isGuestSession);
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useNotificationStore((s) => s.showToast);
  const promptedUserIdRef = useRef<string | null>(null);
  useAuthGuard();
  useActivityClock();

  useEffect(() => {
    if (!currentUser || isGuest) return;
    if (currentUser.kakaoId) return;
    if (promptedUserIdRef.current === currentUser.id) return;
    promptedUserIdRef.current = currentUser.id;
    showToast({
      type: 'info',
      title: '카카오 아이디 등록 안내',
      message: '프로필에서 카카오 아이디를 입력하면 단톡방 참여와 계정 매칭이 정확해져요.',
    });
  }, [currentUser, isGuest, showToast]);

  const tabBarHeight = 56 + insets.bottom;
  const tabIconSize = Math.round(24 * scale);
  const tabLabelSize = isCompact ? 10 : Math.max(10, Math.round(11 * scale));

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
              paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 6),
              paddingTop: 8,
            },
        tabBarLabelStyle: [styles.tabLabel, { fontSize: tabLabelSize }],
        tabBarItemStyle: styles.tabItem,
        headerShown: false,
        animation: Platform.OS === 'ios' ? 'shift' : 'fade',
      }}
    >
      {TAB_SCREENS.map(({ name, item }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            href: isGuest && name === 'friends' ? null : undefined,
            title: item.tabLabel,
            tabBarIcon: ({ focused }) => <TabIcon name={item.icon} focused={focused} size={tabIconSize} />,
            tabBarAccessibilityLabel: item.label,
          }}
          listeners={{
            tabPress: () => {
              // 코트 탭 재탭 또는 다른 탭으로 이동 시 확대 해제
              const { selectedCourtId, selectCourt } = useCourtStore.getState();
              if (selectedCourtId != null) selectCourt(null);
            },
          }}
        />
      ))}
      <Tabs.Screen
        name="admin"
        options={{
          href: isStaff ? undefined : null,
          title: ADMIN_NAV_ITEM.tabLabel,
          tabBarIcon: ({ focused }) => <AdminTabIcon focused={focused} size={tabIconSize} />,
          tabBarAccessibilityLabel: ADMIN_NAV_ITEM.label,
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
    marginTop: 1,
  },
  tabItem: {
    paddingTop: 2,
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
