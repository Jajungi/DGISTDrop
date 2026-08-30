import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLessonStore } from '@/src/stores/lessonStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { Button } from '@/src/components/ui/Button';
import { formatElapsed } from '@/src/utils/courtTime';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

const STATUS_LABEL: Record<string, string> = {
  waiting: '대기',
  next: '다음',
  active: '진행 중',
};

export function CoachLessonControls() {
  const lessonQueue = useLessonStore((s) => s.lessonQueue);
  const setNextInQueue = useLessonStore((s) => s.setNextInQueue);
  const startLesson = useLessonStore((s) => s.startLesson);
  const completeLesson = useLessonStore((s) => s.completeLesson);
  const showToast = useNotificationStore((s) => s.showToast);

  const activeEntry = lessonQueue.find((e) => e.status === 'active');
  const nextEntry = lessonQueue.find((e) => e.status === 'next');
  const firstWaiting = lessonQueue.find((e) => e.status === 'waiting');
  const activeQueue = lessonQueue.filter((e) => e.status !== 'done');

  const [elapsed, setElapsed] = useState(() =>
    activeEntry?.activeSince ? formatElapsed(activeEntry.activeSince) : ''
  );

  useEffect(() => {
    if (!activeEntry?.activeSince) {
      setElapsed('');
      return;
    }
    const tick = () => setElapsed(formatElapsed(activeEntry.activeSince));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [activeEntry?.activeSince, activeEntry?.id]);

  if (activeQueue.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>오늘 레슨 대기열이 비어 있어요.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {activeEntry ? (
        <View style={styles.activeCard}>
          <View style={styles.activeTop}>
            <Text style={styles.activeLabel}>레슨 진행 중</Text>
            {elapsed ? <Text style={styles.timer}>{elapsed}</Text> : null}
          </View>
          <Text style={styles.activeName}>
            {activeEntry.position}번 · {activeEntry.userName}
          </Text>
        </View>
      ) : nextEntry ? (
        <View style={styles.nextCard}>
          <Text style={styles.nextLabel}>다음 차례</Text>
          <Text style={styles.nextName}>
            {nextEntry.position}번 · {nextEntry.userName}
          </Text>
        </View>
      ) : (
        <Text style={styles.hint}>대기 중인 회원에게 다음 차례를 지정해 주세요.</Text>
      )}

      <View style={styles.actions}>
        <Button
          title="다음 사람 호출"
          onPress={() => {
            if (!firstWaiting) {
              showToast({ type: 'info', title: '', message: '대기 중인 회원이 없어요.' });
              return;
            }
            setNextInQueue(firstWaiting.id);
            showToast({
              type: 'success',
              title: '',
              message: `${firstWaiting.userName}님을 다음 차례로 지정했어요.`,
            });
          }}
          size="sm"
          variant="outline"
          disabled={!firstWaiting}
          style={styles.actionBtn}
        />
        <Button
          title="레슨 시작"
          onPress={() => {
            if (!nextEntry) {
              showToast({ type: 'info', title: '', message: '다음 차례 회원이 없어요.' });
              return;
            }
            if (activeEntry) {
              showToast({ type: 'warning', title: '', message: '진행 중인 레슨을 먼저 종료해 주세요.' });
              return;
            }
            startLesson(nextEntry.id);
            showToast({ type: 'success', title: '', message: `${nextEntry.userName}님 레슨을 시작했어요.` });
          }}
          size="sm"
          variant="secondary"
          disabled={!nextEntry || !!activeEntry}
          style={styles.actionBtn}
        />
        <Button
          title="레슨 종료"
          onPress={() => {
            if (!activeEntry) {
              showToast({ type: 'info', title: '', message: '진행 중인 레슨이 없어요.' });
              return;
            }
            completeLesson(activeEntry.id);
            showToast({ type: 'success', title: '', message: `${activeEntry.userName}님 레슨을 종료했어요.` });
          }}
          size="sm"
          variant="primary"
          disabled={!activeEntry}
          style={styles.actionBtn}
        />
      </View>

      <View style={styles.queueMini}>
        {activeQueue.map((e) => (
          <View key={e.id} style={styles.queueRow}>
            <Text style={styles.queuePos}>{e.position}</Text>
            <Text style={styles.queueName}>{e.userName}</Text>
            <Text
              style={[
                styles.queueStatus,
                e.status === 'next' && styles.statusNext,
                e.status === 'active' && styles.statusActive,
              ]}
            >
              {STATUS_LABEL[e.status]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  emptyBox: {
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
  },
  emptyText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  activeCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  activeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeLabel: { ...typography.small, color: colors.primary, fontWeight: '700' },
  timer: { ...typography.bodyBold, color: colors.primary, fontSize: 18 },
  activeName: { ...typography.bodyBold, color: colors.text },
  nextCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: 2,
  },
  nextLabel: { ...typography.small, color: colors.textMuted, fontWeight: '600' },
  nextName: { ...typography.bodyBold, color: colors.text },
  hint: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  actionBtn: { flexGrow: 1, minWidth: 96 },
  queueMini: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  queueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  queuePos: { ...typography.bodyBold, color: colors.primary, width: 22, textAlign: 'center' },
  queueName: { ...typography.caption, color: colors.text, flex: 1 },
  queueStatus: { ...typography.small, color: colors.textMuted },
  statusNext: { color: colors.error, fontWeight: '700' },
  statusActive: { color: colors.primary, fontWeight: '700' },
});
