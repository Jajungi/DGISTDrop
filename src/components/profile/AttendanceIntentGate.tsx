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
import { formatCompactDayLabel } from '@/src/utils/dateFormat';
import { isGuestUser } from '@/src/utils/guestAccess';
import { isActivityDay } from '@/src/services/activityTime';
import { useTabTourStore } from '@/src/stores/tabTourStore';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

/**
 * 활동일에 참석/불참을 아직 안 골랐거나,
 * 푸시·알림에서 참석만 고르고 시간이 없을 때 프로필과 같은 시간 칸을 띄운다.
 */
export function AttendanceIntentGate() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const setAttendanceIntent = useAuthStore((s) => s.setAttendanceIntent);
  const updateUserSchedule = useAuthStore((s) => s.updateUserSchedule);
  const showToast = useNotificationStore((s) => s.showToast);
  const schedule = useActivityScheduleStore((s) => s.schedule);
  const events = useClubEventStore((s) => s.events);
  const [dismissed, setDismissed] = useState(false);
  const [pickingTime, setPickingTime] = useState(false);
  const [arrivalTime, setArrivalTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const tourOpen = useTabTourStore((s) => s.activeIndex !== null);

  const todayLabel = useMemo(() => formatCompactDayLabel(), []);
  const activityBounds = useMemo(() => {
    const day = new Date().getDay();
    const sessions = getActivitySchedule();
    return sessions.find((s) => s.day === day) ?? sessions[0] ?? ACTIVITY_SCHEDULE[0];
  }, [schedule]);

  const activityDay = useMemo(() => isActivityDay(), [schedule, events]);
  const intent = todayAttendanceIntent(currentUser);
  const hasTime = hasArrivalTimeToday(currentUser);
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
    showToast({ type: 'success', title: '', message: r.message });
    setPickingTime(true);
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
      showToast({ type: 'info', title: '', message: '시간을 모르면 건너뛰어도 돼요.' });
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
                accessibilityLabel="닫기"
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.title}>{showTimePicker ? '언제 참석하시나요?' : '오늘 오시나요?'}</Text>
          <Text style={styles.body}>
            {showTimePicker
              ? '모를 때는 건너뛰어도 됩니다. 참석은 그대로 유지돼요.'
              : '참석하면 올 사람 수에 들어가요. 불참이면 오늘 일정에서 빠져요.'}
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
              <Button title="시간 저장" onPress={saveTime} fullWidth />
              <Button title="건너뛰기" variant="ghost" onPress={skipTime} fullWidth />
            </>
          ) : (
            <View style={styles.row}>
              <View style={styles.rowBtn}>
                <Button title="참석" onPress={chooseGoing} fullWidth />
              </View>
              <View style={styles.rowBtn}>
                <Button title="불참" variant="outline" onPress={chooseNotGoing} fullWidth />
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
