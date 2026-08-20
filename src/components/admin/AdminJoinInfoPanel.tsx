import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { useAppStore } from '@/src/stores/authStore';
import { usePeakHoursStore } from '@/src/stores/peakHoursStore';
import { recordAdminLogAsActor } from '@/src/services/adminLog';
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

  return (
    <View style={styles.wrap}>
      <Card style={styles.block}>
        <Text style={styles.blockTitle}>가입 즉시 승인</Text>
        <Text style={styles.hint}>
          켜면 새 회원이 승인 알림 없이 바로 이용할 수 있어요. 끄면 가입 후 운영진 승인이 필요합니다.
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
            {openRegistration ? '켜짐 · 즉시 이용 가능' : '꺼짐 · 승인 대기'}
          </Text>
          <View style={[styles.switchTrack, openRegistration && styles.switchTrackOn]}>
            <View style={[styles.switchKnob, openRegistration && styles.switchKnobOn]} />
          </View>
        </Pressable>
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
});
