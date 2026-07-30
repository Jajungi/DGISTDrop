import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import type { Court } from '@/src/types';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { CourtStatusInfoModal } from '@/src/components/courts/CourtStatusInfoModal';
import { GYM_VENUE } from '@/src/constants/court';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

interface CourtOverviewHeaderProps {
  courts: Court[];
  filter: 'all' | 'empty' | 'mine';
  onFilterChange: (f: 'all' | 'empty' | 'mine') => void;
  myUserId?: string;
  isAtGym: boolean;
  /** 체육관에 있는 인원 (isAtGym 실시간) */
  atGymCount?: number;
  remaining?: string | null;
  isExpanded?: boolean;
}

function formatDate() {
  const now = new Date();
  return `${now.getMonth() + 1}월 ${now.getDate()}일`;
}

export function CourtOverviewHeader({
  courts,
  filter,
  onFilterChange,
  myUserId,
  isAtGym,
  atGymCount,
  remaining,
  isExpanded = false,
}: CourtOverviewHeaderProps) {
  const { isMobile, scaledTypography, isCompact } = useLayoutMode();
  const emptyCount = courts.filter((c) => c.status === 'empty').length;
  const reservedCount = courts.filter((c) => c.status === 'reserved').length;
  const playingCount = courts.filter((c) => c.status === 'playing').length;
  const myCount = courts.filter(
    (c) => c.reservedBy === myUserId || c.players.some((p) => p.userId === myUserId)
  ).length;

  const filters: { key: 'all' | 'empty' | 'mine'; label: string; count: number }[] = [
    { key: 'all', label: '전체', count: courts.length },
    { key: 'empty', label: '가능', count: emptyCount },
    { key: 'mine', label: '내꺼', count: myCount },
  ];

  return (
    <View style={[styles.wrap, isMobile && styles.wrapMobile]}>
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
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
              코트 현황
            </Text>
            {!isExpanded && (
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
          <CourtStatusInfoModal compact />
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
          {formatDate()}
        </Text>
      </View>

      {!isExpanded && (
        <View style={[styles.lineRow, isMobile && styles.lineRowMobile]}>
          <View style={styles.statusRow}>
            {atGymCount != null && (
              <StatusItem number={`${atGymCount}명`} label="지금" isText compact={isMobile} emphasize />
            )}
            <StatusItem number={emptyCount} label="가능" compact={isMobile} />
            <StatusItem number={reservedCount} label="예약" compact={isMobile} />
            <StatusItem number={playingCount} label="경기" compact={isMobile} />
            {remaining != null && (
              <StatusItem number={remaining} label="잔여" isText compact={isMobile} />
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
    </View>
  );
}

function StatusItem({
  number,
  label,
  isText,
  compact,
  emphasize,
}: {
  number: number | string;
  label: string;
  isText?: boolean;
  compact?: boolean;
  emphasize?: boolean;
}) {
  return (
    <View style={[styles.statusItem, compact && styles.statusItemCompact]}>
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
        ]}
      >
        {label}
      </Text>
    </View>
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
    marginBottom: spacing.sm,
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
});
