import { useEffect } from 'react';
import { router, useSegments } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';
import { isAppReadyMember } from '@/src/utils/socialSignup';

/** 로그인하지 않으면 /login 으로 보냄 */
export function useAuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authHydrated = useAuthStore((s) => s.authHydrated);
  const currentUser = useAuthStore((s) => s.currentUser);
  const canEnterApp = isAppReadyMember(currentUser);
  const segments = useSegments();

  useEffect(() => {
    if (!authHydrated) return;
    const route = String(segments[0] ?? '');
    const publicRoute = route === 'login' || route === 'privacy' || route === 'auth';
    if (!isAuthenticated && !publicRoute) {
      router.replace('/login');
    } else if (isAuthenticated && !canEnterApp) {
      if (route !== 'login' && route !== 'auth') {
        router.replace('/login');
      }
    } else if (isAuthenticated && canEnterApp && route === 'login') {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, authHydrated, canEnterApp, segments]);
}
