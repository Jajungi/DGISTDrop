import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useI18n } from '@/src/i18n/useI18n';
import { colors, borderRadius, spacing, typography } from '@/src/theme';
import { ProfileEmptyState } from './ProfileEmptyState';

interface HourlyHeadcountChartProps {
  /** 시간대별 평균 인원수 — 없으면 빈 상태 */
  data?: number[][] | null;
  /** 내가 참여한 시간대 (같은 shape, true면 해당 칸) */
  myPresence?: boolean[][];
  labels?: { x: string[]; y: string[] };
  /** 셀 높이 — 세로로 더 길게 표시할 때 사용 */
  cellHeight?: number;
}

export function HourlyHeadcountChart({ data, labels, myPresence, cellHeight = 32 }: HourlyHeadcountChartProps) {
  const { t } = useI18n();
  const hasData = data && data.length > 0 && data.some((row) => row.some((v) => v > 0));

  if (!hasData || !labels) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('profile.headcountTitle')}</Text>
        <ProfileEmptyState hint={t('profile.headcountEmptyHint')} />
      </View>
    );
  }

  const maxVal = Math.max(...data.flat(), 1);

  const getCrowdColor = (val: number) => {
    const intensity = val / maxVal;
    if (intensity > 0.7) return colors.primary;
    if (intensity > 0.4) return colors.primaryLight;
    if (intensity > 0.1) return colors.accentLight;
    return colors.border;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('profile.headcountTitle')}</Text>
      <Text style={styles.subtitle}>{t('profile.headcountSubtitle')}</Text>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>{t('profile.headcountBusy')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendMine]} />
          <Text style={styles.legendText}>{t('profile.headcountMine')}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.yLabels}>
          {labels.y.map((label) => (
            <Text key={label} style={[styles.yLabel, { height: cellHeight, lineHeight: cellHeight }]}>
              {label}
            </Text>
          ))}
        </View>
        <View style={styles.cells}>
          {data.map((row, ri) => (
            <View key={ri} style={styles.row}>
              {row.map((val, ci) => {
                const mine = myPresence?.[ri]?.[ci];
                return (
                  <View
                    key={ci}
                    style={[
                      styles.cell,
                      { height: cellHeight, backgroundColor: getCrowdColor(val) },
                      mine && styles.cellMine,
                    ]}
                  >
                    {val > 0 && <Text style={styles.cellText}>{val}</Text>}
                    {mine && <Text style={styles.mineMark}>★</Text>}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
      <View style={styles.xLabels}>
        {labels.x.map((label) => (
          <Text key={label} style={styles.xLabel}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  title: { ...typography.bodyBold, color: colors.text },
  subtitle: { ...typography.small, color: colors.textMuted, marginTop: -2 },
  legend: { flexDirection: 'row', gap: spacing.md, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4 },
  legendMine: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.warning,
  },
  legendText: { ...typography.small, color: colors.textSecondary },
  grid: { flexDirection: 'row', gap: spacing.xs },
  yLabels: { justifyContent: 'space-around', paddingVertical: 4 },
  yLabel: { ...typography.small, color: colors.textMuted, height: 32, lineHeight: 32 },
  cells: { flex: 1, gap: 4 },
  row: { flexDirection: 'row', gap: 4 },
  cell: {
    flex: 1,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cellMine: {
    borderWidth: 2,
    borderColor: colors.warning,
  },
  cellText: { ...typography.small, color: colors.textLight, fontWeight: '700', fontSize: 11 },
  mineMark: {
    position: 'absolute',
    top: 1,
    right: 3,
    fontSize: 8,
    color: colors.warning,
    fontWeight: '800',
  },
  xLabels: { flexDirection: 'row', justifyContent: 'space-around', marginLeft: 30 },
  xLabel: { ...typography.small, color: colors.textMuted },
});
