import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { ToastContainer } from '@/src/components/ui/ToastContainer';
import { SirenModal } from '@/src/components/ui/SirenModal';
import {
  PostLoginOverlayGate,
} from '@/src/components/site/SiteOverlayHost';
import { colors, fonts, typography } from '@/src/theme';
import { hydrateAppStateFromDisk } from '@/src/services/hydrateApp';
import { initCrossTabSync } from '@/src/services/crossTabSync';
import { initServerSync } from '@/src/services/serverSync';
import { initSupabaseApp } from '@/src/services/supabase/init';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import { useFriendArrivalWatch } from '@/src/hooks/useFriendArrivalWatch';
import { PushPermissionGate } from '@/src/components/profile/PushPermissionGate';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFriendArrivalWatch();

  const [loaded, error] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    BebasNeue_400Regular,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
    ...Ionicons.font,
  });

  useEffect(() => {
    if (error) {
      console.warn('[fonts] load error, continuing with fallbacks', error);
    }
  }, [error]);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void import('@/src/services/localNotifications').then((m) => m.initLocalNotifications());
  }, []);

  useEffect(() => {
    initCrossTabSync();
    void (async () => {
      if (isSupabaseEnabled()) {
        await initSupabaseApp();
        return;
      }
      await hydrateAppStateFromDisk();
      await initServerSync();
    })();
  }, []);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerTitleStyle: {
              fontFamily: fonts.serif,
              fontWeight: '600',
              fontSize: 18,
            },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen
            name="user/[id]"
            options={{ title: '프로필', presentation: 'card' }}
          />
          <Stack.Screen
            name="coaching"
            options={{ title: '코칭 · 레슨', presentation: 'card' }}
          />
          <Stack.Screen
            name="settings"
            options={{ title: '설정', presentation: 'card' }}
          />
        </Stack>
        <ToastContainer />
        <SirenModal />
        <PushPermissionGate />
        <PostLoginOverlayGate />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
