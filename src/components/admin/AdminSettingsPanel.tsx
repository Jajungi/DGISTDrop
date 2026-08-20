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

export function AdminSettingsPanel({ adminId, adminName, onToast }: AdminSettingsPanelProps) {
  const schedule = useActivityScheduleStore((s) => s.schedule);
  const setSchedule = useActivityScheduleStore((s) => s.setSchedule);

  const [sub, setSub] = useState<SettingsSub>('schedule');
  const [draft, setDraft] = useState<ActivitySession[]>(() => cloneSchedule(schedule));
  const [dirty, setDirty] = useState(false);
  const [startInputs, setStartInputs] = useState(() =>
    schedule.map((s) => formatHHMM(s.startHour, s.startMinute))
  );
  const [endInputs, setEndInputs] = useState(() =>
    schedule.map((s) => formatHHMM(s.endHour, s.endMinute))
  );

  const applyDraft = (sessions: ActivitySession[]) => {
    const next = cloneSchedule(sessions);
    setDraft(next);
    setStartInputs(next.map((s) => formatHHMM(s.startHour, s.startMinute)));
    setEndInputs(next.map((s) => formatHHMM(s.endHour, s.endMinute)));
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
              앱의 활동 중/외 배너·예약 가능 여부·도착 일정 범위에 반영됩니다. 요일별로 여러 구간을
              둘 수 있어요. 단발 휴관·추가 활동일은 [달력] 탭에서 지정합니다.
            </Text>

            {draft.map((session, index) => (
              <View key={`${session.day}-${index}`} style={styles.sessionCard}>
                <View style={styles.dayRow}>
                  {DAY_OPTIONS.map((day) => {
                    const on = session.day === day;
                    return (
                      <Pressable
                        key={day}
                        onPress={() => {
                          const next = [...draft];
                          next[index] = { ...session, day };
                          applyDraft(next);
                        }}
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
                      value={startInputs[index] ?? ''}
                      onChangeText={(text) => {
                        const inputs = [...startInputs];
                        inputs[index] = text;
                        setStartInputs(inputs);
                        const parsed = parseHHMM(text);
                        if (!parsed) return;
                        const next = [...draft];
                        next[index] = {
                          ...session,
                          startHour: parsed.hour,
                          startMinute: parsed.minute,
                        };
                        setDraft(next);
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
                      value={endInputs[index] ?? ''}
                      onChangeText={(text) => {
                        const inputs = [...endInputs];
                        inputs[index] = text;
                        setEndInputs(inputs);
                        const parsed = parseHHMM(text);
                        if (!parsed) return;
                        const next = [...draft];
                        next[index] = {
                          ...session,
                          endHour: parsed.hour,
                          endMinute: parsed.minute,
                        };
                        setDraft(next);
                        setDirty(true);
                      }}
                      placeholder="21:50"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <Button
                    title="삭제"
                    size="sm"
                    variant="ghost"
                    onPress={() => applyDraft(draft.filter((_, i) => i !== index))}
                    disabled={draft.length <= 1}
                  />
                </View>
              </View>
            ))}

            <View style={styles.actions}>
              <Button
                title="요일 추가"
                size="sm"
                variant="outline"
                onPress={() =>
                  applyDraft([
                    ...draft,
                    {
                      day: 2,
                      startHour: 18,
                      startMinute: 30,
                      endHour: 21,
                      endMinute: 50,
                    },
                  ])
                }
              />
              <Button
                title={dirty ? '저장' : '저장됨'}
                size="sm"
                disabled={!dirty}
                onPress={async () => {
                  const r = await setSchedule(draft);
                  if (r.success) {
                    const next = cloneSchedule(useActivityScheduleStore.getState().schedule);
                    setDraft(next);
                    setStartInputs(next.map((s) => formatHHMM(s.startHour, s.startMinute)));
                    setEndInputs(next.map((s) => formatHHMM(s.endHour, s.endMinute)));
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
  sessionCard: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
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
