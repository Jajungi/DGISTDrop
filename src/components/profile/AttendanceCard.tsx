import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '@/src/stores/authStore';
import { useAppStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useGeoLocation } from '@/src/hooks/useGeoLocation';
import { Button } from '@/src/components/ui/Button';
import { getDistanceToGym } from '@/src/services/geoFence';
import { GYM_LOCATION } from '@/src/constants';
import { useI18n } from '@/src/i18n/useI18n';
import { colors, spacing, typography, borderRadius } from '@/src/theme';
import { getSeoulTodayKey } from '@/src/utils/dateFormat';

export function AttendanceCard() {
  useGeoLocation();
  const { t, locale } = useI18n();
  const currentUser = useAuthStore((s) => s.currentUser);
  const attendanceRecords = useAuthStore((s) => s.attendanceRecords);
  const checkIn = useAuthStore((s) => s.checkIn);
  const location = useAppStore((s) => s.location);
  const locationError = useAppStore((s) => s.locationError);
  const demoMode = useAppStore((s) => s.demoMode);
  const checkGeoFence = useAppStore((s) => s.checkGeoFence);
  const showToast = useNotificationStore((s) => s.showToast);

  if (!currentUser) return null;

  const today = getSeoulTodayKey();
  const todayRecord = attendanceRecords.find(
    (r) => r.userId === currentUser.id && r.date === today
  );

  const distance = location ? getDistanceToGym(location) : null;
  const canCheckIn = checkGeoFence();
  const timeLocale = locale === 'ko' ? 'ko-KR' : 'en-US';

  const statusText = (() => {
    if (demoMode) return t('profile.checkInDemo');
    if (locationError) return locationError;
    if (distance === null) return t('profile.checkInLocating');
    if (canCheckIn) return t('profile.checkInInRange', { distance });
    return t('profile.checkInOutOfRange', { distance, radius: GYM_LOCATION.radiusMeters });
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
        <Text style={styles.title}>{t('header.checkIn')}</Text>
        <View style={[styles.locDot, canCheckIn && styles.locDotOn]} />
      </View>
      <Text style={styles.desc}>{statusText}</Text>
      {todayRecord ? (
        <View style={styles.doneBox}>
          <Text style={styles.doneText}>{t('profile.checkInDone')}</Text>
          <Text style={styles.doneTime}>
            {new Date(todayRecord.checkedInAt).toLocaleTimeString(timeLocale, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      ) : (
        <Button
          title={canCheckIn ? t('profile.checkInButton') : t('profile.checkInButtonDisabled')}
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
