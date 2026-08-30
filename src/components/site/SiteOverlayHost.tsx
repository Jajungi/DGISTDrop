import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';
import { useSiteOverlayStore } from '@/src/stores/siteOverlayStore';
import { useTabTourStore } from '@/src/stores/tabTourStore';
import { overlaysForSurface } from '@/src/utils/siteOps';
import type { SiteOverlay, SiteOverlaySurface } from '@/src/types';
import { Button } from '@/src/components/ui/Button';
import { colors, spacing, typography, borderRadius } from '@/src/theme';
import { useI18n } from '@/src/i18n/useI18n';
import { localizedBody, localizedTitle } from '@/src/i18n/localizedContent';

function dismissKey(overlayId: string, userKey: string) {
  return `site_overlay_dismissed:${userKey}:${overlayId}`;
}

async function isDismissed(overlayId: string, userKey: string): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(dismissKey(overlayId, userKey));
    return v === '1';
  } catch {
    return false;
  }
}

async function markDismissed(overlayId: string, userKey: string) {
  try {
    await AsyncStorage.setItem(dismissKey(overlayId, userKey), '1');
  } catch {
    /* ignore */
  }
}

interface SiteOverlayHostProps {
  /** 강제 표면 (로그인 화면 등). 없으면 경로·인증 상태로 추론 */
  surface?: SiteOverlaySurface;
}

export function SiteOverlayHost({ surface: forcedSurface }: SiteOverlayHostProps) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUserId = useAuthStore((s) => s.currentUser?.id);
  const overlays = useSiteOverlayStore((s) => s.overlays);

  const surfaceLabel = useCallback(
    (s: SiteOverlaySurface) => {
      if (s === 'login') return t('guide.surfaceLogin');
      if (s === 'post_login') return t('guide.surfacePostLogin');
      return t('guide.surfaceHome');
    },
    [t]
  );

  const surface: SiteOverlaySurface | null = useMemo(() => {
    if (forcedSurface) return forcedSurface;
    if (!isAuthenticated) return null;
    const p = pathname ?? '';
    if (
      p === '/' ||
      p === '/index' ||
      p.endsWith('/(tabs)') ||
      p === '/(tabs)/' ||
      p.endsWith('/(tabs)/index') ||
      /^\/?\(tabs\)\/?$/.test(p)
    ) {
      return 'home';
    }
    return null;
  }, [forcedSurface, isAuthenticated, pathname]);

  const candidates = useMemo(
    () => (surface ? overlaysForSurface(overlays, surface) : []),
    [overlays, surface]
  );

  const userKey = currentUserId ?? (surface === 'login' ? 'anon' : 'session');
  const [active, setActive] = useState<SiteOverlay | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!candidates.length) {
        if (!cancelled) setActive(null);
        return;
      }
      for (const o of candidates) {
        if (dismissedIds.has(o.id)) continue;
        if (await isDismissed(o.id, userKey)) continue;
        if (!cancelled) {
          setActive(o);
          return;
        }
      }
      if (!cancelled) setActive(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [candidates, userKey, dismissedIds]);

  const close = useCallback(
    async (remember: boolean) => {
      if (!active) return;
      if (remember && active.dismissible) {
        await markDismissed(active.id, userKey);
        setDismissedIds((prev) => new Set(prev).add(active.id));
      } else if (!active.dismissible) {
        setDismissedIds((prev) => new Set(prev).add(active.id));
      } else {
        setDismissedIds((prev) => new Set(prev).add(active.id));
      }
      setActive(null);
    },
    [active, userKey]
  );

  if (!active) return null;

  const title = localizedTitle(active, locale);
  const body = localizedBody(active, locale);

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.accent} />
          <Text style={styles.badge}>
            {t('guide.overlayBadge', { surface: surfaceLabel(surface ?? 'home') })}
          </Text>
          <Text style={styles.title}>{title}</Text>
          {!!body && <Text style={styles.body}>{body}</Text>}
          <View style={styles.actions}>
            {active.dismissible ? (
              <Button
                title={t('guide.overlayConfirm')}
                onPress={() => void close(true)}
                size="md"
                fullWidth
              />
            ) : (
              <Button
                title={t('guide.overlayClose')}
                onPress={() => void close(false)}
                size="md"
                fullWidth
              />
            )}
          </View>
          {Platform.OS === 'web' && active.dismissible ? (
            <Pressable onPress={() => void close(true)} accessibilityRole="button">
              <Text style={styles.hint}>{t('guide.overlayDontShow')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

/** 로그인 성공 직후 한 번 — tabs 진입 시 호출 */
export function PostLoginOverlayGate() {
  const [ready, setReady] = useState(false);
  const tourOpen = useTabTourStore((s) => s.activeIndex !== null);
  useEffect(() => {
    try {
      const flag =
        typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('post_login_overlay') : null;
      if (flag === '1') {
        sessionStorage.removeItem('post_login_overlay');
        setReady(true);
      }
    } catch {
      /* native: use module flag */
    }
    if (consumePostLoginFlag()) setReady(true);
  }, []);
  if (!ready || tourOpen) return null;
  return <SiteOverlayHost surface="post_login" />;
}

let postLoginFlag = false;
export function markPostLoginOverlay() {
  postLoginFlag = true;
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('post_login_overlay', '1');
  } catch {
    /* ignore */
  }
}
function consumePostLoginFlag() {
  if (!postLoginFlag) return false;
  postLoginFlag = false;
  return true;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    gap: spacing.sm,
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
  },
  badge: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 4,
  },
  title: { ...typography.h3, color: colors.text, fontSize: 18 },
  body: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  actions: { marginTop: spacing.sm },
  hint: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
});
