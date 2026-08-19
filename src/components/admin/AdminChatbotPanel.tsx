import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

const CHATBOT_API = 'https://dgistdrop.onrender.com/api/settings';

const DAY_OPTIONS = [
  { key: 'mon', label: '월' },
  { key: 'tue', label: '화' },
  { key: 'wed', label: '수' },
  { key: 'thu', label: '목' },
  { key: 'fri', label: '금' },
  { key: 'sat', label: '토' },
  { key: 'sun', label: '일' },
];

interface ChatbotSettings {
  activity_days: string[];
  activity_start_time: string;
  notify_time: string;
  message_template: string;
  button_text: string;
  bot_enabled: boolean;
  auto_notify_enabled: boolean;
  cancel_today: boolean;
  cancel_message: string;
  updated_at: string;
  updated_by: string | null;
}

interface MessageLog {
  id: string;
  type: string;
  message: string;
  sent_at: string;
  sent_by: string | null;
  response_count: number;
}

interface Attendee {
  id: string;
  kakao_user_id: string;
  nickname: string;
  date: string;
  status: string;
  created_at: string;
}

type ChatbotSub = 'dashboard' | 'settings' | 'send' | 'attendees';

interface AdminChatbotPanelProps {
  adminId: string;
  onToast: (type: 'success' | 'info' | 'warning', message: string) => void;
}

export function AdminChatbotPanel({ adminId, onToast }: AdminChatbotPanelProps) {
  const [sub, setSub] = useState<ChatbotSub>('dashboard');
  const [settings, setSettings] = useState<ChatbotSettings | null>(null);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [serverOnline, setServerOnline] = useState(false);

  // 편집용 로컬 상태
  const [editTime, setEditTime] = useState('');
  const [editNotifyTime, setEditNotifyTime] = useState('');
  const [editTemplate, setEditTemplate] = useState('');
  const [editButtonText, setEditButtonText] = useState('');
  const [editDays, setEditDays] = useState<string[]>([]);
  const [editCancelMsg, setEditCancelMsg] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, logsRes, attendeesRes] = await Promise.all([
        fetch(CHATBOT_API),
        fetch(`${CHATBOT_API}/logs`),
        fetch(`${CHATBOT_API}/attendees`),
      ]);

      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setSettings(s);
        setEditTime(s.activity_start_time);
        setEditNotifyTime(s.notify_time);
        setEditTemplate(s.message_template);
        setEditButtonText(s.button_text);
        setEditDays(s.activity_days);
        setEditCancelMsg(s.cancel_message);
        setServerOnline(true);
      } else {
        setServerOnline(false);
      }

      if (logsRes.ok) setLogs(await logsRes.json());
      if (attendeesRes.ok) setAttendees(await attendeesRes.json());
    } catch {
      setServerOnline(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveSettings = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(CHATBOT_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_days: editDays,
          activity_start_time: editTime,
          notify_time: editNotifyTime,
          message_template: editTemplate,
          button_text: editButtonText,
          cancel_message: editCancelMsg,
          updated_by: adminId,
        }),
      });
      if (res.ok) {
        setSettings(await res.json());
        onToast('success', '챗봇 설정이 저장되었습니다');
      } else {
        onToast('warning', '저장 실패');
      }
    } catch {
      onToast('warning', '서버 연결 실패');
    }
    setSaving(false);
  }, [editDays, editTime, editNotifyTime, editTemplate, editButtonText, editCancelMsg, adminId, onToast]);

  const toggleBot = useCallback(async (enabled: boolean) => {
    try {
      const res = await fetch(CHATBOT_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_enabled: enabled, updated_by: adminId }),
      });
      if (res.ok) {
        const s = await res.json();
        setSettings(s);
        onToast('info', enabled ? '봇 활성화됨' : '봇 비활성화됨');
      }
    } catch { onToast('warning', '서버 연결 실패'); }
  }, [adminId, onToast]);

  const toggleAutoNotify = useCallback(async (enabled: boolean) => {
    try {
      const res = await fetch(CHATBOT_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_notify_enabled: enabled, updated_by: adminId }),
      });
      if (res.ok) {
        const s = await res.json();
        setSettings(s);
        onToast('info', enabled ? '자동 알림 켜짐' : '자동 알림 꺼짐');
      }
    } catch { onToast('warning', '서버 연결 실패'); }
  }, [adminId, onToast]);

  const toggleCancelToday = useCallback(async () => {
    try {
      const res = await fetch(`${CHATBOT_API}/cancel-today`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancel: !settings?.cancel_today }),
      });
      if (res.ok) {
        const s = await res.json();
        setSettings(s);
        onToast('info', s.cancel_today ? '오늘 활동 취소됨' : '오늘 활동 복구됨');
      }
    } catch { onToast('warning', '서버 연결 실패'); }
  }, [settings, onToast]);

  const sendCustomMessage = useCallback(async () => {
    if (!customMessage.trim()) { onToast('warning', '메시지를 입력하세요'); return; }
    try {
      const res = await fetch(`${CHATBOT_API}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'custom', message: customMessage, sent_by: adminId }),
      });
      if (res.ok) {
        onToast('success', '메시지 발송 기록됨');
        setCustomMessage('');
        fetchAll();
      }
    } catch { onToast('warning', '서버 연결 실패'); }
  }, [customMessage, adminId, onToast, fetchAll]);

  const attendingCount = attendees.filter((a) => a.status === 'attending').length;
  const seekingCount = attendees.filter((a) => a.status === 'seeking_partner').length;

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>챗봇 서버 연결 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabs}>
        {([
          { key: 'dashboard', label: '현황' },
          { key: 'settings', label: '설정' },
          { key: 'send', label: '메시지' },
          { key: 'attendees', label: '참석자' },
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

      {sub === 'dashboard' && (
        <View style={styles.content}>
          <Card style={styles.block}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, serverOnline ? styles.online : styles.offline]} />
              <Text style={styles.statusText}>
                서버: {serverOnline ? '연결됨' : '오프라인'}
              </Text>
              <View style={[styles.statusDot, settings?.bot_enabled ? styles.online : styles.offline]} />
              <Text style={styles.statusText}>
                봇: {settings?.bot_enabled ? '활성' : '비활성'}
              </Text>
            </View>
          </Card>

          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{attendingCount}</Text>
              <Text style={styles.statLabel}>오늘 참석</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{seekingCount}</Text>
              <Text style={styles.statLabel}>파트너 모집</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{logs.length}</Text>
              <Text style={styles.statLabel}>발송 기록</Text>
            </View>
          </View>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>빠른 작업</Text>
            <Button
              title={settings?.cancel_today ? '🔄 오늘 활동 복구' : '❌ 오늘 활동 취소'}
              onPress={toggleCancelToday}
              variant={settings?.cancel_today ? 'secondary' : 'danger'}
              fullWidth
            />
            <View style={styles.gap} />
            <Button
              title={settings?.bot_enabled ? '🔴 봇 비활성화' : '🟢 봇 활성화'}
              onPress={() => toggleBot(!settings?.bot_enabled)}
              variant="outline"
              fullWidth
            />
          </Card>

          {settings?.cancel_today && (
            <Card style={[styles.block, styles.cancelBanner]}>
              <Text style={styles.cancelText}>⚠️ 오늘 활동이 취소 상태입니다</Text>
            </Card>
          )}

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>현재 설정</Text>
            <DetailRow label="활동일" value={settings?.activity_days.map(d => DAY_OPTIONS.find(o => o.key === d)?.label).join(', ') || '-'} />
            <DetailRow label="활동 시작" value={settings?.activity_start_time || '-'} />
            <DetailRow label="알림 시간" value={settings?.notify_time || '-'} />
            <DetailRow label="자동 알림" value={settings?.auto_notify_enabled ? '켜짐' : '꺼짐'} />
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>최근 발송 기록</Text>
            {logs.length === 0 && <Text style={styles.empty}>발송 기록 없음</Text>}
            {logs.slice(0, 5).map((log) => (
              <View key={log.id} style={styles.logRow}>
                <View style={[styles.logBadge, log.type === 'activity' && styles.logBadgeActivity]}>
                  <Text style={styles.logBadgeText}>
                    {log.type === 'activity' ? '활동' : log.type === 'cancel' ? '취소' : '커스텀'}
                  </Text>
                </View>
                <Text style={styles.logMsg} numberOfLines={1}>{log.message}</Text>
                <Text style={styles.logTime}>
                  {new Date(log.sent_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
          </Card>
        </View>
      )}

      {sub === 'settings' && (
        <View style={styles.content}>
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>활동일 설정</Text>
            <View style={styles.dayGrid}>
              {DAY_OPTIONS.map((day) => (
                <Pressable
                  key={day.key}
                  style={[styles.dayChip, editDays.includes(day.key) && styles.dayChipActive]}
                  onPress={() => {
                    setEditDays((prev) =>
                      prev.includes(day.key)
                        ? prev.filter((d) => d !== day.key)
                        : [...prev, day.key]
                    );
                  }}
                >
                  <Text style={[styles.dayChipText, editDays.includes(day.key) && styles.dayChipTextActive]}>
                    {day.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>시간 설정</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>활동 시작 시간</Text>
              <TextInput
                style={styles.input}
                value={editTime}
                onChangeText={setEditTime}
                placeholder="18:30"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>알림 발송 시간</Text>
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
            <Text style={styles.blockTitle}>메시지 설정</Text>
            <Text style={styles.hint}>{'{time}'} → 활동 시작 시간으로 자동 치환</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editTemplate}
              onChangeText={setEditTemplate}
              multiline
              numberOfLines={3}
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.gap} />
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>버튼 텍스트</Text>
              <TextInput
                style={styles.input}
                value={editButtonText}
                onChangeText={setEditButtonText}
                placeholder="참석할게요! ✋"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.gap} />
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>활동 취소 메시지</Text>
              <TextInput
                style={styles.input}
                value={editCancelMsg}
                onChangeText={setEditCancelMsg}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>자동 알림</Text>
            <Pressable style={styles.toggleRow} onPress={() => toggleAutoNotify(!settings?.auto_notify_enabled)}>
              <Text style={styles.toggleLabel}>활동일 자동 알림 발송</Text>
              <View style={[styles.toggle, settings?.auto_notify_enabled && styles.toggleOn]}>
                <View style={[styles.toggleKnob, settings?.auto_notify_enabled && styles.toggleKnobOn]} />
              </View>
            </Pressable>
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>미리보기</Text>
            <View style={styles.previewBubble}>
              <Text style={styles.previewText}>
                {editTemplate.replace('{time}', editTime)}
              </Text>
              <View style={styles.previewButton}>
                <Text style={styles.previewButtonText}>{editButtonText}</Text>
              </View>
            </View>
          </Card>

          <Button
            title={saving ? '저장 중...' : '설정 저장'}
            onPress={saveSettings}
            variant="secondary"
            fullWidth
            disabled={saving}
          />
        </View>
      )}

      {sub === 'send' && (
        <View style={styles.content}>
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>커스텀 메시지 발송</Text>
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
            <Button title="발송" onPress={sendCustomMessage} variant="secondary" fullWidth />
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>발송 기록 ({logs.length}건)</Text>
            {logs.map((log) => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logCardHeader}>
                  <View style={[styles.logBadge, log.type === 'activity' && styles.logBadgeActivity]}>
                    <Text style={styles.logBadgeText}>
                      {log.type === 'activity' ? '활동' : log.type === 'cancel' ? '취소' : '커스텀'}
                    </Text>
                  </View>
                  <Text style={styles.logTime}>
                    {new Date(log.sent_at).toLocaleString('ko-KR')}
                  </Text>
                </View>
                <Text style={styles.logMessage}>{log.message}</Text>
              </View>
            ))}
          </Card>
        </View>
      )}

      {sub === 'attendees' && (
        <View style={styles.content}>
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>
              오늘 참석 ({attendingCount}명) · 파트너 모집 ({seekingCount}명)
            </Text>
            {attendees.length === 0 && <Text style={styles.empty}>오늘 참석자 없음</Text>}
            {attendees.map((a) => (
              <View key={a.id} style={styles.attendeeRow}>
                <View style={styles.attendeeInfo}>
                  <Text style={styles.attendeeName}>{a.nickname}</Text>
                  <View style={[styles.badge, a.status === 'seeking_partner' && styles.badgeSeeking]}>
                    <Text style={styles.badgeText}>
                      {a.status === 'attending' ? '참석' : '파트너 구함'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.attendeeTime}>
                  {new Date(a.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
          </Card>
          <Button title="새로고침" onPress={fetchAll} variant="outline" fullWidth />
        </View>
      )}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText: { ...typography.body, color: colors.textMuted },
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
  blockTitle: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.xs },
  hint: { ...typography.small, color: colors.textMuted, marginBottom: spacing.xs },
  empty: { ...typography.caption, color: colors.textMuted, paddingVertical: spacing.md },
  gap: { height: spacing.xs },
  // Status
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  online: { backgroundColor: colors.success },
  offline: { backgroundColor: colors.error },
  statusText: { ...typography.body, color: colors.text, marginRight: spacing.md },
  // Stats
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginHorizontal: 2,
  },
  statValue: { ...typography.h2, color: colors.primary },
  statLabel: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  // Cancel banner
  cancelBanner: { backgroundColor: '#FFF3CD', borderWidth: 1, borderColor: '#FFC107' },
  cancelText: { ...typography.bodyBold, color: '#856404' },
  // Day grid
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  dayChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  dayChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  dayChipText: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
  dayChipTextActive: { color: colors.primary, fontWeight: '800' },
  // Inputs
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
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
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: { ...typography.body, color: colors.text },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 3,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: colors.primary },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface },
  toggleKnobOn: { alignSelf: 'flex-end' },
  // Preview
  previewBubble: {
    backgroundColor: '#FEE500',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  previewText: { ...typography.body, color: '#191919' },
  previewButton: {
    backgroundColor: '#FFF',
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  previewButtonText: { ...typography.bodyBold, color: '#191919' },
  // Logs
  logRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  logBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.border },
  logBadgeActivity: { backgroundColor: colors.primaryLight },
  logBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  logMsg: { ...typography.small, color: colors.text, flex: 1 },
  logTime: { ...typography.small, color: colors.textMuted },
  logCard: { backgroundColor: colors.surfaceAlt, borderRadius: borderRadius.sm, padding: spacing.md, gap: 4 },
  logCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logMessage: { ...typography.body, color: colors.text, marginTop: 4 },
  // Attendees
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  attendeeInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  attendeeName: { ...typography.body, color: colors.text, fontWeight: '600' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.primaryLight },
  badgeSeeking: { backgroundColor: '#FFF3CD' },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  attendeeTime: { ...typography.small, color: colors.textMuted },
  // Detail
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  detailLabel: { ...typography.small, color: colors.textMuted },
  detailValue: { ...typography.small, color: colors.text, fontWeight: '600' },
});
