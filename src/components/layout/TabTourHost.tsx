import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useEffectiveSafeAreaInsets } from '@/src/hooks/useEffectiveSafeAreaInsets';
import { getTabBarHeight, shouldShowTabBarLabels } from '@/src/utils/safeArea';
import { useAppWindowSize } from '@/src/hooks/useAppWindowSize';
import { useAuthStore } from '@/src/stores/authStore';
import { useTabTourStore } from '@/src/stores/tabTourStore';
import { useFeatureFlagsStore } from '@/src/stores/featureFlagsStore';
import { TAB_TOUR_STEPS, tabTourBody } from '@/src/constants/tabTour';
import { isGuestUser } from '@/src/utils/guestAccess';
import { measureTourAnchor, type TourRect } from '@/src/utils/tourAnchors';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { Button } from '@/src/components/ui/Button';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

const CARD_W = 320;
const FADE_MS = 220;

function onPublicRoute(pathname: string | undefined): boolean {
  const p = pathname ?? '';
  return p.includes('login') || p.includes('privacy') || p.includes('delete-account');
}

function cardStyleFor(rect: TourRect | null, isDesktop: boolean, win: { width: number; height: number }) {
  if (!rect) {
    return isDesktop
      ? { left: 80, top: 96, width: CARD_W }
      : { left: spacing.md, right: spacing.md, bottom: 72, width: undefined as number | undefined };
  }
  if (isDesktop) {
    const top = Math.min(Math.max(12, rect.y + rect.height / 2 - 90), win.height - 220);
    return { left: Math.round(rect.x + rect.width + 14), top: Math.round(top), width: CARD_W };
  }
  const center = rect.x + rect.width / 2;
  const left = Math.min(Math.max(12, center - CARD_W / 2), win.width - CARD_W - 12);
  const bottom = Math.max(12, win.height - rect.y + 10);
  return { left: Math.round(left), bottom: Math.round(bottom), width: CARD_W };
}

export function TabTourHost() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useEffectiveSafeAreaInsets();
  const win = useWindowDimensions();
  const { isDesktop, isLandscape, isCompact, isNarrow } = useLayoutMode();
  const { width, height } = useAppWindowSize();
  const currentUser = useAuthStore((s) => s.currentUser);
  const isGuestSession = useAuthStore((s) => s.isGuestSession);
  const authHydrated = useAuthStore((s) => s.authHydrated);
  const reservationOn = useFeatureFlagsStore((s) => s.reservationEnabled);

  const hydrated = useTabTourStore((s) => s.hydrated);
  const done = useTabTourStore((s) => s.done);
  const activeIndex = useTabTourStore((s) => s.activeIndex);
  const hydrateForUser = useTabTourStore((s) => s.hydrateForUser);
  const startIfNeeded = useTabTourStore((s) => s.startIfNeeded);
  const next = useTabTourStore((s) => s.next);
  const skip = useTabTourStore((s) => s.skip);

  const guest = isGuestSession || isGuestUser(currentUser);
  const memberId = !guest && currentUser?.id ? currentUser.id : null;
  const opacity = useRef(new Animated.Value(0)).current;
  const [rect, setRect] = useState<TourRect | null>(null);

  useEffect(() => {
    if (!authHydrated) return;
    void hydrateForUser(memberId);
  }, [authHydrated, memberId, hydrateForUser]);

  useEffect(() => {
    if (!hydrated || done || !memberId || onPublicRoute(pathname)) return;
    startIfNeeded();
  }, [hydrated, done, memberId, pathname, startIfNeeded]);

  useEffect(() => {
    if (activeIndex === null) return;
    const href = TAB_TOUR_STEPS[activeIndex]?.href;
    if (!href) return;
    opacity.setValue(0);
    router.push(href);
    let cancelled = false;
    const timer = setTimeout(() => {
      void measureTourAnchor(href).then((nextRect) => {
        if (cancelled) return;
        setRect(nextRect);
        Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
      });
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeIndex, router, opacity]);

  if (activeIndex === null) return null;
  const step = TAB_TOUR_STEPS[activeIndex];
  if (!step) return null;

  const last = activeIndex === TAB_TOUR_STEPS.length - 1;
  const showTabLabels = shouldShowTabBarLabels({
    isLandscape,
    isCompact,
    isNarrow,
    tabCount: 6,
    width,
    height,
  });
  const tabBarH = isDesktop ? 0 : getTabBarHeight(insets, isLandscape, showTabLabels);
  const sidebarW = isDesktop ? 64 : 0;
  const pos = cardStyleFor(rect, isDesktop, win);

  const fadeOutThen = (fn: () => void) => {
    Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }).start(({ finished }) => {
      if (finished) fn();
    });
  };

  const goNext = () => fadeOutThen(next);
  const goSkip = () => fadeOutThen(skip);

  return (
    <View style={[styles.root, { pointerEvents: 'box-none' }]}>
      <View
        style={[
          styles.dim,
          {
            top: 0,
            left: sidebarW,
            right: 0,
            bottom: tabBarH,
            backgroundColor: colors.overlay,
            pointerEvents: 'auto',
          },
        ]}
      />
      <Animated.View
        style={[
          styles.card,
          {
            pointerEvents: 'auto',
            opacity,
            left: pos.left,
            width: pos.width,
            ...(pos.top != null ? { top: pos.top } : {}),
            ...(pos.bottom != null ? { bottom: pos.bottom } : {}),
            ...(pos.right != null ? { right: pos.right } : {}),
          },
        ]}
      >
        {isDesktop ? (
          <View
            style={[
              styles.caret,
              styles.caretLeft,
              {
                top: rect
                  ? Math.min(Math.max(18, rect.y + rect.height / 2 - (pos.top ?? 0) - 6), 160)
                  : 40,
              },
            ]}
          />
        ) : (
          <View
            style={[
              styles.caret,
              styles.caretDown,
              {
                left: rect
                  ? Math.min(
                      Math.max(18, rect.x + rect.width / 2 - (typeof pos.left === 'number' ? pos.left : 12) - 6),
                      CARD_W - 24
                    )
                  : CARD_W / 2 - 6,
              },
            ]}
          />
        )}
        <Text style={styles.progress}>
          {activeIndex + 1}/{TAB_TOUR_STEPS.length}
        </Text>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.body}>{tabTourBody(step, reservationOn)}</Text>
        <View style={styles.actions}>
          <Pressable onPress={goSkip} accessibilityRole="button" style={styles.skipHit}>
            <Text style={styles.skip}>건너뛰기</Text>
          </Pressable>
          <Button title={last ? '시작하기' : '다음'} onPress={goNext} size="sm" />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 40,
  },
  dim: {
    position: 'absolute',
  },
  card: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
    maxWidth: CARD_W,
    overflow: 'visible',
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(0,0,0,0.18)' } as object,
      default: {
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
  progress: {
    ...typography.small,
    color: colors.textMuted,
  },
  title: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 17,
  },
  body: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  skipHit: {
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  skip: {
    ...typography.caption,
    color: colors.textMuted,
  },
  caret: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  caretLeft: {
    left: -7,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  caretDown: {
    bottom: -7,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
});
