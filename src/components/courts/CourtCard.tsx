import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import type { Court } from '@/src/types';
import { CourtIllustration } from './CourtIllustration';
import { CourtPlayerProfiles } from './CourtPlayerProfiles';
import { LightShadowView } from '@/src/components/ui/LightShadowView';
import { GameModeBadge } from './GameModeBadge';
import { CourtGameProgress } from './CourtGameProgress';
import { getCourtHeight, getCourtColumnLabel } from '@/src/constants/court';
import { formatCleanupRemaining, formatElapsed } from '@/src/utils/courtTime';
import { colors } from '@/src/theme';

/** 코트는 직각에 가까운 깔끔한 모서리 (미세 라운드로 계단현상만 방지) */
const COURT_CARD_RADIUS = 2;

interface CourtCardProps {
  court: Court;
  onPress: (court: Court) => void;
  isSelected?: boolean;
  isDimmed?: boolean;
  courtWidth: number;
  compact?: boolean;
  /** 카드 좌우 패딩 (반응형) */
  hPad?: number;
  /** 카드 상단 여백 (예약 태그 공간, 반응형) */
  chromeTop?: number;
}

export function CourtCard({
  court,
  onPress,
  isSelected,
  isDimmed,
  courtWidth,
  compact = true,
  hPad = 3,
  chromeTop = 14,
}: CourtCardProps) {
  const safeWidth = Number.isFinite(courtWidth) && courtWidth > 0 ? courtWidth : 96;
  const courtHeight = getCourtHeight(safeWidth);
  const slotWidth = safeWidth + hPad * 2;
  const radius = COURT_CARD_RADIUS;
  const canJoin = court.status === 'playing' && court.players.length >= 2 && court.players.length < 4;
  const waitCount = court.waitQueue?.length ?? 0;
  const showProfiles = court.players.length > 0;
  const avatarSize = compact
    ? Math.max(10, Math.min(16, safeWidth * 0.14))
    : Math.max(14, Math.min(22, safeWidth * 0.2));
  const isReserved = court.status === 'reserved';
  const isPlaying = court.status === 'playing';
  const isCooling = court.status === 'just_finished';
  const showGameMode = court.gameMode && court.status !== 'empty';
  const elapsed = formatElapsed(court.startedAt);
  const cleanupLeft = formatCleanupRemaining(court.finishedAt);
  const colLabel = getCourtColumnLabel(court.id);

  if (courtHeight <= 0) return null;

  return (
    <Pressable
      onPress={() => onPress(court)}
      accessibilityRole="button"
      accessibilityLabel={`${court.id}번 코트`}
      style={({ pressed }) => [
        styles.wrapper,
        { width: slotWidth, paddingTop: chromeTop },
        isDimmed && styles.dimmed,
        pressed && styles.pressed,
      ]}
    >
      {isReserved && (
        <View style={[styles.reservedTagWrap, { pointerEvents: 'none' }]}>
          <View style={styles.reservedTag}>
            <Text style={styles.reservedText}>예약됨</Text>
          </View>
        </View>
      )}

      {isCooling && (
        <View style={[styles.reservedTagWrap, { pointerEvents: 'none' }]}>
          <View style={styles.coolingTag}>
            <Text style={styles.coolingText}>정리 중</Text>
          </View>
        </View>
      )}

      <LightShadowView
        style={[
          styles.courtShadow,
          { width: safeWidth, borderRadius: radius },
          isSelected && styles.selected,
        ]}
        intensity={isSelected ? 1.1 : 1}
        elevated={isPlaying}
      >
        <View style={[styles.courtClip, { width: safeWidth, height: courtHeight, borderRadius: radius }]}>
          <CourtIllustration court={court} width={safeWidth} borderRadius={radius} />

          <CourtGameProgress court={court} courtWidth={safeWidth} />

          {showProfiles && (
            <CourtPlayerProfiles
              players={court.players}
              avatarSize={avatarSize}
              courtWidth={safeWidth}
              courtHeight={courtHeight}
              compact={compact}
            />
          )}

          <View style={styles.numBadge}>
            <Text style={styles.numText}>{court.id}</Text>
            {(colLabel || court.isCenter) && (
              <Text style={styles.colText}>{court.isCenter ? '센터' : colLabel}</Text>
            )}
          </View>

          {showGameMode && (
            <View
              style={[
                styles.modeBadgeWrap,
                isPlaying && court.players.length > 0 && styles.modeBadgeAboveLive,
                { pointerEvents: 'none' },
              ]}
            >
              <GameModeBadge
                mode={court.gameMode!}
                nantaHalf={court.nantaHalf}
                compact
              />
            </View>
          )}

          {isPlaying && court.players.length > 0 && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>
                {court.players.length}명 · {court.gamesCompleted}/{court.maxGames || '?'}
                {elapsed ? ` · ${elapsed}` : ''}
              </Text>
            </View>
          )}

          {isCooling && (
            <View style={styles.coolingBadge}>
              <Text style={styles.coolingBadgeText}>
                {cleanupLeft ?? '정리 중'}
                {court.maxGames ? ` · ${court.gamesCompleted}/${court.maxGames}경기` : ''}
              </Text>
            </View>
          )}

          {canJoin && (
            <View style={styles.joinBadge}>
              <Text style={styles.joinText}>+</Text>
            </View>
          )}

          {waitCount > 0 && (
            <View style={styles.waitBadge}>
              <Text style={styles.waitBadgeText}>대기 {waitCount}</Text>
            </View>
          )}

          {court.isCoachCourt && !canJoin && (
            <View style={styles.coachTag}>
              <Text style={styles.coachText}>코칭</Text>
            </View>
          )}
        </View>
      </LightShadowView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingBottom: 3,
    alignItems: 'center',
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  reservedTagWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  reservedTag: {
    backgroundColor: '#E86363',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    transform: [{ rotate: '-6deg' }],
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(232, 99, 99, 0.35)' } as object,
      default: {
        shadowColor: '#E86363',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
      },
    }),
  },
  reservedText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  coolingTag: {
    backgroundColor: '#6A8A94',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    transform: [{ rotate: '-4deg' }],
  },
  coolingText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  courtShadow: {
    overflow: 'visible',
  },
  courtClip: {
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      web: {
        boxShadow: 'inset 0 0 18px rgba(0,0,0,0.06), inset 0 0 6px rgba(0,0,0,0.04)',
      } as object,
      default: {},
    }),
  },
  selected: {
    outlineWidth: 2,
    outlineColor: colors.primary,
    outlineStyle: 'solid',
  } as object,
  dimmed: { opacity: 0.38 },
  pressed: { opacity: 0.94 },
  numBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    minWidth: 22,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  numText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 15,
  },
  colText: {
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
    fontSize: 7,
    marginTop: 1,
  },
  modeBadgeWrap: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    zIndex: 4,
  },
  modeBadgeAboveLive: {
    bottom: 28,
  },
  liveBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7CFFB2',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
  },
  coolingBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  coolingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
  },
  joinBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinText: { color: '#FFF', fontSize: 14, fontWeight: '800', lineHeight: 16 },
  waitBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  waitBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  coachTag: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
});
