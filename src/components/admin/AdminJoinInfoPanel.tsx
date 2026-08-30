import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, TextInput } from 'react-native';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { useAppStore } from '@/src/stores/authStore';
import { usePeakHoursStore } from '@/src/stores/peakHoursStore';
import { recordAdminLogAsActor } from '@/src/services/adminLog';
import {
  deleteClubRosterEntry,
  fetchClubRoster,
  fetchRosterEnforcement,
  setRosterEnforcementRemote,
  upsertClubRoster,
} from '@/src/services/supabase/roster';
import { parseRosterPaste, type ClubRosterEntry } from '@/src/utils/clubRoster';
import { GYM_LOCATION } from '@/src/constants';
import { formatPeakHoursLabel } from '@/src/utils/peakHours';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

interface Props {
  adminId: string;
  onToast: (type: 'success' | 'info' | 'warning', message: string) => void;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

export function AdminJoinInfoPanel({ adminId, onToast }: Props) {
  const openRegistration = useAppStore((s) => s.openRegistration);
  const setOpenRegistration = useAppStore((s) => s.setOpenRegistration);
  const peakHours = usePeakHoursStore((s) => s.hours);
  const savePeakHours = usePeakHoursStore((s) => s.save);
  const [editingPeak, setEditingPeak] = useState(false);
  const [draftHours, setDraftHours] = useState<number[]>(() => [...peakHours]);
  const [rosterPaste, setRosterPaste] = useState('');
  const [roster, setRoster] = useState<ClubRosterEntry[]>([]);
  const [rosterEnforcement, setRosterEnforcement] = useState(false);
  const [rosterBusy, setRosterBusy] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const loadRoster = useCallback(async () => {
    try {
      const [rows, enforced] = await Promise.all([fetchClubRoster(), fetchRosterEnforcement()]);
      setRoster(rows);
      setRosterEnforcement(enforced);
      setRosterError(null);
    } catch (err) {
      setRosterError(err instanceof Error ? err.message : '명단을 불러오지 못했어요.');
    }
  }, []);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  useEffect(() => {
    if (!editingPeak) setDraftHours([...peakHours]);
  }, [peakHours, editingPeak]);

  const toggleHour = (h: number) => {
    if (!editingPeak) return;
    setDraftHours((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h].sort((a, b) => a - b)
    );
  };

  const cancelEdit = () => {
    setDraftHours([...peakHours]);
    setEditingPeak(false);
  };

  const confirmEdit = async () => {
    if (!draftHours.length) {
      onToast('warning', '피크 시간을 하나 이상 선택해 주세요.');
      return;
    }
    const r = await savePeakHours(draftHours);
    onToast(r.success ? 'success' : 'warning', r.message);
    if (r.success) setEditingPeak(false);
  };

  const saveRosterPaste = async () => {
    const parsed = parseRosterPaste(rosterPaste);
    if (!parsed.entries.length) {
      onToast('warning', parsed.errors[0] ?? '학번과 이름을 한 줄에 하나씩 넣어 주세요.');
      return;
    }
    setRosterBusy(true);
    try {
      const r = await upsertClubRoster(parsed.entries);
      await loadRoster();
      setRosterPaste('');
      const extra = parsed.errors.length ? ` (참고 ${parsed.errors.length}줄)` : '';
      onToast(
        'success',
        `명단 저장: 추가 ${r.inserted} · 수정 ${r.updated}${r.skipped ? ` · 건너뜀 ${r.skipped}` : ''}${extra}`
      );
      recordAdminLogAsActor(adminId, {
        category: 'system',
        action: 'roster.upsert',
        message: `명단 저장 추가 ${r.inserted} 수정 ${r.updated}`,
      });
    } catch (err) {
      onToast('warning', err instanceof Error ? err.message : '명단 저장에 실패했어요.');
    } finally {
      setRosterBusy(false);
    }
  };

  const removeRosterRow = async (studentId: string) => {
    setRosterBusy(true);
    try {
      await deleteClubRosterEntry(studentId);
      await loadRoster();
      onToast('info', `${studentId} 명단에서 뺐어요.`);
    } catch (err) {
      onToast('warning', err instanceof Error ? err.message : '삭제에 실패했어요.');
    } finally {
      setRosterBusy(false);
    }
  };

  const toggleRosterEnforcement = async () => {
    setRosterBusy(true);
    try {
      const next = !rosterEnforcement;
      await setRosterEnforcementRemote(next);
      setRosterEnforcement(next);
      onToast(
        next ? 'warning' : 'info',
        next
          ? '명단 제한이 켜졌어요. 학번·실명이 맞으면 즉시 승인, 아니면 대기입니다.'
          : '명단 제한이 꺼졌어요. 가입은 즉시 승인 스위치만 따릅니다.'
      );
      recordAdminLogAsActor(adminId, {
        category: 'system',
        action: next ? 'roster.enforce.on' : 'roster.enforce.off',
        message: `명단 제한 ${next ? 'ON' : 'OFF'}`,
      });
    } catch (err) {
      onToast('warning', err instanceof Error ? err.message : '설정 저장에 실패했어요.');
    } finally {
      setRosterBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Card style={styles.block}>
        <Text style={styles.blockTitle}>동아리 명단 · 가입 규칙</Text>
        <Text style={styles.hint}>
          한 줄에 학번과 이름 (예: 202410001 홍길동). 「명단 제한」을 켜면 목록과 일치할 때만 즉시
          가입되고, 없으면 승인 대기·관리자 알림으로 남습니다.
        </Text>
        {rosterError ? <Text style={styles.warn}>{rosterError}</Text> : null}
        <TextInput
          style={styles.paste}
          value={rosterPaste}
          onChangeText={setRosterPaste}
          placeholder={'202410001 홍길동\n202410002 김철수'}
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
        />
        <Button
          title={rosterBusy ? '저장 중...' : '명단 저장'}
          size="sm"
          onPress={() => void saveRosterPaste()}
          disabled={rosterBusy}
        />
        <Text style={styles.hint}>저장된 명단 {roster.length}명</Text>
        {roster.map((row) => (
          <View key={row.studentId} style={styles.rosterRow}>
            <Text style={styles.rosterText}>
              {row.studentId} · {row.name}
            </Text>
            <Button
              title="삭제"
              size="sm"
              variant="ghost"
              onPress={() => void removeRosterRow(row.studentId)}
              disabled={rosterBusy}
            />
          </View>
        ))}

        <Pressable
          onPress={() => void toggleRosterEnforcement()}
          style={[styles.switchRow, styles.switchRowSpaced]}
          accessibilityRole="switch"
          accessibilityState={{ checked: rosterEnforcement }}
          disabled={rosterBusy}
        >
          <Text style={styles.switchLabel}>
            {rosterEnforcement ? '명단 제한 켜짐 · 없으면 대기' : '명단 제한 꺼짐 · 가입 막지 않음'}
          </Text>
          <View style={[styles.switchTrack, rosterEnforcement && styles.switchTrackOn]}>
            <View style={[styles.switchKnob, rosterEnforcement && styles.switchKnobOn]} />
          </View>
        </Pressable>

        {!rosterEnforcement ? (
          <View style={styles.nestedRule}>
            <Text style={styles.nestedTitle}>명단 제한이 꺼져 있을 때</Text>
            <Text style={styles.nestedHint}>
              아래 스위치로 새 회원을 바로 쓰게 할지, 운영진 승인을 거칠지 정합니다.
            </Text>
            <Pressable
              onPress={async () => {
                const r = await setOpenRegistration(!openRegistration);
                onToast(r.success ? 'success' : 'warning', r.message);
                if (r.success) {
                  recordAdminLogAsActor(adminId, {
                    category: 'system',
                    action: openRegistration ? 'registration.close' : 'registration.open',
                    message: `가입 즉시 승인 ${!openRegistration ? 'ON' : 'OFF'}`,
                  });
                }
              }}
              style={styles.switchRow}
              accessibilityRole="switch"
              accessibilityState={{ checked: openRegistration }}
            >
              <Text style={styles.switchLabel}>
                {openRegistration ? '가입 즉시 승인 · 켜짐' : '가입 즉시 승인 · 꺼짐 (승인 대기)'}
              </Text>
              <View style={[styles.switchTrack, openRegistration && styles.switchTrackOn]}>
                <View style={[styles.switchKnob, openRegistration && styles.switchKnobOn]} />
              </View>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.rosterModeHint}>
            명단 제한이 켜져 있어요. 학번·실명이 명단과 맞으면 즉시 가입, 아니면 승인 대기입니다.
          </Text>
        )}
      </Card>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>피크 시간</Text>
        <Text style={styles.hint}>피크 시각에는 예약 횟수 제한이 적용됩니다.</Text>

        {!editingPeak ? (
          <>
            <Text style={styles.peakValue}>{formatPeakHoursLabel(peakHours)}</Text>
            <Button title="수정" size="sm" variant="outline" onPress={() => setEditingPeak(true)} />
          </>
        ) : (
          <>
            <Text style={styles.hint}>바꿀 시각을 고른 뒤 [확인]을 누르세요.</Text>
            <View style={styles.chipRow}>
              {HOUR_OPTIONS.map((h) => {
                const on = draftHours.includes(h);
                return (
                  <Pressable
                    key={h}
                    onPress={() => toggleHour(h)}
                    style={[styles.hourChip, on && styles.hourChipOn]}
                  >
                    <Text style={[styles.hourChipText, on && styles.hourChipTextOn]}>{h}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.peakActions}>
              <Button title="취소" size="sm" variant="ghost" onPress={cancelEdit} />
              <Button title="확인" size="sm" onPress={() => void confirmEdit()} />
            </View>
          </>
        )}
      </Card>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>체육관 위치 (지오펜스)</Text>
        <Text style={styles.hint}>
          {GYM_LOCATION.name}
          {'\n'}
          위도 {GYM_LOCATION.latitude} · 경도 {GYM_LOCATION.longitude}
          {'\n'}
          반경 {GYM_LOCATION.radiusMeters}m — 코드 상수로 고정되어 있어요.
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  block: { gap: spacing.sm, padding: spacing.md },
  blockTitle: { ...typography.h3, color: colors.text, fontSize: 15 },
  hint: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
  peakValue: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 4,
  },
  peakActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  switchRowSpaced: { marginTop: spacing.xs },
  nestedRule: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    gap: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  nestedTitle: { ...typography.caption, fontWeight: '700', color: colors.text },
  nestedHint: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
  rosterModeHint: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
  },
  switchLabel: { ...typography.bodyBold, color: colors.text, fontSize: 14, flex: 1 },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackOn: { backgroundColor: colors.primary },
  switchKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  switchKnobOn: { alignSelf: 'flex-end' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hourChip: {
    width: 36,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  hourChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  hourChipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  hourChipTextOn: { color: colors.textLight },
  warn: { ...typography.small, color: colors.warning, lineHeight: 18 },
  paste: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rosterText: { ...typography.caption, color: colors.text, flex: 1, fontWeight: '600' },
});
