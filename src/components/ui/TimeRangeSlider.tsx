import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  buildSlotMarks,
  rangeToSelectedIndices,
  rangeIndicesToTimes,
  formatSelectionSummary,
} from '@/src/utils/timeSlots';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

export interface TimeRangeSliderProps {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  stepMinutes?: number;
  /** HH:MM */
  selectedStart?: string;
  /** HH:MM */
  selectedEnd?: string;
  onChange: (start: string, end: string) => void;
  dateLabel?: string;
  showDateRow?: boolean;
}

/**
 * 연속 구간만 지원 (도착 일정 start~end).
 * 드래그: 시작 칸~현재 칸으로 선택 범위를 통째로 교체.
 * 탭(드래그 없음): 미선택 칸 → 그 칸만 선택 / 선택 칸 → 전체 해제.
 */
export function TimeRangeSlider({
  startHour,
  startMinute,
  endHour,
  endMinute,
  stepMinutes = 30,
  selectedStart,
  selectedEnd,
  onChange,
  dateLabel,
  showDateRow = true,
}: TimeRangeSliderProps) {
  const marks = useMemo(
    () => buildSlotMarks(startHour, startMinute, endHour, endMinute, stepMinutes),
    [startHour, startMinute, endHour, endMinute, stepMinutes]
  );
  const segmentCount = Math.max(0, marks.length - 1);
  const labelStep = segmentCount > 10 ? 3 : segmentCount > 6 ? 2 : 1;

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(() =>
    rangeToSelectedIndices(marks, selectedStart, selectedEnd)
  );
  const [timeExpanded, setTimeExpanded] = useState(true);

  useEffect(() => {
    setSelectedIndices(rangeToSelectedIndices(marks, selectedStart, selectedEnd));
  }, [marks, selectedStart, selectedEnd]);

  const applyRange = useCallback(
    (lo: number, hi: number) => {
      const next = new Set<number>();
      for (let i = lo; i <= hi; i++) next.add(i);
      setSelectedIndices(next);
      const times = rangeIndicesToTimes(marks, lo, hi);
      onChange(times.start, times.end);
    },
    [marks, onChange]
  );

  const clearSelection = useCallback(() => {
    setSelectedIndices(new Set());
    onChange('', '');
  }, [onChange]);

  const trackWidthRef = useRef(0);
  const anchorRef = useRef(-1);
  const startedSelectedRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const startLocationXRef = useRef(0);
  const DRAG_THRESHOLD = 10;

  const handleTrackLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidthRef.current = e.nativeEvent.layout.width;
  }, []);

  const indexFromLocationX = useCallback(
    (locationX: number) => {
      const width = trackWidthRef.current;
      if (width <= 0 || segmentCount <= 0) return -1;
      const clamped = Math.max(0, Math.min(width - 0.001, locationX));
      const idx = Math.floor((clamped / width) * segmentCount);
      return Math.max(0, Math.min(segmentCount - 1, idx));
    },
    [segmentCount]
  );

  const handleGrant = useCallback(
    (e: GestureResponderEvent) => {
      const { locationX } = e.nativeEvent;
      const index = indexFromLocationX(locationX);
      if (index < 0) return;
      startLocationXRef.current = locationX;
      anchorRef.current = index;
      hasDraggedRef.current = false;
      startedSelectedRef.current = selectedIndices.has(index);
      // 드래그 시작 전에는 즉시 반영하지 않음 (옆 칸 오인·연쇄 삭제 방지)
    },
    [indexFromLocationX, selectedIndices]
  );

  const handleMove = useCallback(
    (e: GestureResponderEvent) => {
      const { locationX } = e.nativeEvent;
      const anchor = anchorRef.current;
      if (anchor < 0) return;
      if (!hasDraggedRef.current) {
        if (Math.abs(locationX - startLocationXRef.current) < DRAG_THRESHOLD) return;
        hasDraggedRef.current = true;
      }
      const cur = indexFromLocationX(locationX);
      if (cur < 0) return;
      // 드래그는 항상 연속 구간으로 교체 (구멍·부분 삭제 없음)
      applyRange(Math.min(anchor, cur), Math.max(anchor, cur));
    },
    [indexFromLocationX, applyRange]
  );

  const handleRelease = useCallback(() => {
    const anchor = anchorRef.current;
    if (anchor < 0) {
      hasDraggedRef.current = false;
      return;
    }
    if (!hasDraggedRef.current) {
      if (startedSelectedRef.current) {
        clearSelection();
      } else {
        applyRange(anchor, anchor);
      }
    }
    anchorRef.current = -1;
    hasDraggedRef.current = false;
    startedSelectedRef.current = false;
  }, [applyRange, clearSelection]);

  const isSelected = (index: number) => selectedIndices.has(index);
  const rangeSummary = formatSelectionSummary(marks, selectedIndices);

  return (
    <View style={styles.wrap}>
      {showDateRow && dateLabel ? (
        <View style={styles.dateCard}>
          <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.dateText}>{dateLabel}</Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </View>
      ) : null}

      <View style={styles.timeCard}>
        <Pressable
          style={styles.timeHeader}
          onPress={() => setTimeExpanded((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: timeExpanded }}
        >
          <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.timeHeaderText}>시간 선택</Text>
          <Ionicons
            name={timeExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </Pressable>

        {timeExpanded ? (
          <View style={styles.sliderBody}>
            <View style={styles.labelsRow}>
              {marks.slice(0, -1).map((mark, index) => {
                const showLabel = index % labelStep === 0 && index / segmentCount < 0.85;
                return (
                  <View key={`label-${mark}`} style={styles.labelCell}>
                    {showLabel ? (
                      <Text style={styles.timeLabel} numberOfLines={1}>
                        {mark}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
              <Text style={styles.timeLabelEnd} numberOfLines={1}>
                {marks[marks.length - 1]}
              </Text>
            </View>

            <View
              style={styles.trackRow}
              onLayout={handleTrackLayout}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={handleGrant}
              onResponderMove={handleMove}
              onResponderRelease={handleRelease}
              onResponderTerminate={handleRelease}
            >
              {Array.from({ length: segmentCount }, (_, index) => (
                <View
                  key={`seg-${index}`}
                  style={[
                    styles.segment,
                    index === 0 && styles.segmentFirst,
                    index === segmentCount - 1 && styles.segmentLast,
                    isSelected(index) ? styles.segmentSelected : styles.segmentIdle,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${marks[index]}부터 ${marks[index + 1]}까지`}
                  accessibilityState={{ selected: isSelected(index) }}
                />
              ))}
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, styles.segmentSelected]} />
                <Text style={styles.legendText}>선택</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, styles.segmentIdle]} />
                <Text style={styles.legendText}>미선택</Text>
              </View>
            </View>

            {rangeSummary ? (
              <Text style={styles.rangeSummary}>{rangeSummary}</Text>
            ) : (
              <Text style={styles.rangeHint}>
                칸을 탭하거나, 누른 채 좌우로 드래그해 연속 구간을 선택하세요. 선택된 칸을 탭하면
                해제됩니다.
              </Text>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    ...typography.bodyBold,
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  timeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  timeHeaderText: {
    ...typography.bodyBold,
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  sliderBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  labelsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    position: 'relative',
    minHeight: 18,
    marginBottom: 2,
  },
  labelCell: {
    flex: 1,
    alignItems: 'flex-start',
  },
  timeLabelEnd: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  timeLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  trackRow: {
    flexDirection: 'row',
    height: 36,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.5)',
  },
  segmentFirst: {
    borderTopLeftRadius: borderRadius.sm,
    borderBottomLeftRadius: borderRadius.sm,
  },
  segmentLast: {
    borderRightWidth: 0,
    borderTopRightRadius: borderRadius.sm,
    borderBottomRightRadius: borderRadius.sm,
  },
  segmentSelected: {
    backgroundColor: '#C4B5FD',
  },
  segmentIdle: {
    backgroundColor: '#E8EAEF',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  legendText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  rangeSummary: {
    ...typography.bodyBold,
    textAlign: 'center',
    color: colors.primary,
    fontSize: 15,
    marginTop: spacing.xs,
  },
  rangeHint: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
