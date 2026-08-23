import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Platform } from 'react-native';
import { AdminClosureCalendar } from '@/src/components/admin/AdminClosureCalendar';
import { AdminNoticesPanel } from '@/src/components/admin/AdminNoticesPanel';
import { AdminJoinInfoPanel } from '@/src/components/admin/AdminJoinInfoPanel';
import { AdminSubTabs } from '@/src/components/admin/AdminSubTabs';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { useActivityScheduleStore } from '@/src/stores/activityScheduleStore';
import { getActivityDayLabel } from '@/src/services/activityTime';
import { cloneSchedule, formatHHMM, parseHHMM } from '@/src/utils/activitySchedule';
import { colors, spacing, typography, borderRadius } from '@/src/theme';
import type { ActivitySession } from '@/src/types';

type SettingsSub = 'schedule' | 'calendar' | 'notices' | 'join';

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 0]; // 월→일

interface AdminSettingsPanelProps {
  adminId: string;
  adminName: string;
  onToast: (type: 'success' | 'info' | 'warning', message: string) => void;
}

function daysFromSessions(sessions: ActivitySession[]): number[] {
  return [...new Set(sessions.map((s) => s.day))].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
}

function timeFromSessions(sessions: ActivitySession[]): { start: string; end: string } {
  const first = sessions[0];
  if (!first) return { start: '18:30', end: '21:40' };
  return {
    start: formatHHMM(first.startHour, first.startMinute),
    end: formatHHMM(first.endHour, first.endMinute),
  };
}

function buildSessions(days: number[], start: string, end: string): ActivitySession[] {
  const parsedStart = parseHHMM(start) ?? { hour: 18, minute: 30 };
  const parsedEnd = parseHHMM(end) ?? { hour: 21, minute: 40 };
  const unique = days.length ? days : [1];
  return unique.map((day) => ({
    day,
    startHour: parsedStart.hour,
    startMinute: parsedStart.minute,
    endHour: parsedEnd.hour,
    endMinute: parsedEnd.minute,
  }));
}

export function AdminSettingsPanel({ adminId, adminName, onToast }: AdminSettingsPanelProps) {
  const schedule = useActivityScheduleStore((s) => s.schedule);
  const setSchedule = useActivityScheduleStore((s) => s.setSchedule);

  const [sub, setSub] = useState<SettingsSub>('schedule');
  const initialTime = timeFromSessions(schedule);
  const [selectedDays, setSelectedDays] = useState<number[]>(() => daysFromSessions(schedule));
  const [startInput, setStartInput] = useState(initialTime.start);
  const [endInput, setEndInput] = useState(initialTime.end);
  const [dirty, setDirty] = useState(false);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length <= 1) return prev;
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
    setDirty(true);
  };

  return (
    <View style={styles.wrap}>
      <AdminSubTabs
        active={sub}
        onChange={setSub}
        items={[
          { key: 'schedule', label: '활동 시간' },
          { key: 'calendar', label: '달력' },
          { key: 'notices', label: '공지' },
          { key: 'join', label: '가입·참고' },
        ]}
      />

      {sub === 'calendar' && <AdminClosureCalendar onToast={onToast} />}

      {sub === 'notices' && (
        <AdminNoticesPanel
          adminId={adminId}
          adminName={adminName}
          onToast={onToast}
        />
      )}

      {sub === 'join' && <AdminJoinInfoPanel adminId={adminId} onToast={onToast} />}

      {sub === 'schedule' && (
        <View style={styles.stack}>
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>정기 활동 시간</Text>
            <Text style={styles.hint}>
              요일을 고르고 시작·종료만 맞추면 됩니다. 휴관·추가 활동일은 [달력]에서 지정합니다.
            </Text>

            <Text style={styles.timeLabel}>요일</Text>
            <View style={styles.dayRow}>
              {DAY_OPTIONS.map((day) => {
                const on = selectedDays.includes(day);
                return (
                  <Pressable
                    key={day}
                    onPress={() => toggleDay(day)}
                    style={[styles.dayChip, on && styles.dayChipOn]}
                  >
                    <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>
                      {getActivityDayLabel(day)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>시작</Text>
                <TextInput
                  style={styles.input}
                  value={startInput}
                  onChangeText={(text) => {
                    setStartInput(text);
                    setDirty(true);
                  }}
                  placeholder="18:30"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <Text style={styles.timeSep}>~</Text>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>종료</Text>
                <TextInput
                  style={styles.input}
                  value={endInput}
                  onChangeText={(text) => {
                    setEndInput(text);
                    setDirty(true);
                  }}
                  placeholder="21:40"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.actions}>
              <Button
                title={dirty ? '저장' : '저장됨'}
                size="sm"
                disabled={!dirty}
                onPress={async () => {
                  if (!parseHHMM(startInput) || !parseHHMM(endInput)) {
                    onToast('warning', '시간은 18:30 형식으로 입력해 주세요.');
                    return;
                  }
                  const draft = buildSessions(selectedDays, startInput, endInput);
                  const r = await setSchedule(draft);
                  if (r.success) {
                    const next = cloneSchedule(useActivityScheduleStore.getState().schedule);
                    setSelectedDays(daysFromSessions(next));
                    const t = timeFromSessions(next);
                    setStartInput(t.start);
                    setEndInput(t.end);
                    setDirty(false);
                  }
                  onToast(r.success ? 'success' : 'warning', r.message);
                }}
              />
            </View>
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  stack: { gap: spacing.md },
  block: { gap: spacing.sm, padding: spacing.md },
  blockTitle: { ...typography.h3, color: colors.text, fontSize: 15 },
  hint: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  dayChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  dayChipTextOn: { color: colors.textLight },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, flexWrap: 'wrap' },
  timeField: { flexGrow: 1, minWidth: 88, gap: 4 },
  timeLabel: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  timeSep: { ...typography.bodyBold, color: colors.textMuted, paddingBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text,
    backgroundColor: colors.surface,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
});
