import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Court } from '@/src/types';
import { CourtCard } from './CourtCard';
import { LightShadowCapture } from '@/src/components/ui/LightShadowView';
import { SoftEdgeFade } from '@/src/components/ui/SoftEdgeFade';
import { GymFloorMap } from '@/src/components/courts/GymFloorMap';
import { GYM_COURT_ROWS, GYM_VENUE } from '@/src/constants/court';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { CoachingEntryLink } from '@/src/components/coaching/CoachingEntryLink';
import { colors, typography, spacing } from '@/src/theme';

interface CourtGridProps {
  courts: Court[];
  onCourtPress: (court: Court) => void;
  selectedCourtId?: number | null;
  filter?: 'all' | 'empty' | 'mine';
  myUserId?: string;
  registerCourtRef?: (id: number, ref: View | null) => void;
  /** 3번 코트 아래 코칭 화면 링크 */
  showCoachingLink?: boolean;
}

function getCourtById(courts: Court[], id: number): Court | undefined {
  return courts.find((c) => c.id === id);
}

function matchesFilter(court: Court, filter: 'all' | 'empty' | 'mine', myUserId?: string) {
  if (filter === 'empty') return court.status === 'empty';
  if (filter === 'mine' && myUserId) {
    return court.reservedBy === myUserId || court.players.some((p) => p.userId === myUserId);
  }
  return true;
}

export function CourtGrid({
  courts,
  onCourtPress,
  selectedCourtId,
  filter = 'all',
  myUserId,
  registerCourtRef,
  showCoachingLink = false,
}: CourtGridProps) {
  const { gymLayout, needsHorizontalScroll, gridRenderWidth } = useLayoutMode();
  const {
    courtWidth,
    slotWidth,
    courtGap,
    entranceGutter,
    rowEntranceGap,
    cardHPad,
    cardChromeTop,
    floorContentTop,
    aisleH,
    courtsRowWidth,
    floorWidth,
  } = gymLayout;

  // 바닥·코트 블록을 동일 폭으로 묶어서 중앙 정렬 (패널이 더 넓어도 어긋나지 않음)
  const blockWidth = Math.max(floorWidth, entranceGutter + rowEntranceGap + courtsRowWidth);

  return (
    <SoftEdgeFade size={28} disableSideFade={needsHorizontalScroll}>
      <View
        style={[
          styles.container,
          {
            width: needsHorizontalScroll ? blockWidth : gridRenderWidth,
            minHeight: gymLayout.floorHeight + 36,
          },
          needsHorizontalScroll && styles.containerScroll,
        ]}
      >
        <LightShadowCapture>
          <View style={[styles.alignedBlock, { width: blockWidth, alignSelf: 'center' }]}>
            <GymFloorMap layout={gymLayout} />

            <View style={{ paddingTop: floorContentTop, width: blockWidth, zIndex: 2 }}>
              {GYM_COURT_ROWS.map((row, rowIdx) => (
                <View
                  key={rowIdx}
                  style={[
                    styles.rowWrap,
                    {
                      marginBottom: aisleH,
                      width: blockWidth,
                      gap: rowEntranceGap,
                    },
                  ]}
                >
                  {rowIdx === GYM_COURT_ROWS.length - 1 ? (
                    <View style={[styles.entranceCol, { width: entranceGutter }]}>
                      <Text style={styles.entranceLabel}>{GYM_VENUE.entranceLabel}</Text>
                      <Text style={styles.entranceArrow}>▼</Text>
                    </View>
                  ) : (
                    <View style={[styles.entranceSpacer, { width: entranceGutter }]} />
                  )}

                  <View style={[styles.row, { width: courtsRowWidth, gap: courtGap }]}>
                    {row.map((courtId) => {
                      const court = getCourtById(courts, courtId);
                      if (!court) {
                        return <View key={courtId} style={{ width: slotWidth }} />;
                      }
                      const dimmed = filter !== 'all' && !matchesFilter(court, filter, myUserId);
                      return (
                        <View
                          key={courtId}
                          ref={(ref) => registerCourtRef?.(courtId, ref)}
                          collapsable={false}
                          style={[styles.courtSlot, { width: slotWidth }]}
                        >
                          <CourtCard
                            court={court}
                            onPress={onCourtPress}
                            isSelected={selectedCourtId === courtId}
                            isDimmed={dimmed}
                            courtWidth={courtWidth}
                            hPad={cardHPad}
                            chromeTop={cardChromeTop}
                            compact
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}

              {showCoachingLink && (
                <View style={[styles.coachingRow, { width: blockWidth, gap: rowEntranceGap }]}>
                  <View style={[styles.entranceSpacer, { width: entranceGutter }]} />
                  <View style={[styles.coachingLinkArea, { width: courtsRowWidth }]}>
                    <CoachingEntryLink />
                  </View>
                </View>
              )}
            </View>
          </View>
        </LightShadowCapture>
      </View>
    </SoftEdgeFade>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.md + 4,
    paddingTop: 2,
    position: 'relative',
    alignSelf: 'center',
    maxWidth: '100%',
    overflow: 'visible',
  },
  containerScroll: {
    alignSelf: 'flex-start',
    maxWidth: undefined,
    overflow: 'visible',
  },
  alignedBlock: {
    position: 'relative',
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  entranceCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    flexShrink: 0,
    flexGrow: 0,
  },
  entranceLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 8,
    textAlign: 'center',
    lineHeight: 11,
    fontWeight: '700',
  },
  entranceArrow: {
    fontSize: 7,
    color: colors.textMuted,
    opacity: 0.65,
  },
  entranceSpacer: { flexShrink: 0, flexGrow: 0 },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexShrink: 0,
    flexGrow: 0,
  },
  courtSlot: {
    flexShrink: 0,
    flexGrow: 0,
  },
  coachingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  coachingLinkArea: {
    alignItems: 'flex-start',
    flexShrink: 0,
  },
});
