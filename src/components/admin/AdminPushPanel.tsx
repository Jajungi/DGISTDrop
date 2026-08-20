import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Platform } from 'react-native';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { colors, spacing, typography, borderRadius } from '@/src/theme';
import { useActivityScheduleStore } from '@/src/stores/activityScheduleStore';
import { formatActivityScheduleLabel } from '@/src/utils/activitySchedule';
import { getActivityDayLabel } from '@/src/services/activityTime';
import {
  fetchPushNotifySettings,
  savePushNotifySettings,
  toggleActivityCancelToday,
  fetchPushNotifyLogs,
  fetchPushTokenStats,
  invokeBroadcastPush,
  DEFAULT_PUSH_SETTINGS,
  type PushNotifySettings,
  type PushNotifyLog,
} from '@/src/services/supabase/pushSettings';
import { isSupabaseEnabled } from '@/src/lib/supabase';

type PushSub = 'status' | 'settings' | 'send' | 'logs';

interface AdminPushPanelProps {
  adminId: string;
  onToast: (type: 'success' | 'info' | 'warning', message: string) => void;
}

export function AdminPushPanel({ adminId, onToast }: AdminPushPanelProps) {
  const schedule = useActivityScheduleStore((s) => s.schedule);
  const [sub, setSub] = useState<PushSub>('status');
  const [settings, setSettings] = useState<PushNotifySettings>(DEFAULT_PUSH_SETTINGS);
  const [logs, setLogs] = useState<PushNotifyLog[]>([]);
  const [tokenStats, setTokenStats] = useState({ total: 0, android: 0, web: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [customTitle, setCustomTitle] = useState('Drop');

  const [editNotifyTime, setEditNotifyTime] = useState(DEFAULT_PUSH_SETTINGS.notify_time);
  const [editTemplate, setEditTemplate] = useState(DEFAULT_PUSH_SETTINGS.message_template);
  const [editCancelMsg, setEditCancelMsg] = useState(DEFAULT_PUSH_SETTINGS.cancel_message);

  const activityLabel = formatActivityScheduleLabel(schedule, getActivityDayLabel);

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

  const toggleCancelToday = async () => {
    try {
      const next = await toggleActivityCancelToday(!settings.cancel_today);
      setSettings(next);
      onToast('info', next.cancel_today ? '오늘 활동 취소됨' : '오늘 활동 복구됨');
    } catch { onToast('warning', '저장 실패'); }
  };

  const sendActivityNotify = async () => {
    const firstStart = schedule[0]
      ? `${String(schedule[0].startHour).padStart(2, '0')}:${String(schedule[0].startMinute).padStart(2, '0')}`
      : '18:30';
    const message = settings.cancel_today
      ? settings.cancel_message
      : settings.message_template.replace('{time}', firstStart);
    try {
      const result = await invokeBroadcastPush({
        title: 'Drop 활동 알림',
        message,
        type: 'activity',
      });
      onToast('success', `${result.sent}명에게 발송됨 (앱 ${result.expo ?? 0} · 웹 ${result.web ?? 0})`);
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
      onToast('success', `${result.sent}명에게 발송됨`);
      setCustomMessage('');
      void fetchAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '발송 실패';
      onToast('warning', msg);
    }
  };

  const previewMessage = settings.cancel_today
    ? settings.cancel_message
    : editTemplate.replace('{time}', editNotifyTime);

  return (
    <View style={styles.wrap}>
      <Card style={styles.statusBar}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, settings.enabled ? styles.online : styles.offline]} />
          <Text style={styles.statusText}>푸시 {settings.enabled ? 'ON' : 'OFF'}</Text>
          <Text style={styles.statusText}>등록 {tokenStats.total}명 (앱 {tokenStats.android} · 웹 {tokenStats.web})</Text>
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
            <Text style={styles.hint}>활동 시간은 [설정 → 활동 시간] 탭에서 변경합니다.</Text>
          </Card>

          {settings.cancel_today && (
            <Card style={styles.cancelBanner}>
              <Text style={styles.cancelText}>⚠️ 오늘 활동 취소 상태</Text>
            </Card>
          )}

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>알림 등록 현황</Text>
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{tokenStats.total}</Text>
                <Text style={styles.statLabel}>전체</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{tokenStats.android}</Text>
                <Text style={styles.statLabel}>Android 앱</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{tokenStats.web}</Text>
                <Text style={styles.statLabel}>웹(PWA)</Text>
              </View>
            </View>
            <Text style={styles.hint}>
              iOS는 앱 설치 대신 Safari에서 홈 화면에 추가한 뒤 알림을 켜야 합니다.
            </Text>
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
            <Text style={styles.hint}>활동일에 KST 기준 이 시간에 푸시가 발송됩니다 (5분 간격 Cron 필요).</Text>
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
            <Text style={styles.hint}>{'{time}'} → 당일 첫 활동 시작 시간</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editTemplate}
              onChangeText={setEditTemplate}
              multiline
              numberOfLines={3}
              placeholderTextColor={colors.textMuted}
            />
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
            <View style={styles.previewBubble}>
              <Text style={styles.previewTitle}>Drop 활동 알림</Text>
              <Text style={styles.previewText}>{previewMessage}</Text>
            </View>
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
            <View style={styles.previewBubble}>
              <Text style={styles.previewTitle}>Drop 활동 알림</Text>
              <Text style={styles.previewText}>{previewMessage}</Text>
            </View>
            <View style={styles.gap} />
            <Button title="활동 알림 발송" onPress={() => void sendActivityNotify()} variant="secondary" fullWidth />
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
  cancelBanner: { backgroundColor: '#FFF3CD', borderWidth: 1, borderColor: '#FFC107' },
  cancelText: { ...typography.bodyBold, color: '#856404' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  toggleLabel: { ...typography.body, color: colors.text },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.border, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.primary },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface },
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
  previewBubble: { backgroundColor: colors.primaryLight, borderRadius: borderRadius.md, padding: spacing.md, gap: spacing.xs },
  previewTitle: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  previewText: { ...typography.body, color: colors.text },
  logCard: { backgroundColor: colors.surfaceAlt, borderRadius: borderRadius.sm, padding: spacing.md, gap: 4 },
  logHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.border },
  logBadgeActivity: { backgroundColor: colors.primaryLight },
  logBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  logTime: { ...typography.small, color: colors.textMuted },
  logMsg: { ...typography.body, color: colors.text, marginTop: 4 },
  logResponse: { ...typography.caption, color: colors.textSecondary },
});
