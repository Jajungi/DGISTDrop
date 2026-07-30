import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { Button } from '@/src/components/ui/Button';
import { TimeRangeSlider } from '@/src/components/ui/TimeRangeSlider';
import { ACTIVITY_SCHEDULE } from '@/src/constants';
import { getActivitySchedule } from '@/src/stores/activityScheduleStore';
import { formatCompactDayLabel, getTodayKey, isScheduleForToday } from '@/src/utils/dateFormat';
import { colors, spacing, typography } from '@/src/theme';

export function ArrivalScheduleCard() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const updateUserSchedule = useAuthStore((s) => s.updateUserSchedule);
  const showToast = useNotificationStore((s) => s.showToast);

  const todayKey = useMemo(() => getTodayKey(), []);
  const todayLabel = useMemo(() => formatCompactDayLabel(), []);

  const activityBounds = useMemo(() => {
    const day = new Date().getDay();
    const sessions = getActivitySchedule();
    const session = sessions.find((s) => s.day === day);
    return session ?? sessions[0] ?? ACTIVITY_SCHEDULE[0];
  }, []);

  const savedForToday =
    currentUser &&
    isScheduleForToday(currentUser.scheduleDate, todayKey) &&
    currentUser.scheduledStart;

  const [arrivalTime, setArrivalTime] = useState(savedForToday ? currentUser!.scheduledStart! : '');
  const [endTime, setEndTime] = useState(
    savedForToday && currentUser?.scheduledEnd ? currentUser.scheduledEnd : ''
  );

  useEffect(() => {
    if (!currentUser) return;
    const valid = isScheduleForToday(currentUser.scheduleDate, todayKey) && currentUser.scheduledStart;
    setArrivalTime(valid ? currentUser.scheduledStart! : '');
    setEndTime(valid && currentUser.scheduledEnd ? currentUser.scheduledEnd : '');
  }, [currentUser?.id, currentUser?.scheduleDate, currentUser?.scheduledStart, currentUser?.scheduledEnd, todayKey]);

  if (!currentUser) return null;

  const handleTimeChange = (start: string, end: string) => {
    setArrivalTime(start);
    setEndTime(end);
  };

  const handleSave = () => {
    if (!arrivalTime) {
      showToast({
        type: 'warning',
        title: '',
        message: '시간을 선택해 주세요.',
      });
      return;
    }
    const result = updateUserSchedule(currentUser.id, arrivalTime, endTime || undefined);
    showToast({
      type: result.success ? 'success' : 'warning',
      title: '',
      message: result.message,
    });
  };

  return (
    <View style={styles.wrap}>
      <TimeRangeSlider
        startHour={activityBounds.startHour}
        startMinute={activityBounds.startMinute}
        endHour={activityBounds.endHour}
        endMinute={activityBounds.endMinute}
        selectedStart={arrivalTime || undefined}
        selectedEnd={endTime || undefined}
        onChange={handleTimeChange}
        dateLabel={todayLabel}
      />

      <Text style={styles.hint}>친구 · 일정 탭에 오늘 도착 시간으로 표시됩니다.</Text>

      <Button title="오늘 일정 저장" variant="outline" fullWidth onPress={handleSave} style={styles.saveBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 18,
    textAlign: 'center',
  },
  saveBtn: { marginTop: spacing.sm },
});
