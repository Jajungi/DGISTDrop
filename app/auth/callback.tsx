import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { createSessionFromOAuthUrl } from '@/src/services/supabase/socialAuth';
import { setSocialAuthFlash } from '@/src/services/supabase/socialAuthIntent';
import { useAuthStore } from '@/src/stores/authStore';
import { colors } from '@/src/theme';

async function finishCallback(url: string, applySocialSession: () => Promise<{
  success: boolean;
  message: string;
  redirectTo?: 'settings' | 'tabs';
}>) {
  await createSessionFromOAuthUrl(url);
  const result = await applySocialSession();
  if (result.success) {
    if (result.redirectTo === 'settings') {
      await setSocialAuthFlash(result.message);
      router.replace('/settings');
      return;
    }
    router.replace('/(tabs)');
    return;
  }
  await setSocialAuthFlash(result.message);
  router.replace(result.redirectTo === 'settings' ? '/settings' : '/login?tab=login');
}

export default function AuthCallbackScreen() {
  const applySocialSession = useAuthStore((s) => s.applySocialSession);

  useEffect(() => {
    void (async () => {
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          await finishCallback(window.location.href, applySocialSession);
          return;
        }

        const initial = await Linking.getInitialURL();
        if (initial) {
          await finishCallback(initial, applySocialSession);
          return;
        }

        router.replace('/login');
      } catch {
        router.replace('/login');
      }
    })();
  }, [applySocialSession]);

  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
