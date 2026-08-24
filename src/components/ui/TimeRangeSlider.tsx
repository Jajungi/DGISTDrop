import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  buildSlotMarks,
  rangeToSelectedIndices,
  selectedIndicesToTimes,
  formatSelectionSummary,
  paintDragSelection,
} from '@/src/utils/timeSlots';
import { normalizeHHMM } from '@/src/utils/dateFormat';
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
 * 도착 일정 칸 선택.
 * 탭: 그 칸만 켜거나 끔.
 * 드래그: 지나간 칸만 칠함. 빈 칸에서 시작하면 켜고, 켜진 칸에서 시작하면 끈다.
 * 손대지 않은 칸은 그대로 둔다.
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
  const startLabel = marks[0];
  const endLabel = marks[marks.length - 1];

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(() =>
    rangeToSelectedIndices(marks, selectedStart, selectedEnd)
  );
  const [timeExpanded, setTimeExpanded] = useState(true);
  const lastEmittedRef = useRef<{ start: string; end: string } | null>(null);

  useEffect(() => {
    const start = normalizeHHMM(selectedStart) ?? '';
    const end = normalizeHHMM(selectedEnd) ?? '';
    const emitted = lastEmittedRef.current;
    // 방금 이 슬라이더가 올린 값이면 칸 상태를 덮어쓰지 않음 (한 칸만 끈 뒤 다시 채워지는 것 방지)
    if (emitted && emitted.start === start && emitted.end === end) return;
    lastEmittedRef.current = start || end ? { start, end } : { start: '', end: '' };
    setSelectedIndices(rangeToSelectedIndices(marks, selectedStart, selectedEnd));
  }, [marks, selectedStart, selectedEnd]);

  const emitTimes = useCallback(
    (start: string, end: string) => {
      lastEmittedRef.current = { start, end };
      onChange(start, end);
    },
    [onChange]
  );

  const emitFromIndices = useCallback(
    (next: Set<number>) => {
      setSelectedIndices(next);
      const times = selectedIndicesToTimes(marks, next);
      if (times) emitTimes(times.start, times.end);
      else emitTimes('', '');
    },
    [marks, emitTimes]
  );

  /** 탭: 누른 칸만 켜거나 끔. 다른 칸은 그대로. */
  const toggleIndex = useCallback(
    (index: number) => {
      const next = new Set(selectedIndices);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      emitFromIndices(next);
    },
    [emitFromIndices, selectedIndices]
  );

  const trackWidthRef = useRef(0);
  const anchorRef = useRef(-1);
  const startedSelectedRef = useRef(false);
  const snapshotRef = useRef<Set<number>>(new Set());
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
      snapshotRef.current = new Set(selectedIndices);
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
      const next = paintDragSelection(
        snapshotRef.current,
        anchor,
        cur,
        startedSelectedRef.current
      );
      emitFromIndices(next);
    },
    [indexFromLocationX, emitFromIndices]
  );

  const handleRelease = useCallback(() => {
    const anchor = anchorRef.current;
    if (anchor < 0) {
      hasDraggedRef.current = false;
      return;
    }
    if (!hasDraggedRef.current) {
      toggleIndex(anchor);
    }
    anchorRef.current = -1;
    hasDraggedRef.current = false;
    startedSelectedRef.current = false;
  }, [toggleIndex]);

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
              <Text style={styles.timeLabel} numberOfLines={1}>
                {startLabel}
              </Text>
              <Text style={styles.timeLabelEnd} numberOfLines={1}>
                {endLabel}
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
                드래그는 지나간 칸만 칠합니다. 빈 칸에서 시작하면 켜고, 켜진 칸에서 시작하면 끕니다.
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
    justifyContent: 'space-between',
    minHeight: 18,
    marginBottom: 2,
  },
  timeLabelEnd: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  timeLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  trackRow: {
    flexDirection: 'row',
    height: 36,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    gap: 2,
    backgroundColor: colors.slotDivider,
  },
  segment: {
    flex: 1,
  },
  segmentFirst: {
    borderTopLeftRadius: borderRadius.sm,
    borderBottomLeftRadius: borderRadius.sm,
  },
  segmentLast: {
    borderTopRightRadius: borderRadius.sm,
    borderBottomRightRadius: borderRadius.sm,
  },
  segmentSelected: {
    backgroundColor: colors.slotSelected,
  },
  segmentIdle: {
    backgroundColor: colors.slotIdle,
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
