import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { Button } from '@/src/components/ui/Button';
import { TimeRangeSlider } from '@/src/components/ui/TimeRangeSlider';
import { ACTIVITY_SCHEDULE } from '@/src/constants';
import { getActivitySchedule, useActivityScheduleStore } from '@/src/stores/activityScheduleStore';
import { useClubEventStore } from '@/src/stores/clubEventStore';
import { todayAttendanceIntent } from '@/src/utils/attendanceIntent';
import { formatCompactDayLabel, getSeoulWeekday, isScheduleForToday, normalizeHHMM } from '@/src/utils/dateFormat';
import { useSeoulTodayKey } from '@/src/hooks/useSeoulTodayKey';
import { isActivityDay } from '@/src/services/activityTime';
import { useActivityScheduleLabel } from '@/src/hooks/useGuideSections';
import { useI18n } from '@/src/i18n/useI18n';
import { colors, spacing, typography } from '@/src/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function ArrivalScheduleCard() {
  const { t } = useI18n();
  const currentUser = useAuthStore((s) => s.currentUser);
  const updateUserSchedule = useAuthStore((s) => s.updateUserSchedule);
  const setAttendanceIntent = useAuthStore((s) => s.setAttendanceIntent);
  const showToast = useNotificationStore((s) => s.showToast);

  const schedule = useActivityScheduleStore((s) => s.schedule);
  const cancelledDate = useActivityScheduleStore((s) => s.cancelledDate);
  const events = useClubEventStore((s) => s.events);
  const todayKey = useSeoulTodayKey();
  const todayLabel = useMemo(() => formatCompactDayLabel(), [todayKey]);
  const activityDay = useMemo(() => isActivityDay(), [schedule, events, cancelledDate, todayKey]);
  const scheduleLabel = useActivityScheduleLabel();
  const intent = todayAttendanceIntent(currentUser, todayKey);
  const showTime = activityDay && intent === 'going';

  const activityBounds = useMemo(() => {
    const day = getSeoulWeekday();
    const sessions = getActivitySchedule();
    const session = sessions.find((s) => s.day === day);
    return session ?? sessions[0] ?? ACTIVITY_SCHEDULE[0];
  }, [schedule, todayKey]);

  const savedForToday =
    currentUser &&
    isScheduleForToday(currentUser.scheduleDate, todayKey) &&
    currentUser.scheduledStart;

  const [arrivalTime, setArrivalTime] = useState(
    savedForToday ? normalizeHHMM(currentUser!.scheduledStart) ?? '' : ''
  );
  const [endTime, setEndTime] = useState(
    savedForToday && currentUser?.scheduledEnd ? normalizeHHMM(currentUser.scheduledEnd) ?? '' : ''
  );

  const timeReveal = useRef(new Animated.Value(showTime ? 1 : 0)).current;

  useEffect(() => {
    if (!currentUser) return;
    const valid = isScheduleForToday(currentUser.scheduleDate, todayKey) && currentUser.scheduledStart;
    setArrivalTime(valid ? normalizeHHMM(currentUser.scheduledStart) ?? '' : '');
    setEndTime(valid && currentUser.scheduledEnd ? normalizeHHMM(currentUser.scheduledEnd) ?? '' : '');
  }, [currentUser?.id, currentUser?.scheduleDate, currentUser?.scheduledStart, currentUser?.scheduledEnd, todayKey]);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(timeReveal, {
      toValue: showTime ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [showTime, timeReveal]);

  if (!currentUser) return null;

  if (!activityDay) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.hint}>
          {t('friends.scheduleNotActivityDay', { schedule: scheduleLabel })}
        </Text>
      </View>
    );
  }

  const handleTimeChange = (start: string, end: string) => {
    setArrivalTime(start);
    setEndTime(end);
  };

  const chooseGoing = () => {
    const r = setAttendanceIntent(currentUser.id, 'going');
    showToast({ type: 'success', title: '', message: r.message });
  };

  const chooseNotGoing = () => {
    const r = setAttendanceIntent(currentUser.id, 'not_going');
    showToast({ type: 'info', title: '', message: r.message });
  };

  const handleSave = () => {
    if (!arrivalTime) {
      showToast({
        type: 'warning',
        title: '',
        message: t('friends.scheduleSelectTimeRequired'),
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
      <Text style={styles.question}>{t('notifications.attendanceTitle')}</Text>
      <View style={styles.row}>
        <View style={styles.rowBtn}>
          <Button
            title={t('notifications.going')}
            onPress={chooseGoing}
            fullWidth
            variant={intent === 'going' ? 'primary' : 'outline'}
          />
        </View>
        <View style={styles.rowBtn}>
          <Button
            title={t('notifications.notGoing')}
            onPress={chooseNotGoing}
            fullWidth
            variant={intent === 'not_going' ? 'secondary' : 'outline'}
          />
        </View>
      </View>

      {intent === 'not_going' ? (
        <Text style={styles.hint}>{t('friends.scheduleNotGoingHint')}</Text>
      ) : null}

      {showTime ? (
        <Animated.View
          style={[
            styles.timeBlock,
            {
              opacity: timeReveal,
            },
          ]}
        >
          <Text style={styles.question}>{t('friends.attendanceWhenArriving')}</Text>
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
          <Text style={styles.hint}>{t('friends.scheduleArrivalHint')}</Text>
          <Button
            title={t('friends.scheduleSaveTodayTime')}
            variant="outline"
            fullWidth
            onPress={handleSave}
            style={styles.saveBtn}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  question: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 15,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowBtn: { flex: 1 },
  timeBlock: { gap: spacing.sm, marginTop: spacing.xs },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 18,
    textAlign: 'center',
  },
  saveBtn: { marginTop: spacing.sm },
});
