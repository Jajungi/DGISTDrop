import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { Button } from '@/src/components/ui/Button';
import { colors, spacing, typography, borderRadius, withAlpha } from '@/src/theme';
import type { LessonAccessStatus } from '@/src/types';

const STATUS_LABEL: Record<
  Exclude<LessonAccessStatus, 'none'>,
  { text: string; color: string; bg: string }
> = {
  pending: { text: '승인 대기', color: colors.warning, bg: withAlpha(colors.warning, 0.16) },
  approved: { text: '승인됨', color: colors.success, bg: colors.primaryLight },
  rejected: { text: '거절됨', color: colors.error, bg: withAlpha(colors.error, 0.14) },
};

/** 프로필용 — 레슨 권한 신청만 */
export function LessonApplyCard() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const requestLessonAccess = useAuthStore((s) => s.requestLessonAccess);
  const showToast = useNotificationStore((s) => s.showToast);

  if (!currentUser) return null;

  const lessonStatus = currentUser.lessonStatus ?? 'none';
  const statusStyle = lessonStatus !== 'none' ? STATUS_LABEL[lessonStatus] : null;

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
      <Text style={styles.title}>레슨 권한</Text>
      <Text style={styles.desc}>
        코치 레슨을 받으려면 권한 신청 후 운영진 승인이 필요해요. 승인되면 코트 화면의 코칭
        메뉴에서 대기열·순서를 이용할 수 있습니다.
      </Text>

      {statusStyle && (
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.text}</Text>
        </View>
      )}

      {(lessonStatus === 'none' || lessonStatus === 'rejected') && (
        <Button title="레슨 권한 신청" onPress={handleRequest} fullWidth variant="outline" />
      )}

      {lessonStatus === 'pending' && (
        <Text style={styles.hint}>운영진 승인을 기다리는 중이에요.</Text>
      )}

      {lessonStatus === 'approved' && (
        <Text style={styles.hint}>승인 완료 — 코트 화면 하단 「코칭 · 레슨」에서 이용하세요.</Text>
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
