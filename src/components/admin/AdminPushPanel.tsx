import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Platform } from 'react-native';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { colors, spacing, typography, borderRadius, withAlpha } from '@/src/theme';
import { useActivityScheduleStore } from '@/src/stores/activityScheduleStore';
import {
  activityStartHHMMForDay,
  fillActivityNotifyTemplate,
  formatActivityScheduleLabel,
  seoulWeekday,
} from '@/src/utils/activitySchedule';
import { getActivityDayLabel } from '@/src/services/activityTime';
import {
  fetchPushNotifySettings,
  savePushNotifySettings,
  toggleActivityCancelToday,
  invokeCancelNoticePush,
  CANCEL_PUSH_TITLE,
  fetchPushNotifyLogs,
  fetchPushTokenStats,
  prunePushTokens,
  invokeBroadcastPush,
  DEFAULT_PUSH_SETTINGS,
  type PushNotifySettings,
  type PushNotifyLog,
  type PushTokenStats,
} from '@/src/services/supabase/pushSettings';
import { isSupabaseEnabled } from '@/src/lib/supabase';

type PushSub = 'status' | 'settings' | 'send' | 'logs';

function ActivityNotifyPreview({
  title,
  body,
  showActions,
}: {
  title: string;
  body: string;
  showActions: boolean;
}) {
  return (
    <View style={styles.notifyCard}>
      <Text style={styles.notifyApp}>Drop</Text>
      <Text style={styles.notifyTitle}>{title}</Text>
      <Text style={styles.notifyBody}>{body}</Text>
      {showActions ? (
        <View style={styles.notifyActions}>
          <View style={styles.notifyAction}>
            <Text style={styles.notifyActionText}>참석</Text>
          </View>
          <View style={styles.notifyAction}>
            <Text style={styles.notifyActionText}>불참</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

interface AdminPushPanelProps {
  adminId: string;
  onToast: (type: 'success' | 'info' | 'warning', message: string) => void;
}

export function AdminPushPanel({ adminId, onToast }: AdminPushPanelProps) {
  const schedule = useActivityScheduleStore((s) => s.schedule);
  const cancelledDate = useActivityScheduleStore((s) => s.cancelledDate);
  const [sub, setSub] = useState<PushSub>('status');
  const [settings, setSettings] = useState<PushNotifySettings>(DEFAULT_PUSH_SETTINGS);
  const [logs, setLogs] = useState<PushNotifyLog[]>([]);
  const [tokenStats, setTokenStats] = useState<PushTokenStats>({
    total: 0,
    users: 0,
    app: 0,
    web: 0,
    other: 0,
    android: 0,
    removable: 0,
    extraWeb: 0,
    heavy: [],
  });
  const [pruning, setPruning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [customTitle, setCustomTitle] = useState('Drop');

  const [editNotifyTime, setEditNotifyTime] = useState(DEFAULT_PUSH_SETTINGS.notify_time);
  const [editTemplate, setEditTemplate] = useState(DEFAULT_PUSH_SETTINGS.message_template);
  const [editCancelMsg, setEditCancelMsg] = useState(DEFAULT_PUSH_SETTINGS.cancel_message);

  const activityLabel = formatActivityScheduleLabel(schedule, getActivityDayLabel);
  const activityStartLabel = useMemo(
    () => activityStartHHMMForDay(schedule, seoulWeekday()),
    [schedule]
  );

  const fetchAll = useCallback(async () => {
    if (!isSupabaseEnabled()) return;
    setLoading(true);
    try {
      const [s, l, t] = await Promise.all([
        fetchPushNotifySettings(),
        fetchPushNotifyLogs(),
        fetchPushTokenStats(),
      ]);
      setSettings(s);
      setEditNotifyTime(s.notify_time);
      setEditTemplate(s.message_template);
      setEditCancelMsg(s.cancel_message);
      setLogs(l);
      setTokenStats(t);
    } catch {
      onToast('warning', '알림 설정을 불러오지 못했어요');
    }
    setLoading(false);
  }, [onToast]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  useEffect(() => {
    setSettings((s) => ({
      ...s,
      cancel_today: cancelledDate != null,
      cancel_date: cancelledDate,
    }));
  }, [cancelledDate]);

  const saveSettings = useCallback(async () => {
    setSaving(true);
    try {
      const next = {
        ...settings,
        notify_time: editNotifyTime,
        message_template: editTemplate,
        cancel_message: editCancelMsg,
      };
      const saved = await savePushNotifySettings(next);
      setSettings(saved);
      onToast('success', '알림 설정 저장됨');
    } catch {
      onToast('warning', '저장 실패');
    }
    setSaving(false);
  }, [settings, editNotifyTime, editTemplate, editCancelMsg, onToast]);

  const toggleEnabled = async () => {
    const next = { ...settings, enabled: !settings.enabled };
    try {
      setSettings(await savePushNotifySettings(next));
      onToast('info', next.enabled ? '푸시 알림 켜짐' : '푸시 알림 꺼짐');
    } catch { onToast('warning', '저장 실패'); }
  };

  const toggleAuto = async () => {
    const next = { ...settings, auto_notify_enabled: !settings.auto_notify_enabled };
    try {
      setSettings(await savePushNotifySettings(next));
      onToast('info', next.auto_notify_enabled ? '자동 알림 켜짐' : '자동 알림 꺼짐');
    } catch { onToast('warning', '저장 실패'); }
  };

  const sendCancelNotice = async (message: string) => {
    const result = await invokeCancelNoticePush(message);
    onToast(
      'success',
      `취소 안내 ${result.sent}명 (앱 ${result.expo ?? 0} · 웹 ${result.web ?? 0}${
        result.pruned ? ` · 못 받는 기기 ${result.pruned}대 정리` : ''
      })`
    );
    void fetchAll();
    return result;
  };

  const toggleCancelToday = async () => {
    const turningOn = !settings.cancel_today;
    try {
      const next = await toggleActivityCancelToday(turningOn, {
        cancel_message: editCancelMsg,
      });
      setSettings(next);
      if (!next.cancel_today) {
        onToast('info', '오늘 활동 복구됨');
        return;
      }
      try {
        await sendCancelNotice(next.cancel_message);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '발송 실패';
        onToast('warning', `취소는 저장됐지만 안내는 못 보냈어요. ${msg}`);
      }
    } catch { onToast('warning', '저장 실패'); }
  };

  const pruneDeadTokens = async () => {
    setPruning(true);
    try {
      const result = await prunePushTokens();
      await fetchAll();
      const parts: string[] = [];
      if (result.unapproved) parts.push(`미승인·게스트 ${result.unapproved}`);
      if (result.invalid) parts.push(`형식 오류 ${result.invalid}`);
      if (result.extraWeb) parts.push(`여분 웹 ${result.extraWeb}`);
      if (result.old_logs) parts.push(`옛 기록 ${result.old_logs}`);
      onToast(
        'success',
        result.removed === 0 && result.old_logs === 0
          ? '지울 등록이 없어요. 지금 숫자는 승인 회원이 알림을 켠 기기입니다. 더 이상 안 받는 구독은 알림을 보낼 때 빠집니다.'
          : `기기 ${result.removed}대 정리${parts.length ? ` (${parts.join(' · ')})` : ''}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '정리 실패';
      onToast(
        'warning',
        msg.includes('rpc_prune_push_tokens') || msg.includes('does not exist') || msg.includes('42883')
          ? 'Supabase에서 037_web_push_one_per_user.sql 을 실행해 주세요.'
          : msg
      );
    }
    setPruning(false);
  };

  const previewTitle = settings.cancel_today ? CANCEL_PUSH_TITLE : 'Drop 활동 알림';
  const previewMessage = fillActivityNotifyTemplate(
    settings.cancel_today ? editCancelMsg : editTemplate,
    activityStartLabel
  );
  const showAttendanceActions = !settings.cancel_today;

  const sendActivityNotify = async () => {
    if (settings.cancel_today) {
      onToast('info', '오늘은 활동이 취소되어 활동 알림을 보내지 않아요. 취소 안내를 다시 보내 주세요.');
      return;
    }
    const message = previewMessage;
    try {
      const result = await invokeBroadcastPush({
        title: 'Drop 활동 알림',
        message,
        type: 'activity',
      });
      onToast(
        'success',
        `${result.sent}명에게 발송됨 (앱 ${result.expo ?? 0} · 웹 ${result.web ?? 0}${
          result.pruned ? ` · 못 받는 기기 ${result.pruned}대 정리` : ''
        })`
      );
      void fetchAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '발송 실패';
      onToast('warning', msg);
    }
  };

  const sendCustom = async () => {
    if (!customMessage.trim()) {
      onToast('warning', '메시지를 입력하세요');
      return;
    }
    try {
      const result = await invokeBroadcastPush({
        title: customTitle.trim() || 'Drop',
        message: customMessage.trim(),
        type: 'custom',
      });
      onToast(
        'success',
        `${result.sent}명에게 발송됨${result.pruned ? ` · 못 받는 기기 ${result.pruned}대 정리` : ''}`
      );
      setCustomMessage('');
      void fetchAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '발송 실패';
      onToast('warning', msg);
    }
  };

  return (
    <View style={styles.wrap}>
      <Card style={styles.statusBar}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, settings.enabled ? styles.online : styles.offline]} />
          <Text style={styles.statusText}>푸시 {settings.enabled ? 'ON' : 'OFF'}</Text>
          <Text style={styles.statusText}>
            등록 {tokenStats.users}명 · 기기 {tokenStats.total} (앱 {tokenStats.app} · 웹 {tokenStats.web}
            {tokenStats.other ? ` · 기타 ${tokenStats.other}` : ''})
          </Text>
        </View>
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabs}>
        {([
          { key: 'status', label: '현황' },
          { key: 'settings', label: '알림 설정' },
          { key: 'send', label: '발송' },
          { key: 'logs', label: '기록' },
        ] as const).map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setSub(item.key)}
            style={[styles.subTab, sub === item.key && styles.subTabActive]}
          >
            <Text style={[styles.subTabText, sub === item.key && styles.subTabTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {sub === 'status' && (
        <View style={styles.content}>
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>활동 일정</Text>
            <Text style={styles.hint}>{activityLabel}</Text>
            <Text style={styles.hint}>활동 시간은 [설정 → 활동 시간], 휴관·추가 활동일은 [설정 → 달력]에서 변경합니다.</Text>
          </Card>

          {settings.cancel_today && (
            <Card style={styles.cancelBanner}>
              <Text style={styles.cancelText}>⚠️ 오늘 활동 취소 — 활동 알림은 안 가고, 취소 안내만 보냅니다. 날짜가 바뀌면 취소는 풀립니다.</Text>
            </Card>
          )}

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>알림 등록 현황</Text>
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{tokenStats.users}</Text>
                <Text style={styles.statLabel}>사람</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{tokenStats.total}</Text>
                <Text style={styles.statLabel}>기기</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{tokenStats.app}</Text>
                <Text style={styles.statLabel}>앱</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{tokenStats.web}</Text>
                <Text style={styles.statLabel}>웹</Text>
              </View>
            </View>
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{tokenStats.removable}</Text>
                <Text style={styles.statLabel}>미승인·게스트</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{tokenStats.extraWeb}</Text>
                <Text style={styles.statLabel}>여분 웹</Text>
              </View>
              {tokenStats.other > 0 ? (
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{tokenStats.other}</Text>
                  <Text style={styles.statLabel}>기타</Text>
                </View>
              ) : null}
            </View>
            {tokenStats.heavy.length > 0 ? (
              <View style={styles.heavyBox}>
                <Text style={styles.heavyTitle}>기기 많은 사람</Text>
                {tokenStats.heavy.map((person) => (
                  <Text key={person.userId} style={styles.heavyLine}>
                    {person.name} · {person.total}대 (앱 {person.app} · 웹 {person.web})
                  </Text>
                ))}
              </View>
            ) : null}
            <Text style={styles.hint}>
              사람 = 알림을 켠 회원 수. 기기 = DB에 남은 구독 수. 웹은 사람당 최근 1개만 유지합니다(PC·폰 웹 합산). 여분 웹이 보이면 「못 쓰는 등록 정리」로 지울 수 있고, 알림을 다시 켜거나 활동 알림을 보내면 죽은 구독도 빠집니다.
            </Text>
            <Button
              title={pruning ? '정리 중…' : '못 쓰는 등록 정리'}
              onPress={() => void pruneDeadTokens()}
              variant="outline"
              fullWidth
              disabled={pruning || loading}
            />
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>빠른 작업</Text>
            <Button
              title={settings.cancel_today ? '🔄 오늘 활동 복구' : '❌ 오늘 활동 취소'}
              onPress={() => void toggleCancelToday()}
              variant={settings.cancel_today ? 'secondary' : 'danger'}
              fullWidth
            />
            <View style={styles.gap} />
            <Button title="새로고침" onPress={() => void fetchAll()} variant="outline" fullWidth disabled={loading} />
          </Card>
        </View>
      )}

      {sub === 'settings' && (
        <View style={styles.content}>
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>푸시 상태</Text>
            <Pressable style={styles.toggleRow} onPress={() => void toggleEnabled()}>
              <Text style={styles.toggleLabel}>푸시 알림 활성화</Text>
              <View style={[styles.toggle, settings.enabled && styles.toggleOn]}>
                <View style={[styles.toggleKnob, settings.enabled && styles.toggleKnobOn]} />
              </View>
            </Pressable>
            <Pressable style={styles.toggleRow} onPress={() => void toggleAuto()}>
              <Text style={styles.toggleLabel}>활동일 자동 알림</Text>
              <View style={[styles.toggle, settings.auto_notify_enabled && styles.toggleOn]}>
                <View style={[styles.toggleKnob, settings.auto_notify_enabled && styles.toggleKnobOn]} />
              </View>
            </Pressable>
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>자동 발송 시간</Text>
            <Text style={styles.hint}>
              활동일에 KST 기준 이 시각에 푸시가 나갑니다. 본문의 {'{time}'}은 여기가 아니라 당일 활동 시작 시간입니다.
            </Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>알림 시간</Text>
              <TextInput
                style={styles.input}
                value={editNotifyTime}
                onChangeText={setEditNotifyTime}
                placeholder="18:00"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>메시지 템플릿</Text>
            <Text style={styles.hint}>
              {'{time}'}은 당일 활동 시작으로 바뀝니다. 자동 발송 시각({editNotifyTime})이 아닙니다.
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editTemplate}
              onChangeText={setEditTemplate}
              multiline
              numberOfLines={3}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.resolvedSample}>보낼 문장: {previewMessage}</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>취소 메시지</Text>
              <TextInput
                style={styles.input}
                value={editCancelMsg}
                onChangeText={setEditCancelMsg}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>미리보기</Text>
            <ActivityNotifyPreview
              title={previewTitle}
              body={previewMessage}
              showActions={showAttendanceActions}
            />
          </Card>

          <Button
            title={saving ? '저장 중...' : '설정 저장'}
            onPress={() => void saveSettings()}
            variant="secondary"
            fullWidth
            disabled={saving}
          />
        </View>
      )}

      {sub === 'send' && (
        <View style={styles.content}>
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>활동 알림 수동 발송</Text>
            <ActivityNotifyPreview
              title={previewTitle}
              body={previewMessage}
              showActions={showAttendanceActions}
            />
            {settings.cancel_today ? (
              <Text style={styles.hint}>오늘은 취소라 활동 알림을 보내지 않습니다. 취소 안내를 다시 보낼 수 있습니다.</Text>
            ) : null}
            <View style={styles.gap} />
            {settings.cancel_today ? (
              <Button
                title="취소 안내 다시 보내기"
                onPress={() => {
                  void sendCancelNotice(editCancelMsg).catch((err) => {
                    const msg = err instanceof Error ? err.message : '발송 실패';
                    onToast('warning', msg);
                  });
                }}
                variant="danger"
                fullWidth
              />
            ) : (
              <Button
                title="활동 알림 발송"
                onPress={() => void sendActivityNotify()}
                variant="secondary"
                fullWidth
              />
            )}
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>커스텀 메시지</Text>
            <TextInput
              style={styles.input}
              value={customTitle}
              onChangeText={setCustomTitle}
              placeholder="제목"
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={customMessage}
              onChangeText={setCustomMessage}
              multiline
              numberOfLines={4}
              placeholder="보낼 메시지 입력..."
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.gap} />
            <Button title="발송" onPress={() => void sendCustom()} variant="outline" fullWidth />
          </Card>
        </View>
      )}

      {sub === 'logs' && (
        <View style={styles.content}>
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>발송 기록 ({logs.length}건)</Text>
            {logs.length === 0 && <Text style={styles.empty}>발송 기록 없음</Text>}
            {logs.map((log) => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View style={[styles.logBadge, log.type === 'activity' && styles.logBadgeActivity]}>
                    <Text style={styles.logBadgeText}>
                      {log.type === 'activity' ? '활동' : log.type === 'cancel' ? '취소' : '커스텀'}
                    </Text>
                  </View>
                  <Text style={styles.logTime}>
                    {new Date(log.sent_at).toLocaleString('ko-KR', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Text style={styles.logMsg}>{log.message}</Text>
                <Text style={styles.logResponse}>수신: {log.recipient_count}명</Text>
              </View>
            ))}
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  statusBar: { marginBottom: spacing.sm, paddingVertical: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  online: { backgroundColor: colors.success },
  offline: { backgroundColor: colors.error },
  statusText: { ...typography.small, color: colors.textMuted, marginRight: spacing.md },
  subTabs: { marginBottom: spacing.md, flexGrow: 0 },
  subTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  subTabActive: { backgroundColor: colors.primaryLight },
  subTabText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  subTabTextActive: { color: colors.primary, fontWeight: '800' },
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  block: { gap: spacing.sm },
  blockTitle: { ...typography.bodyBold, color: colors.text },
  hint: { ...typography.small, color: colors.textMuted },
  empty: { ...typography.caption, color: colors.textMuted, paddingVertical: spacing.md },
  gap: { height: spacing.sm },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
  },
  statValue: { ...typography.h3, color: colors.primary },
  statLabel: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  heavyBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    gap: 4,
  },
  heavyTitle: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  heavyLine: { ...typography.small, color: colors.text },
  cancelBanner: {
    backgroundColor: withAlpha(colors.warning, 0.16),
    borderWidth: 1,
    borderColor: withAlpha(colors.warning, 0.4),
  },
  cancelText: { ...typography.bodyBold, color: colors.warning },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  toggleLabel: { ...typography.body, color: colors.text },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.border, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.primary },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.textLight },
  toggleKnobOn: { alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.xs },
  inputLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top', marginTop: spacing.xs },
  resolvedSample: { ...typography.small, color: colors.primary, marginTop: spacing.xs, lineHeight: 18 },
  notifyCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifyApp: { ...typography.caption, color: colors.textMuted, fontWeight: '700' },
  notifyTitle: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
  notifyBody: { ...typography.body, color: colors.textSecondary, lineHeight: 20 },
  notifyActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  notifyAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
  },
  notifyActionText: { ...typography.caption, color: colors.primary, fontWeight: '800' },
  logCard: { backgroundColor: colors.surfaceAlt, borderRadius: borderRadius.sm, padding: spacing.md, gap: 4 },
  logHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.border },
  logBadgeActivity: { backgroundColor: colors.primaryLight },
  logBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  logTime: { ...typography.small, color: colors.textMuted },
  logMsg: { ...typography.body, color: colors.text, marginTop: 4 },
  logResponse: { ...typography.caption, color: colors.textSecondary },
});
