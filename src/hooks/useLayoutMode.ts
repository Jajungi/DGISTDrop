import { useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCourtHeight, COURT_ASPECT, GYM_COURT_ROWS } from '@/src/constants/court';
import { WEB_BREAKPOINT } from '@/src/constants/nav';
import { spacing } from '@/src/theme';
import { useActivityStatus } from '@/src/hooks/useActivityStatus';
import { getResponsiveMetrics, getScaledBorderRadius } from '@/src/utils/responsive';
import {
  buildGymGridLayout,
  GYM_ROW_ENTRANCE_GAP,
} from '@/src/utils/gymGridGeometry';

const GRID_BOTTOM_BUFFER = 12;
const SHADOW_BLEED = 14;
const MOBILE_SCROLL_BUFFER = 8;
const MOBILE_TAB_BAR_BASE = 56;
const MOBILE_HEADER_BASE = 52;
const COACHING_LINK_HEIGHT = 44;
const MOBILE_MIN_COURT = 96;
const DESKTOP_MIN_COURT = 40;

export function useLayoutMode() {
  const { width: rawWidth, height: rawHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isActive } = useActivityStatus();

  const width = Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : 390;
  const height = Number.isFinite(rawHeight) && rawHeight > 0 ? rawHeight : 800;

  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && width >= WEB_BREAKPOINT;
  const isMobile = !isDesktop;
  const isLandscape = isMobile && width > height * 1.08;
  const responsive = getResponsiveMetrics(isLandscape ? Math.min(width, height) : width, isDesktop);
  const { scale, scaledTypography, scaledSpacing } = responsive;
  const isCompact = responsive.isCompact || isLandscape;
  const isNarrow = responsive.isNarrow;
  const scaledBorderRadius = getScaledBorderRadius(width, isDesktop);

  const sidebarWidth = isDesktop ? 56 : 0;
  const outerPaddingH = isDesktop ? spacing.md : scaledSpacing.xs;
  const panelPaddingH = isDesktop ? spacing.lg : scaledSpacing.sm;
  const panelPaddingHTotal = outerPaddingH * 2 + panelPaddingH * 2;
  const gridPanelWidth = Math.max(120, width - sidebarWidth - panelPaddingHTotal);

  const courtColumns = 3;
  const courtGap = isDesktop ? 8 : isNarrow ? 8 : 10;
  const gridPadding = 0;
  const entranceGutter = isDesktop ? 18 : 12;
  const cardHPad = isDesktop ? 3 : 0;
  const cardChromeTop = isDesktop ? 14 : 10;
  const cardChrome = cardChromeTop + 3;

  const floorStageH = 18;
  const floorHeaderH = isDesktop ? 16 : 13;
  const floorContentTop = floorStageH + floorHeaderH;
  const aisleH = Math.max(6, Math.round(courtGap * 0.85));

  const tabBarHeight = isDesktop ? 0 : isLandscape ? 48 + insets.bottom : MOBILE_TAB_BAR_BASE + insets.bottom;
  const headerHeight = isDesktop ? 72 : isLandscape ? 40 : isCompact ? 48 : MOBILE_HEADER_BASE;
  const sectionHeaderHeight = isDesktop
    ? 112
    : isLandscape
      ? 56
      : isNarrow
        ? 76
        : isCompact
          ? 82
          : height < 680
            ? 88
            : 100;
  const activityBannerHeight = isActive ? 0 : isLandscape ? 32 : isCompact ? 44 : 52;
  const panelPaddingV = isDesktop ? spacing.lg + spacing.sm : isLandscape ? scaledSpacing.xs : scaledSpacing.md + scaledSpacing.xs;
  const outerPaddingV = isDesktop ? spacing.md : scaledSpacing.xs;

  const rows = GYM_COURT_ROWS.length;

  const gridAreaHeight = Math.max(
    160,
    height -
      insets.top -
      tabBarHeight -
      headerHeight -
      sectionHeaderHeight -
      activityBannerHeight -
      panelPaddingV -
      outerPaddingV -
      SHADOW_BLEED -
      (isMobile && !isLandscape ? MOBILE_SCROLL_BUFFER : 0)
  );

  const verticalOverhead =
    floorContentTop +
    cardChrome * rows +
    aisleH * (rows - 1) +
    COACHING_LINK_HEIGHT +
    GRID_BOTTOM_BUFFER +
    SHADOW_BLEED +
    30;

  const courtWidthFromWidth =
    (gridPanelWidth -
      gridPadding * 2 -
      entranceGutter -
      GYM_ROW_ENTRANCE_GAP -
      courtGap * (courtColumns - 1) -
      cardHPad * 2 * courtColumns) /
    courtColumns;

  const availableForRows = gridAreaHeight - verticalOverhead;
  const courtWidthFromHeight =
    availableForRows > 0 ? (availableForRows / rows) * COURT_ASPECT : MOBILE_MIN_COURT;

  const minCourt = isDesktop ? DESKTOP_MIN_COURT : isLandscape ? 56 : MOBILE_MIN_COURT;
  const fitFromWidth = Math.max(1, courtWidthFromWidth);
  const fitFromHeight = Math.max(1, courtWidthFromHeight);
  let courtWidth = Math.max(
    minCourt,
    Math.floor(
      isDesktop ? fitFromWidth : isLandscape ? Math.min(fitFromWidth, fitFromHeight) : fitFromHeight
    )
  );

  const layoutInput = {
    courtGap,
    entranceGutter,
    cardHPad,
    cardChromeTop,
    floorStageH,
    floorHeaderH,
    aisleH,
    panelWidth: gridPanelWidth,
  };

  let gym = buildGymGridLayout({ ...layoutInput, courtWidth });

  const measureContentHeight = (g: typeof gym) =>
    g.floorContentTop +
    g.rowBlockHeight * rows +
    g.aisleH * (rows - 1) +
    COACHING_LINK_HEIGHT +
    GRID_BOTTOM_BUFFER +
    SHADOW_BLEED +
    30;

  let gridContentHeight = measureContentHeight(gym);

  if (isLandscape) {
    const overflow = Math.max(
      gym.intrinsicFloorWidth / Math.max(1, gridPanelWidth),
      gridContentHeight / Math.max(1, gridAreaHeight),
      1
    );
    if (overflow > 1.01) {
      courtWidth = Math.max(48, Math.floor(courtWidth / overflow));
      gym = buildGymGridLayout({ ...layoutInput, courtWidth });
      gridContentHeight = measureContentHeight(gym);
    }
  }

  const needsHorizontalScroll =
    isMobile && !isLandscape && gym.intrinsicFloorWidth > gridPanelWidth + 1;
  const gridRenderWidth = needsHorizontalScroll ? gym.intrinsicFloorWidth : gridPanelWidth;
  const gymForRender = buildGymGridLayout({
    ...layoutInput,
    courtWidth,
    panelWidth: gridRenderWidth,
  });

  const fitsOnScreen = gridContentHeight <= gridAreaHeight + SHADOW_BLEED;
  const expandAreaHeight = Math.max(gridContentHeight, gridAreaHeight);
  const needsVerticalScroll = isLandscape ? false : !fitsOnScreen;

  return {
    isWeb,
    isDesktop,
    isMobile,
    isLandscape,
    isCompact,
    isNarrow,
    scale,
    scaledTypography,
    scaledSpacing,
    scaledBorderRadius,
    contentWidth: gridPanelWidth,
    gridRenderWidth,
    needsHorizontalScroll,
    courtWidth: gymForRender.courtWidth,
    slotWidth: gymForRender.slotWidth,
    courtHeight: getCourtHeight(gymForRender.courtWidth),
    courtColumns,
    courtGap: gymForRender.courtGap,
    gridPadding,
    entranceGutter: gymForRender.entranceGutter,
    cardHPad: gymForRender.cardHPad,
    cardChromeTop: gymForRender.cardChromeTop,
    cardChrome: gymForRender.cardChrome,
    floorStageH: gymForRender.floorStageH,
    floorHeaderH: gymForRender.floorHeaderH,
    floorContentTop: gymForRender.floorContentTop,
    aisleH: gymForRender.aisleH,
    gymLayout: gymForRender,
    sidebarWidth,
    gridAreaHeight,
    gridContentHeight,
    gridContentWidth: gridRenderWidth,
    expandAreaHeight,
    fitsOnScreen,
    needsVerticalScroll,
    tabBarHeight,
    safeAreaBottom: insets.bottom,
    headerHeight,
  };
}
