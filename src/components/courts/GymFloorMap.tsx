import React, { useId, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Rect, Line } from 'react-native-svg';
import { COURT_COLUMNS, GYM_FLOOR, GYM_VENUE } from '@/src/constants/court';
import type { GymGridLayout } from '@/src/utils/gymGridGeometry';
import { colors, typography } from '@/src/theme';

interface GymFloorMapProps {
  layout: GymGridLayout;
}

export function GymFloorMap({ layout }: GymFloorMapProps) {
  const patternUid = useId().replace(/:/g, '');
  const patternId = `gym-floor-stripe-${patternUid}`;

  const {
    floorWidth,
    floorHeight,
    slotWidth,
    courtGap,
    entranceGutter,
    rowEntranceGap,
    floorStageH,
    aisleH,
    courtsRowWidth,
    columnDividerXs,
    aisleCenterYs,
    cols,
  } = layout;

  const safeW = Math.max(1, floorWidth);
  const safeH = Math.max(1, floorHeight);

  const colHeaders = useMemo(
    () =>
      COURT_COLUMNS.map((col, i) => ({
        ...col,
        width: slotWidth,
        marginRight: i < cols - 1 ? courtGap : 0,
      })),
    [slotWidth, courtGap, cols]
  );

  return (
    <View style={[styles.wrap, { width: safeW, height: safeH, pointerEvents: 'none' }]}>
      <Svg width={safeW} height={safeH} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id={patternId} patternUnits="userSpaceOnUse" width={8} height={8}>
            <Rect width={8} height={8} fill={GYM_FLOOR.base} />
            <Line x1={0} y1={8} x2={8} y2={0} stroke={GYM_FLOOR.stripe} strokeWidth={0.6} />
          </Pattern>
        </Defs>

        <Rect x={0} y={0} width={safeW} height={safeH} rx={4} ry={4} fill={`url(#${patternId})`} />

        <Rect x={0} y={0} width={safeW} height={floorStageH} rx={4} fill={GYM_FLOOR.stage} opacity={0.55} />

        <Rect
          x={0}
          y={Math.max(0, safeH - 10)}
          width={safeW}
          height={10}
          fill={GYM_FLOOR.entrance}
          opacity={0.45}
        />

        {columnDividerXs.map((x, i) => (
          <Line
            key={`div-${i}`}
            x1={x}
            y1={floorStageH + 4}
            x2={x}
            y2={safeH - 8}
            stroke={GYM_FLOOR.divider}
            strokeWidth={1}
            strokeDasharray="4 5"
          />
        ))}

        {aisleCenterYs.map((y, i) => (
          <Rect
            key={`aisle-${i}`}
            x={entranceGutter + rowEntranceGap}
            y={y - aisleH / 2}
            width={courtsRowWidth}
            height={Math.max(0, aisleH)}
            fill={GYM_FLOOR.aisle}
            opacity={0.65}
            rx={3}
          />
        ))}
      </Svg>

      <View style={[styles.stageBand, { width: safeW, height: floorStageH }]}>
        <Text style={styles.stageText}>▲ {GYM_VENUE.stageLabel}</Text>
        <Text style={styles.venueHint}>{GYM_VENUE.shortName}</Text>
      </View>

      <View
        style={[
          styles.colHeaders,
          {
            top: floorStageH + 2,
            left: entranceGutter + rowEntranceGap,
            width: courtsRowWidth,
          },
        ]}
      >
        {colHeaders.map((col) => (
          <View key={col.key} style={[styles.colHeader, { width: col.width, marginRight: col.marginRight }]}>
            <Text style={styles.colLabel}>{col.label}</Text>
            {col.sublabel ? <Text style={styles.colSub}>{col.sublabel}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
    borderRadius: 4,
    overflow: 'hidden',
  },
  stageBand: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  stageText: {
    ...typography.small,
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  venueHint: {
    ...typography.small,
    fontSize: 8,
    color: colors.textMuted,
    opacity: 0.75,
  },
  colHeaders: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  colHeader: {
    alignItems: 'center',
  },
  colLabel: {
    ...typography.small,
    fontSize: 8,
    fontWeight: '700',
    color: colors.textMuted,
  },
  colSub: {
    ...typography.small,
    fontSize: 7,
    color: colors.textMuted,
    opacity: 0.7,
    marginTop: 1,
  },
});
