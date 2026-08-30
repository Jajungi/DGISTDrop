import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { Button } from '@/src/components/ui/Button';
import { TimeRangeSlider } from '@/src/components/ui/TimeRangeSlider';
import { ACTIVITY_SCHEDULE } from '@/src/constants';
import { getActivitySchedule, useActivityScheduleStore } from '@/src/stores/activityScheduleStore';
import { useClubEventStore } from '@/src/stores/clubEventStore';
import { hasArrivalTimeToday, todayAttendanceIntent } from '@/src/utils/attendanceIntent';
import { formatCompactDayLabel, getSeoulWeekday } from '@/src/utils/dateFormat';
import { useSeoulTodayKey } from '@/src/hooks/useSeoulTodayKey';
import { isGuestUser } from '@/src/utils/guestAccess';
import { isActivityDay } from '@/src/services/activityTime';
import { useTabTourStore } from '@/src/stores/tabTourStore';
import { useI18n } from '@/src/i18n/useI18n';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

/**
 * 활동일에 참석/불참을 아직 안 골랐거나,
 * 푸시·알림에서 참석만 고르고 시간이 없을 때 프로필과 같은 시간 칸을 띄운다.
 */
export function AttendanceIntentGate() {
  const { t } = useI18n();
  const currentUser = useAuthStore((s) => s.currentUser);
  const setAttendanceIntent = useAuthStore((s) => s.setAttendanceIntent);
  const updateUserSchedule = useAuthStore((s) => s.updateUserSchedule);
  const showToast = useNotificationStore((s) => s.showToast);
  const schedule = useActivityScheduleStore((s) => s.schedule);
  const cancelledDate = useActivityScheduleStore((s) => s.cancelledDate);
  const events = useClubEventStore((s) => s.events);
  const todayKey = useSeoulTodayKey();
  const [dismissed, setDismissed] = useState(false);
  const [pickingTime, setPickingTime] = useState(false);
  const [arrivalTime, setArrivalTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const tourOpen = useTabTourStore((s) => s.activeIndex !== null);

  const todayLabel = useMemo(() => formatCompactDayLabel(), [todayKey]);
  const activityBounds = useMemo(() => {
    const day = getSeoulWeekday();
    const sessions = getActivitySchedule();
    return sessions.find((s) => s.day === day) ?? sessions[0] ?? ACTIVITY_SCHEDULE[0];
  }, [schedule, todayKey]);

  const activityDay = useMemo(() => isActivityDay(), [schedule, events, cancelledDate, todayKey]);
  const intent = todayAttendanceIntent(currentUser, todayKey);
  const hasTime = hasArrivalTimeToday(currentUser, todayKey);
  const needsChoice = !intent;
  const needsTime = intent === 'going' && !hasTime;

  useEffect(() => {
    if (needsTime) setPickingTime(true);
  }, [needsTime, currentUser?.id]);

  const eligible =
    !!currentUser &&
    !isGuestUser(currentUser) &&
    currentUser.memberStatus === 'approved' &&
    activityDay;

  const showTimePicker = pickingTime || needsTime;

  if (tourOpen || !eligible || dismissed || (!needsChoice && !needsTime)) return null;

  const chooseGoing = () => {
    const r = setAttendanceIntent(currentUser.id, 'going');
    showToast({ type: r.success ? 'success' : 'warning', title: '', message: r.message });
    if (r.success) setPickingTime(true);
  };

  const chooseNotGoing = () => {
    const r = setAttendanceIntent(currentUser.id, 'not_going');
    showToast({ type: 'info', title: '', message: r.message });
    setDismissed(true);
  };

  const skipTime = () => {
    setDismissed(true);
  };

  const saveTime = () => {
    if (!arrivalTime) {
      showToast({ type: 'info', title: '', message: t('friends.attendanceSkipTimeToast') });
      return;
    }
    const r = updateUserSchedule(currentUser.id, arrivalTime, endTime || undefined);
    showToast({ type: r.success ? 'success' : 'warning', title: '', message: r.message });
    if (!r.success) return;
    setDismissed(true);
  };

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.kicker}>{todayLabel}</Text>
            {showTimePicker ? (
              <Pressable
                onPress={skipTime}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.title}>
            {showTimePicker ? t('friends.attendanceWhenArriving') : t('notifications.attendanceTitle')}
          </Text>
          <Text style={styles.body}>
            {showTimePicker
              ? t('friends.attendanceTimePickerBody')
              : t('friends.attendanceIntentBody')}
          </Text>

          {showTimePicker ? (
            <>
              <TimeRangeSlider
                startHour={activityBounds.startHour}
                startMinute={activityBounds.startMinute}
                endHour={activityBounds.endHour}
                endMinute={activityBounds.endMinute}
                selectedStart={arrivalTime || undefined}
                selectedEnd={endTime || undefined}
                onChange={(start, end) => {
                  setArrivalTime(start);
                  setEndTime(end);
                }}
                showDateRow={false}
              />
              <Button title={t('friends.attendanceSaveTime')} onPress={saveTime} fullWidth />
              <Button title={t('common.skip')} variant="ghost" onPress={skipTime} fullWidth />
            </>
          ) : (
            <View style={styles.row}>
              <View style={styles.rowBtn}>
                <Button title={t('notifications.going')} onPress={chooseGoing} fullWidth />
              </View>
              <View style={styles.rowBtn}>
                <Button title={t('notifications.notGoing')} variant="outline" onPress={chooseNotGoing} fullWidth />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  kicker: { ...typography.caption, color: colors.textMuted },
  title: { ...typography.h2, color: colors.text },
  body: { ...typography.body, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  rowBtn: { flex: 1 },
});
