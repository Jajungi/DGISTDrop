import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PwaInstallVisibilityInfo } from '@/src/constants/pwaInstallGuide';
import { colors, spacing, typography } from '@/src/theme';

interface PwaInstallWhenBoxProps {
  info: PwaInstallVisibilityInfo;
}

export function PwaInstallWhenBox({ info }: PwaInstallWhenBoxProps) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>설치 안내가 언제 보이나요?</Text>

      <View style={styles.envRow}>
        <Text style={styles.envLabel}>지금 환경</Text>
        <Text style={styles.envValue}>{info.environmentLabel}</Text>
      </View>

      {info.showWhere.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>보이는 경우</Text>
          {info.showWhere.map((line) => (
            <Text key={line} style={styles.bullet}>
              · {line}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>안 보이는 경우</Text>
        {info.hideWhen.map((line) => (
          <Text key={line} style={styles.bullet}>
            · {line}
          </Text>
        ))}
      </View>

      {info.note ? <Text style={styles.note}>{info.note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: { ...typography.bodyBold, color: colors.text, fontSize: 14 },
  envRow: { gap: 2 },
  envLabel: { ...typography.small, color: colors.textMuted, fontWeight: '700' },
  envValue: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  section: { gap: 2 },
  sectionTitle: { ...typography.caption, color: colors.text, fontWeight: '700' },
  bullet: { ...typography.caption, color: colors.textSecondary, lineHeight: 20, paddingLeft: 2 },
  note: { ...typography.caption, color: colors.textMuted, lineHeight: 18, marginTop: 2 },
});
