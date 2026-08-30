import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { Button } from '@/src/components/ui/Button';
import { useI18n } from '@/src/i18n/useI18n';
import { colors, spacing, typography, borderRadius, withAlpha } from '@/src/theme';
import type { LessonAccessStatus } from '@/src/types';

/** 프로필용 — 레슨 권한 신청만 */
export function LessonApplyCard() {
  const { t } = useI18n();
  const currentUser = useAuthStore((s) => s.currentUser);
  const requestLessonAccess = useAuthStore((s) => s.requestLessonAccess);
  const showToast = useNotificationStore((s) => s.showToast);

  const statusLabel = useMemo(
    (): Record<
      Exclude<LessonAccessStatus, 'none'>,
      { text: string; color: string; bg: string }
    > => ({
      pending: {
        text: t('profile.lessonStatusPending'),
        color: colors.warning,
        bg: withAlpha(colors.warning, 0.16),
      },
      approved: {
        text: t('profile.lessonStatusApproved'),
        color: colors.success,
        bg: colors.primaryLight,
      },
      rejected: {
        text: t('profile.lessonStatusRejected'),
        color: colors.error,
        bg: withAlpha(colors.error, 0.14),
      },
    }),
    [t]
  );

  if (!currentUser) return null;

  const lessonStatus = currentUser.lessonStatus ?? 'none';
  const statusStyle = lessonStatus !== 'none' ? statusLabel[lessonStatus] : null;

  const handleRequest = () => {
    const result = requestLessonAccess(currentUser.id);
    showToast({
      type: result.success ? 'success' : 'warning',
      title: '',
      message: result.message,
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('profile.lessonTitle')}</Text>
      <Text style={styles.desc}>{t('profile.lessonDescription')}</Text>

      {statusStyle && (
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.text}</Text>
        </View>
      )}

      {(lessonStatus === 'none' || lessonStatus === 'rejected') && (
        <Button title={t('profile.lessonApply')} onPress={handleRequest} fullWidth variant="outline" />
      )}

      {lessonStatus === 'pending' && (
        <Text style={styles.hint}>{t('profile.lessonPendingHint')}</Text>
      )}

      {lessonStatus === 'approved' && (
        <Text style={styles.hint}>{t('profile.lessonApprovedHint')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
  desc: { ...typography.caption, color: colors.textSecondary, lineHeight: 20 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  statusText: { ...typography.small, fontWeight: '700' },
  hint: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
});
