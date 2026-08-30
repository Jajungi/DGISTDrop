import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useI18n } from '@/src/i18n/useI18n';
import { colors, spacing, typography } from '@/src/theme';

interface ProfileEmptyStateProps {
  message?: string;
  hint?: string;
}

export function ProfileEmptyState({ message, hint }: ProfileEmptyStateProps) {
  const { t } = useI18n();

  return (
    <View style={styles.wrap}>
      <Text style={styles.message}>{message ?? t('common.noRecords')}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    minHeight: 72,
  },
  message: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    opacity: 0.85,
  },
});
