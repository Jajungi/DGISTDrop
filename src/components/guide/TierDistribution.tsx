import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RANK_THRESHOLDS, RANK_ORDER } from '@/src/constants';
import { colors, borderRadius, spacing, typography } from '@/src/theme';

/** 표시용 하한/상한 — 브론즈(0~)와 마스터(~무한)를 보기 좋게 자른 범위 */
const DISPLAY_MIN = 800;
const DISPLAY_MAX = 2000;

export function TierDistribution() {
  const bands = RANK_ORDER.map((rank, i) => {
    const next = RANK_ORDER[i + 1];
    const start = Math.max(RANK_THRESHOLDS[rank].min, DISPLAY_MIN);
    const end = next ? RANK_THRESHOLDS[next].min : DISPLAY_MAX;
    return {
      rank,
      label: RANK_THRESHOLDS[rank].label,
      color: RANK_THRESHOLDS[rank].color,
      min: RANK_THRESHOLDS[rank].min,
      isTop: !next,
      weight: Math.max(end - start, 1),
    };
  });

  const totalWeight = bands.reduce((sum, b) => sum + b.weight, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>티어 분포</Text>
      <Text style={styles.subtitle}>
        Elo 점수 구간별 랭크입니다. 시작 점수는 1000점(실버)이며, 경기 점수 입력 결과에 따라
        오르내립니다.
      </Text>

      <View style={styles.bar}>
        {bands.map((b, i) => (
          <View
            key={b.rank}
            style={[
              styles.segment,
              {
                flexGrow: b.weight / totalWeight,
                backgroundColor: b.color,
                borderTopLeftRadius: i === 0 ? borderRadius.sm : 0,
                borderBottomLeftRadius: i === 0 ? borderRadius.sm : 0,
                borderTopRightRadius: b.isTop ? borderRadius.sm : 0,
                borderBottomRightRadius: b.isTop ? borderRadius.sm : 0,
              },
            ]}
          >
            <Text style={styles.segmentLabel} numberOfLines={1}>
              {b.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.legendGrid}>
        {bands.map((b) => (
          <View key={b.rank} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: b.color }]} />
            <Text style={styles.legendLabel}>{b.label}</Text>
            <Text style={styles.legendRange}>
              {b.isTop ? `${b.min}+` : `${b.min}~${RANK_THRESHOLDS[RANK_ORDER[RANK_ORDER.indexOf(b.rank) + 1]].min - 1}`}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, marginTop: spacing.sm },
  title: { ...typography.bodyBold, color: colors.text, fontSize: 15 },
  subtitle: { ...typography.caption, color: colors.textSecondary, lineHeight: 20 },
  bar: {
    flexDirection: 'row',
    height: 34,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  segment: {
    flexBasis: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 30,
  },
  segmentLabel: {
    ...typography.small,
    color: colors.textLight,
    fontWeight: '700',
    fontSize: 10,
    textShadow: '0 1px 2px rgba(0,0,0,0.35)',
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexBasis: '30%',
    flexGrow: 1,
  },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { ...typography.caption, color: colors.text, fontWeight: '600' },
  legendRange: { ...typography.small, color: colors.textMuted, fontSize: 10 },
});
