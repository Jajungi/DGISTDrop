import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated, Easing, AppState } from 'react-native';
import type { Court, User } from '@/src/types';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { CourtStatusInfoModal } from '@/src/components/courts/CourtStatusInfoModal';
import { GoingPeopleSheet } from '@/src/components/courts/GoingPeopleSheet';
import { GYM_VENUE } from '@/src/constants/court';
import { colors, spacing, typography, borderRadius } from '@/src/theme';
import { isBetweenNotifyAndActivityStart } from '@/src/services/activityTime';
import { useI18n } from '@/src/i18n/useI18n';
import { DEFAULT_PUSH_SETTINGS, fetchPushNotifySettings } from '@/src/services/supabase/pushSettings';
import { getSeoulTodayKey } from '@/src/utils/dateFormat';

interface CourtOverviewHeaderProps {
  courts: Court[];
  filter: 'all' | 'empty' | 'mine';
  onFilterChange: (f: 'all' | 'empty' | 'mine') => void;
  myUserId?: string;
  isAtGym: boolean;
  /**
   * 올 사람 = 오늘 참석 의사
   * 온 사람 = 체육관 도착
   */
  goingCount?: number;
  goingPeople?: User[];
  atGymCount?: number;
  atGymPeople?: User[];
  occupancyMode?: boolean;
  remaining?: string | null;
  isExpanded?: boolean;
}

function formatDate(t: (key: string, params?: Record<string, string | number>) => string) {
  const [, m, d] = getSeoulTodayKey().split('-');
  return t('courts.dateFormat', { month: Number(m), day: Number(d) });
}

function useGoingListHintWindow() {
  const [notifyTime, setNotifyTime] = useState(DEFAULT_PUSH_SETTINGS.notify_time);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    void fetchPushNotifySettings().then((s) => {
      if (!cancelled) setNotifyTime(s.notify_time || DEFAULT_PUSH_SETTINGS.notify_time);
    });
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 20_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      cancelled = true;
      clearInterval(id);
      sub.remove();
    };
  }, []);

  return isBetweenNotifyAndActivityStart(notifyTime, now);
}

export function CourtOverviewHeader({
  courts,
  filter,
  onFilterChange,
  myUserId,
  isAtGym,
  goingCount,
  goingPeople,
  atGymCount,
  atGymPeople,
  occupancyMode = false,
  remaining,
  isExpanded = false,
}: CourtOverviewHeaderProps) {
  const { isMobile, scaledTypography, isCompact, isLandscape } = useLayoutMode();
  const { t } = useI18n();
  const [goingOpen, setGoingOpen] = useState(false);
  const hintWindow = useGoingListHintWindow();
  const showGoingHint = hintWindow && !goingOpen;
  const unsetCount = courts.filter((c) => c.status === 'empty').length;
  const readyCount = courts.filter((c) => c.status === 'reserved').length;
  const activeCount = courts.filter(
    (c) => c.status === 'playing' || c.status === 'just_finished'
  ).length;
  const emptyCount = unsetCount;
  const reservedCount = courts.filter((c) => c.status === 'reserved').length;
  const playingCount = courts.filter((c) => c.status === 'playing').length;
  const myCount = courts.filter(
    (c) => c.reservedBy === myUserId || c.players.some((p) => p.userId === myUserId)
  ).length;

  const filters: { key: 'all' | 'empty' | 'mine'; label: string; count: number }[] = [
    { key: 'all', label: t('courts.filterAll'), count: courts.length },
    { key: 'empty', label: t('courts.filterEmpty'), count: emptyCount },
    { key: 'mine', label: t('courts.filterMine'), count: myCount },
  ];
  const peopleSuffix = t('courts.peopleSuffix');
  const countLabel = (n: number) => (peopleSuffix ? `${n}${peopleSuffix}` : `${n}`);

  return (
    <View style={[styles.wrap, isMobile && styles.wrapMobile, isLandscape && styles.wrapLandscape]}>
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile, isLandscape && styles.headerRowLandscape]}>
        <View style={styles.titleRow}>
          <View>
            <Text
              style={[
                styles.title,
                isMobile && styles.titleMobile,
                isMobile && {
                  fontSize: scaledTypography.h1.fontSize,
                  lineHeight: scaledTypography.h1.lineHeight,
                },
              ]}
            >
              {t('courts.title')}
            </Text>
            {!isExpanded && !isLandscape && (
              <Text
                style={[
                  styles.venueSub,
                  isMobile && styles.venueSubMobile,
                  isCompact && { fontSize: scaledTypography.small.fontSize },
                ]}
              >
                {GYM_VENUE.name}
              </Text>
            )}
          </View>
          <CourtStatusInfoModal compact occupancyMode={occupancyMode} />
        </View>
        <Text
          style={[
            styles.time,
            isMobile && styles.timeMobile,
            isMobile && {
              fontSize: scaledTypography.h2.fontSize,
              lineHeight: scaledTypography.h2.lineHeight,
            },
          ]}
        >
          {formatDate(t)}
        </Text>
      </View>

      {!isExpanded && (
        <View style={[styles.lineRow, isMobile && styles.lineRowMobile]}>
          <View style={styles.statusRow}>
            {goingCount != null && (
              <View style={styles.goingCluster}>
                <StatusItem
                  number={countLabel(goingCount)}
                  label={t('courts.going')}
                  isText
                  compact={isMobile}
                  emphasize
                  flush
                  onPress={() => setGoingOpen(true)}
                />
                {showGoingHint ? (
                  <GoingListHint compact={isMobile} hint={t('courts.goingHint')} onPress={() => setGoingOpen(true)} />
                ) : null}
              </View>
            )}
            {atGymCount != null && (
              <StatusItem
                number={countLabel(atGymCount)}
                label={t('courts.hereArrived')}
                isText
                compact={isMobile}
                onPress={() => setGoingOpen(true)}
              />
            )}
            <StatusItem number={emptyCount} label={occupancyMode ? t('courts.unset') : t('courts.filterEmpty')} compact={isMobile} />
            {occupancyMode ? (
              <>
                <StatusItem number={readyCount} label={t('courts.ready')} compact={isMobile} />
                <StatusItem number={activeCount} label={t('courts.inUse')} compact={isMobile} />
              </>
            ) : (
              <>
                <StatusItem number={reservedCount} label={t('courts.reserved')} compact={isMobile} />
                <StatusItem number={playingCount} label={t('courts.playing')} compact={isMobile} />
              </>
            )}
            {remaining != null && (
              <StatusItem number={remaining} label={t('courts.remaining')} isText compact={isMobile} />
            )}
          </View>

          <View style={styles.viewActions}>
            <View style={[styles.locBadge, isAtGym && styles.locBadgeOn]}>
              <View style={[styles.locDot, isAtGym && styles.locDotOn]} />
            </View>
            {filters.map((f) => (
              <Pressable
                key={f.key}
                onPress={() => onFilterChange(f.key)}
                style={[styles.viewBtn, filter === f.key && styles.viewBtnActive]}
                accessibilityRole="button"
                accessibilityLabel={`${f.label} ${f.count}`}
              >
                <Text
                  style={[
                    styles.viewBtnText,
                    filter === f.key && styles.viewBtnTextActive,
                    isCompact && { fontSize: 11 },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {!isExpanded && occupancyMode && (
        <Text style={[styles.occupancyDisclaimer, isMobile && styles.occupancyDisclaimerMobile]}>
          {t('courts.occupancyDisclaimer')}
        </Text>
      )}

      <GoingPeopleSheet
        visible={goingOpen}
        onClose={() => setGoingOpen(false)}
        goingPeople={goingPeople ?? []}
        atGymPeople={atGymPeople ?? []}
      />
    </View>
  );
}

function GoingListHint({
  compact,
  hint,
  onPress,
}: {
  compact?: boolean;
  hint: string;
  onPress: () => void;
}) {
  const opacity = useRef(new Animated.Value(0.28)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.72,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.22,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint}
      style={Platform.select({ web: { cursor: 'pointer' as const } })}
    >
      <Animated.Text
        style={[styles.goingHint, compact && styles.goingHintCompact, { opacity }]}
      >
        {hint}
      </Animated.Text>
    </Pressable>
  );
}

function StatusItem({
  number,
  label,
  isText,
  compact,
  emphasize,
  flush,
  onPress,
}: {
  number: number | string;
  label: string;
  isText?: boolean;
  compact?: boolean;
  emphasize?: boolean;
  flush?: boolean;
  onPress?: () => void;
}) {
  const inner = (
    <View style={[styles.statusItem, compact && styles.statusItemCompact, flush && styles.statusItemFlush]}>
      <Text
        style={[
          styles.statusNumber,
          isText && styles.statusNumberSm,
          compact && styles.statusNumberCompact,
          emphasize && styles.statusNumberEmph,
        ]}
      >
        {number}
      </Text>
      <Text
        style={[
          styles.statusType,
          compact && styles.statusTypeCompact,
          emphasize && styles.statusTypeEmph,
          flush && styles.statusTypeFlush,
        ]}
      >
        {label}
      </Text>
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${number}. 누르면 명단`}
      style={Platform.select({ web: { cursor: 'pointer' as const } })}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: spacing.md,
  },
  wrapMobile: {
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerRowMobile: {
    marginBottom: spacing.md,
  },
  wrapLandscape: {
    paddingBottom: 4,
    paddingTop: 0,
    paddingHorizontal: spacing.xs,
  },
  headerRowLandscape: {
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    opacity: 0.9,
  },
  venueSub: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  venueSubMobile: {
    fontSize: 10,
  },
  titleMobile: {
    fontSize: 22,
    lineHeight: 28,
  },
  time: {
    ...typography.h2,
    color: colors.textSecondary,
    fontSize: 18,
  },
  timeMobile: {
    fontSize: 15,
    lineHeight: 20,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  lineRowMobile: {
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusItem: {
    marginRight: spacing.md,
  },
  statusItemCompact: {
    marginRight: spacing.sm,
  },
  statusItemFlush: {
    marginRight: 0,
  },
  goingCluster: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 6,
    marginRight: spacing.md,
    maxWidth: '100%',
  },
  goingHint: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    maxWidth: 168,
    paddingBottom: 1,
  },
  goingHintCompact: {
    fontSize: 10,
    lineHeight: 14,
    maxWidth: 132,
    paddingRight: 0,
  },
  statusNumber: {
    ...typography.score,
    color: colors.text,
    fontSize: 22,
    lineHeight: 28,
  },
  statusNumberCompact: {
    fontSize: 18,
    lineHeight: 22,
  },
  statusNumberEmph: {
    color: colors.primary,
  },
  statusNumberSm: {
    fontSize: 16,
    lineHeight: 22,
  },
  statusType: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingRight: spacing.md,
  },
  statusTypeCompact: {
    paddingRight: spacing.sm,
    fontSize: 10,
  },
  statusTypeEmph: {
    color: colors.primary,
    fontWeight: '600',
  },
  statusTypeFlush: {
    paddingRight: 0,
  },
  viewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.xs,
    backgroundColor: 'transparent',
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  viewBtnActive: {
    backgroundColor: colors.navActive,
  },
  viewBtnText: {
    ...typography.small,
    color: colors.text,
  },
  viewBtnTextActive: {
    color: colors.textLight,
  },
  locBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  locBadgeOn: {
    backgroundColor: colors.primaryLight,
  },
  locDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  locDotOn: {
    backgroundColor: colors.success,
  },
  occupancyDisclaimer: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  occupancyDisclaimerMobile: {
    fontSize: 10,
    lineHeight: 14,
    marginBottom: spacing.xs,
  },
});
