import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Text,
  useWindowDimensions,
  type View as RNView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import type { Court } from '@/src/types';
import { CourtGrid } from './CourtGrid';
import { CourtIllustration } from './CourtIllustration';
import { CourtPlayerProfiles } from './CourtPlayerProfiles';
import { CourtDetailContent, type CourtDetailContentProps } from './CourtDetailContent';
import { TouchGuard } from '@/src/components/ui/TouchGuard';
import { getCourtHeight, COURT_ASPECT } from '@/src/constants/court';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

interface CourtExpandViewProps {
  courts: Court[];
  selectedCourtId: number | null;
  selectedCourt: Court | null;
  onCourtPress: (court: Court) => void;
  onDeselect: () => void;
  onRegisterClose: (close: () => void) => void;
  /** 페이지 스크롤 시 패널 높이 재측정 */
  onRegisterRemeasure?: (remeasure: () => void) => void;
  filter?: 'all' | 'empty' | 'mine';
  myUserId?: string;
  detailProps: Omit<
    CourtDetailContentProps,
    | 'court'
    | 'courtPreviewWidth'
    | 'hideCourtPreview'
    | 'showInlineCourt'
    | 'embedded'
    | 'onDismiss'
  >;
}

const EXPAND_MS = 320;
const COLLAPSE_MS = 280;
const EXPAND_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const COLLAPSE_EASING = Easing.bezier(0.4, 0, 0.2, 1);
const EXPAND_TIMING = { duration: EXPAND_MS, easing: EXPAND_EASING };
const COLLAPSE_TIMING = { duration: COLLAPSE_MS, easing: COLLAPSE_EASING };
const CLUSTER_PAD = 8;
const DETAIL_HEADER_H = 48;

export function CourtExpandView({
  courts,
  selectedCourtId,
  selectedCourt,
  onCourtPress,
  onDeselect,
  onRegisterClose,
  onRegisterRemeasure,
  filter,
  myUserId,
  detailProps,
}: CourtExpandViewProps) {
  const { headerHeight, tabBarHeight, needsHorizontalScroll, isDesktop } = useLayoutMode();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const containerRef = useRef<RNView>(null);
  const cardRefs = useRef<Map<number, RNView>>(new Map());
  const pendingCourtRef = useRef<Court | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 400, height: 400 });
  const [containerScreenY, setContainerScreenY] = useState(0);

  const progress = useSharedValue(0);
  const detailTopY = useSharedValue(0);
  const detailPanelH = useSharedValue(280);

  const computePanel = useCallback(
    (containerH: number, screenY?: number) => {
      const cy = screenY ?? containerScreenY;
      const visibleBottom = windowHeight - tabBarHeight;
      const panelTopScreen = Math.max(cy + CLUSTER_PAD, insets.top + headerHeight + CLUSTER_PAD);
      const available = Math.max(200, visibleBottom - panelTopScreen - CLUSTER_PAD);
      // 모바일: 패널이 남는 여백을 덜 먹도록 가용 높이의 일부만 사용
      const heightBudget = !isDesktop ? Math.min(available, available * 0.92) : available;
      const detailHeight = Math.max(220, Math.min(containerH - CLUSTER_PAD * 2, heightBudget));
      let detailTop = panelTopScreen - cy;
      detailTop = Math.max(CLUSTER_PAD, Math.min(detailTop, containerH - detailHeight - CLUSTER_PAD));
      return { detailTop, detailHeight };
    },
    [containerScreenY, headerHeight, insets.top, isDesktop, tabBarHeight, windowHeight]
  );

  const applyTarget = useCallback(
    (containerH: number, screenY?: number) => {
      const t = computePanel(containerH, screenY);
      detailTopY.value = t.detailTop;
      detailPanelH.value = t.detailHeight;
      if (screenY !== undefined) setContainerScreenY(screenY);
    },
    [computePanel, detailPanelH, detailTopY]
  );

  const remeasureTarget = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    container.measureInWindow((_cx, cy) => {
      applyTarget(containerSize.height, cy);
    });
  }, [applyTarget, containerSize.height]);

  const measureAndExpand = useCallback(
    (containerH: number, onReady?: () => void) => {
      const container = containerRef.current;
      if (!container) {
        remeasureTarget();
        onReady?.();
        return;
      }
      container.measureInWindow((_cx, cy) => {
        applyTarget(containerH, cy);
        onReady?.();
      });
    },
    [applyTarget, remeasureTarget]
  );

  const startExpand = useCallback(() => {
    cancelAnimation(progress);
    progress.value = withTiming(1, EXPAND_TIMING);
  }, [progress]);

  const requestClose = useCallback(() => {
    cancelAnimation(progress);
    progress.value = withTiming(0, COLLAPSE_TIMING, (finished) => {
      if (finished) runOnJS(onDeselect)();
    });
  }, [onDeselect, progress]);

  useEffect(() => {
    onRegisterClose(requestClose);
  }, [onRegisterClose, requestClose]);

  useEffect(() => {
    onRegisterRemeasure?.(remeasureTarget);
  }, [onRegisterRemeasure, remeasureTarget]);

  useEffect(() => {
    remeasureTarget();
  }, [containerSize, remeasureTarget]);

  useEffect(() => {
    if (selectedCourtId == null) {
      // 다른 페이지 이동 등으로 selectCourt(null)만 된 경우 — progress가 1이면 그리드가 투명하게 남음
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    measureAndExpand(containerSize.height, startExpand);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourtId, measureAndExpand, startExpand]);

  const registerCourtRef = useCallback((id: number, ref: RNView | null) => {
    if (ref) cardRefs.current.set(id, ref);
    else cardRefs.current.delete(id);
  }, []);

  const handleCourtPress = useCallback(
    (court: Court) => {
      if (selectedCourtId === court.id) {
        requestClose();
        return;
      }
      if (selectedCourtId != null) {
        pendingCourtRef.current = court;
        cancelAnimation(progress);
        progress.value = withTiming(0, { duration: 200, easing: COLLAPSE_EASING }, (finished) => {
          if (!finished) return;
          const next = pendingCourtRef.current;
          pendingCourtRef.current = null;
          if (next) runOnJS(onCourtPress)(next);
        });
        return;
      }
      onCourtPress(court);
    },
    [onCourtPress, progress, requestClose, selectedCourtId]
  );

  const panelGeom = useMemo(
    () => computePanel(containerSize.height, containerScreenY),
    [computePanel, containerSize.height, containerScreenY]
  );

  const narrowSplit = !isDesktop || windowWidth < 900;

  const splitCourtSize = useMemo(() => {
    const bodyH = Math.max(100, panelGeom.detailHeight - DETAIL_HEADER_H - (narrowSplit ? 8 : 16));
    const maxW = narrowSplit
      ? Math.min(containerSize.width - 32, Math.min(bodyH * 0.36, 168) * COURT_ASPECT)
      : isDesktop
        ? Math.min(containerSize.width * 0.55, bodyH * COURT_ASPECT)
        : Math.min(containerSize.width * 0.48, bodyH * COURT_ASPECT);
    const width = Math.max(narrowSplit ? 100 : 120, maxW);
    return { width, height: getCourtHeight(width) };
  }, [containerSize.width, isDesktop, narrowSplit, panelGeom.detailHeight]);

  const gridStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45, 1], [1, 0.2, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(progress.value, [0, 1], [0, 16], Extrapolation.CLAMP) }],
  }));

  const detailStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    right: 0,
    top: detailTopY.value,
    height: detailPanelH.value,
    opacity: interpolate(progress.value, [0.08, 0.4], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(progress.value, [0.08, 0.4], [20, 0], Extrapolation.CLAMP) }],
  }));

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setContainerSize({ width, height });
      }}
    >
      <Animated.View
        style={[styles.gridLayer, gridStyle, { pointerEvents: selectedCourtId ? 'none' : 'auto' }]}
      >
        {needsHorizontalScroll ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            scrollEnabled={!selectedCourtId}
            contentContainerStyle={styles.hScrollContent}
          >
            <CourtGrid
              courts={courts}
              onCourtPress={handleCourtPress}
              selectedCourtId={selectedCourtId}
              filter={filter}
              myUserId={myUserId}
              registerCourtRef={registerCourtRef}
              showCoachingLink={!selectedCourtId}
            />
          </ScrollView>
        ) : (
          <CourtGrid
            courts={courts}
            onCourtPress={handleCourtPress}
            selectedCourtId={selectedCourtId}
            filter={filter}
            myUserId={myUserId}
            registerCourtRef={registerCourtRef}
            showCoachingLink={!selectedCourtId}
          />
        )}
      </Animated.View>

      {selectedCourt && (
        <>
          <Pressable
            style={styles.dismissBackdrop}
            onPress={requestClose}
            accessibilityRole="button"
            accessibilityLabel="코트 목록으로 돌아가기"
          />

          <Animated.View
            style={[
              styles.detailLayer,
              detailStyle,
              { pointerEvents: selectedCourtId ? 'box-none' : 'none' },
            ]}
          >
            <View style={styles.detailHeader} pointerEvents="box-none">
              <TouchGuard>
                <Pressable onPress={requestClose} style={styles.backBtn}>
                  <Text style={styles.backText}>← 코트 목록</Text>
                </Pressable>
              </TouchGuard>
              <Pressable style={styles.headerCenter} onPress={requestClose}>
                <Text style={styles.detailTitle}>{selectedCourt.id}번</Text>
              </Pressable>
              <TouchGuard>
                <Pressable onPress={requestClose} style={styles.closeBtn}>
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              </TouchGuard>
            </View>

            <View
              style={[
                styles.splitBody,
                narrowSplit && styles.splitBodyStack,
                narrowSplit && styles.splitBodyStackTight,
              ]}
            >
              <Pressable
                style={[styles.splitCourtCol, narrowSplit && styles.splitCourtColStack]}
                onPress={requestClose}
                accessibilityRole="button"
                accessibilityLabel="코트 목록으로 돌아가기"
              >
                <View style={[styles.courtVisual, { width: splitCourtSize.width, height: splitCourtSize.height }]}>
                  <CourtIllustration
                    court={selectedCourt}
                    width={splitCourtSize.width}
                    borderRadius={borderRadius.md}
                  />
                  <CourtPlayerProfiles
                    players={selectedCourt.players}
                    avatarSize={Math.max(12, Math.min(22, splitCourtSize.width * 0.08))}
                    courtWidth={splitCourtSize.width}
                    courtHeight={splitCourtSize.height}
                    compact={splitCourtSize.width < 220}
                  />
                </View>
              </Pressable>
              <View style={[styles.splitDetailCol, narrowSplit && styles.splitDetailColStack]}>
                <CourtDetailContent
                  court={selectedCourt}
                  hideCourtPreview
                  showInlineCourt={false}
                  embedded
                  {...detailProps}
                />
              </View>
            </View>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 200 },
  gridLayer: {},
  hScrollContent: { minWidth: '100%' },
  dismissBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 16,
  },
  detailLayer: {
    zIndex: 25,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: { paddingVertical: 4, paddingHorizontal: 2 },
  backText: { ...typography.button, color: colors.primary, fontSize: 14 },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  detailTitle: { ...typography.h3, color: colors.text, fontSize: 16 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.navActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: colors.textLight, fontSize: 14, fontWeight: '700', lineHeight: 16 },
  courtVisual: {
    overflow: 'hidden',
    borderRadius: borderRadius.md,
    position: 'relative',
  },
  splitBody: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    padding: spacing.md,
  },
  splitBodyStack: {
    flexDirection: 'column',
  },
  splitBodyStackTight: {
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  splitCourtCol: {
    flexGrow: 0,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitCourtColStack: {
    alignSelf: 'center',
    marginBottom: 0,
  },
  splitDetailCol: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  splitDetailColStack: {
    flex: 1,
    minHeight: 120,
  },
});
