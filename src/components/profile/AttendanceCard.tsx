import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '@/src/stores/authStore';
import { useAppStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useGeoLocation } from '@/src/hooks/useGeoLocation';
import { Button } from '@/src/components/ui/Button';
import { getDistanceToGym } from '@/src/services/geoFence';
import { GYM_LOCATION } from '@/src/constants';
import { isStaffUser } from '@/src/utils/staffAccess';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceCard() {
  useGeoLocation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const attendanceRecords = useAuthStore((s) => s.attendanceRecords);
  const checkIn = useAuthStore((s) => s.checkIn);
  const location = useAppStore((s) => s.location);
  const locationError = useAppStore((s) => s.locationError);
  const demoMode = useAppStore((s) => s.demoMode);
  const checkGeoFence = useAppStore((s) => s.checkGeoFence);
  const showToast = useNotificationStore((s) => s.showToast);

  if (!currentUser) return null;

  const today = todayKey();
  const todayRecord = attendanceRecords.find(
    (r) => r.userId === currentUser.id && r.date === today
  );

  const isAdmin = isStaffUser(currentUser);
  const distance = location ? getDistanceToGym(location) : null;
  const canCheckIn = checkGeoFence();

  const statusText = (() => {
    if (demoMode) return '데모 모드 · 위치 제한 없이 출석할 수 있어요.';
    if (isAdmin) return '운영진 · 위치 제한 없이 출석할 수 있어요.';
    if (locationError) return locationError;
    if (distance === null) return '위치를 확인하는 중이에요…';
    if (canCheckIn) return `S1 체육관 반경 안이에요 (약 ${distance}m). 출석할 수 있어요.`;
    return `체육관에서 약 ${distance}m 떨어져 있어요. 반경 ${GYM_LOCATION.radiusMeters}m 안으로 이동해 주세요.`;
  })();

  const handleCheckIn = () => {
    const result = checkIn(currentUser.id);
    showToast({
      type: result.success ? 'success' : 'warning',
      title: '',
      message: result.message,
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>출석</Text>
        <View style={[styles.locDot, canCheckIn && styles.locDotOn]} />
      </View>
      <Text style={styles.desc}>{statusText}</Text>
      {todayRecord ? (
        <View style={styles.doneBox}>
          <Text style={styles.doneText}>✓ 오늘 출석 완료</Text>
          <Text style={styles.doneTime}>
            {new Date(todayRecord.checkedInAt).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      ) : (
        <Button
          title={canCheckIn ? '출석하기' : '체육관 근처에서 출석 가능'}
          onPress={handleCheckIn}
          disabled={!canCheckIn}
          fullWidth
          variant="primary"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
  locDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textMuted,
  },
  locDotOn: { backgroundColor: colors.success },
  desc: { ...typography.caption, color: colors.textSecondary },
  doneBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  doneText: { ...typography.bodyBold, color: colors.primary },
  doneTime: { ...typography.small, color: colors.textSecondary },
});
