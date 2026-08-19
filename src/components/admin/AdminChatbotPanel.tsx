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

// 더미 데이터 (서버 연결 전 테스트용)
const DUMMY_ATTENDEES = [
  { id: '1', nickname: '사람1', status: 'attending', created_at: '2026-08-19T18:05:00Z' },
  { id: '2', nickname: '사람2', status: 'attending', created_at: '2026-08-19T18:07:00Z' },
  { id: '3', nickname: '사람3', status: 'seeking_partner', created_at: '2026-08-19T18:10:00Z' },
  { id: '4', nickname: '사람4', status: 'attending', created_at: '2026-08-19T18:12:00Z' },
  { id: '5', nickname: '사람5', status: 'seeking_partner', created_at: '2026-08-19T18:15:00Z' },
];

const DUMMY_SETTINGS = {
  activity_days: ['tue', 'thu'],
  activity_start_time: '18:30',
  notify_time: '18:00',
  message_template: '🏸 오늘 {time}부터 활동 있습니다!\n활동하실 분은 눌러주세요🏸',
  button_text: '참석할게요! ✋',
  bot_enabled: true,
  auto_notify_enabled: true,
  cancel_today: false,
  cancel_message: '❌ 오늘 활동이 취소되었습니다.',
  updated_at: new Date().toISOString(),
  updated_by: null,
};

const DUMMY_LOGS = [
  { id: '1', type: 'activity', message: '🏸 오늘 18:30부터 활동 있습니다!\n활동하실 분은 눌러주세요🏸', sent_at: '2026-08-19T18:00:00Z', sent_by: null, response_count: 5 },
  { id: '2', type: 'activity', message: '🏸 오늘 18:30부터 활동 있습니다!\n활동하실 분은 눌러주세요🏸', sent_at: '2026-08-14T18:00:00Z', sent_by: null, response_count: 8 },
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
  nickname: string;
  status: string;
  created_at: string;
}

type ChatbotSub = 'live' | 'settings' | 'send' | 'logs';

interface AdminChatbotPanelProps {
  adminId: string;
  onToast: (type: 'success' | 'info' | 'warning', message: string) => void;
}

export function AdminChatbotPanel({ adminId, onToast }: AdminChatbotPanelProps) {
  const [sub, setSub] = useState<ChatbotSub>('live');
  const [settings, setSettings] = useState<ChatbotSettings>(DUMMY_SETTINGS);
  const [logs, setLogs] = useState<MessageLog[]>(DUMMY_LOGS);
  const [attendees, setAttendees] = useState<Attendee[]>(DUMMY_ATTENDEES);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [serverOnline, setServerOnline] = useState(false);
  const [useDummy, setUseDummy] = useState(true);

  // 편집용 로컬 상태
  const [editTime, setEditTime] = useState(DUMMY_SETTINGS.activity_start_time);
  const [editNotifyTime, setEditNotifyTime] = useState(DUMMY_SETTINGS.notify_time);
  const [editTemplate, setEditTemplate] = useState(DUMMY_SETTINGS.message_template);
  const [editButtonText, setEditButtonText] = useState(DUMMY_SETTINGS.button_text);
  const [editDays, setEditDays] = useState<string[]>(DUMMY_SETTINGS.activity_days);
  const [editCancelMsg, setEditCancelMsg] = useState(DUMMY_SETTINGS.cancel_message);

  // 더미 참석자 추가/제거
  const [dummyCount, setDummyCount] = useState(5);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, logsRes, attendeesRes] = await Promise.all([
        fetch(CHATBOT_API).catch(() => null),
        fetch(`${CHATBOT_API}/logs`).catch(() => null),
        fetch(`${CHATBOT_API}/attendees`).catch(() => null),
      ]);

      if (settingsRes?.ok) {
        const s = await settingsRes.json();
        setSettings(s);
        setEditTime(s.activity_start_time);
        setEditNotifyTime(s.notify_time);
        setEditTemplate(s.message_template);
        setEditButtonText(s.button_text);
        setEditDays(s.activity_days);
        setEditCancelMsg(s.cancel_message);
        setServerOnline(true);
        setUseDummy(false);
      } else {
        setServerOnline(false);
        setUseDummy(true);
      }

      if (logsRes?.ok) setLogs(await logsRes.json());
      if (attendeesRes?.ok) {
        const data = await attendeesRes.json();
        if (data.length > 0) setAttendees(data);
      }
    } catch {
      setServerOnline(false);
      setUseDummy(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveSettings = useCallback(async () => {
    if (useDummy) {
      setSettings({
        ...settings,
        activity_days: editDays,
        activity_start_time: editTime,
        notify_time: editNotifyTime,
        message_template: editTemplate,
        button_text: editButtonText,
        cancel_message: editCancelMsg,
      });
      onToast('success', '설정 저장됨 (로컬 테스트 모드)');
      return;
    }
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
        onToast('success', '챗봇 설정 저장됨');
      }
    } catch { onToast('warning', '서버 연결 실패'); }
    setSaving(false);
  }, [useDummy, settings, editDays, editTime, editNotifyTime, editTemplate, editButtonText, editCancelMsg, adminId, onToast]);

  const toggleBot = useCallback(async () => {
    const next = !settings.bot_enabled;
    if (useDummy) {
      setSettings({ ...settings, bot_enabled: next });
      onToast('info', next ? '봇 활성화됨' : '봇 비활성화됨');
      return;
    }
    try {
      const res = await fetch(CHATBOT_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_enabled: next, updated_by: adminId }),
      });
      if (res.ok) { setSettings(await res.json()); onToast('info', next ? '봇 활성화됨' : '봇 비활성화됨'); }
    } catch { onToast('warning', '서버 연결 실패'); }
  }, [useDummy, settings, adminId, onToast]);

  const toggleAutoNotify = useCallback(async () => {
    const next = !settings.auto_notify_enabled;
    if (useDummy) {
      setSettings({ ...settings, auto_notify_enabled: next });
      onToast('info', next ? '자동 알림 켜짐' : '자동 알림 꺼짐');
      return;
    }
    try {
      const res = await fetch(CHATBOT_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_notify_enabled: next, updated_by: adminId }),
      });
      if (res.ok) { setSettings(await res.json()); onToast('info', next ? '자동 알림 켜짐' : '자동 알림 꺼짐'); }
    } catch { onToast('warning', '서버 연결 실패'); }
  }, [useDummy, settings, adminId, onToast]);

  const toggleCancelToday = useCallback(async () => {
    const next = !settings.cancel_today;
    if (useDummy) {
      setSettings({ ...settings, cancel_today: next });
      onToast('info', next ? '오늘 활동 취소됨' : '오늘 활동 복구됨');
      return;
    }
    try {
      const res = await fetch(`${CHATBOT_API}/cancel-today`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancel: next }),
      });
      if (res.ok) { setSettings(await res.json()); onToast('info', next ? '오늘 활동 취소됨' : '오늘 활동 복구됨'); }
    } catch { onToast('warning', '서버 연결 실패'); }
  }, [useDummy, settings, onToast]);

  // 더미 참석자 수 조절
  const updateDummyCount = (count: number) => {
    const clamped = Math.max(0, Math.min(20, count));
    setDummyCount(clamped);
    const newAttendees: Attendee[] = [];
    for (let i = 1; i <= clamped; i++) {
      newAttendees.push({
        id: String(i),
        nickname: `사람${i}`,
        status: i % 3 === 0 ? 'seeking_partner' : 'attending',
        created_at: new Date(Date.now() - (clamped - i) * 120000).toISOString(),
      });
    }
    setAttendees(newAttendees);
  };

  const attendingCount = attendees.filter((a) => a.status === 'attending').length;
  const seekingCount = attendees.filter((a) => a.status === 'seeking_partner').length;

  return (
    <View style={styles.wrap}>
      {/* 서버 상태 바 */}
      <Card style={styles.statusBar}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, serverOnline ? styles.online : styles.offline]} />
          <Text style={styles.statusText}>
            {serverOnline ? '서버 연결됨' : '테스트 모드 (더미 데이터)'}
          </Text>
          <View style={[styles.dot, settings.bot_enabled ? styles.online : styles.offline]} />
          <Text style={styles.statusText}>
            봇 {settings.bot_enabled ? 'ON' : 'OFF'}
          </Text>
        </View>
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabs}>
        {([
          { key: 'live', label: '실시간 현황' },
          { key: 'settings', label: '봇 설정' },
          { key: 'send', label: '메시지' },
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

      {/* ─── 실시간 현황 ─── */}
      {sub === 'live' && (
        <View style={styles.content}>
          <View style={styles.statRow}>
            <View style={[styles.stat, styles.statHighlight]}>
              <Text style={styles.statValueBig}>{attendees.length}</Text>
              <Text style={styles.statLabel}>총 인원</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{attendingCount}</Text>
              <Text style={styles.statLabel}>참석</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, styles.seekingColor]}>{seekingCount}</Text>
              <Text style={styles.statLabel}>파트너 모집</Text>
            </View>
          </View>

          {settings.cancel_today && (
            <Card style={styles.cancelBanner}>
              <Text style={styles.cancelText}>⚠️ 오늘 활동 취소 상태</Text>
            </Card>
          )}

          {/* 참석자 목록 - 실시간 표시 */}
          <Card style={styles.block}>
            <View style={styles.blockHeader}>
              <Text style={styles.blockTitle}>S1 체육관 현황</Text>
              <Button title="새로고침" onPress={fetchAll} size="sm" variant="outline" />
            </View>

            {attendees.length === 0 && <Text style={styles.empty}>현재 참석자 없음</Text>}

            {/* 참석 중 */}
            {attendingCount > 0 && (
              <>
                <Text style={styles.sectionLabel}>참석 중 ({attendingCount}명)</Text>
                {attendees.filter(a => a.status === 'attending').map((a) => (
                  <View key={a.id} style={styles.personRow}>
                    <View style={styles.personAvatar}>
                      <Text style={styles.personInitial}>{a.nickname[0]}</Text>
                    </View>
                    <Text style={styles.personName}>{a.nickname}</Text>
                    <Text style={styles.personTime}>
                      {new Date(a.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* 파트너 구하는 중 */}
            {seekingCount > 0 && (
              <>
                <Text style={[styles.sectionLabel, styles.seekingSection]}>🔍 파트너 구하는 중 ({seekingCount}명)</Text>
                {attendees.filter(a => a.status === 'seeking_partner').map((a) => (
                  <View key={a.id} style={[styles.personRow, styles.seekingRow]}>
                    <View style={[styles.personAvatar, styles.seekingAvatar]}>
                      <Text style={styles.personInitial}>{a.nickname[0]}</Text>
                    </View>
                    <Text style={styles.personName}>{a.nickname}</Text>
                    <View style={styles.seekingBadge}>
                      <Text style={styles.seekingBadgeText}>파트너 구함</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </Card>

          {/* 더미 테스트 컨트롤 */}
          {useDummy && (
            <Card style={styles.block}>
              <Text style={styles.blockTitle}>🧪 테스트 컨트롤</Text>
              <Text style={styles.hint}>더미 참석자 수를 조절해서 UI를 테스트하세요</Text>
              <View style={styles.dummyControl}>
                <Button title="-" onPress={() => updateDummyCount(dummyCount - 1)} size="sm" variant="outline" />
                <Text style={styles.dummyCountText}>{dummyCount}명</Text>
                <Button title="+" onPress={() => updateDummyCount(dummyCount + 1)} size="sm" variant="outline" />
              </View>
            </Card>
          )}

          {/* 빠른 작업 */}
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>빠른 작업</Text>
            <Button
              title={settings.cancel_today ? '🔄 오늘 활동 복구' : '❌ 오늘 활동 취소'}
              onPress={toggleCancelToday}
              variant={settings.cancel_today ? 'secondary' : 'danger'}
              fullWidth
            />
          </Card>
        </View>
      )}

      {/* ─── 봇 설정 ─── */}
      {sub === 'settings' && (
        <View style={styles.content}>
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>봇 상태</Text>
            <Pressable style={styles.toggleRow} onPress={toggleBot}>
              <Text style={styles.toggleLabel}>챗봇 활성화</Text>
              <View style={[styles.toggle, settings.bot_enabled && styles.toggleOn]}>
                <View style={[styles.toggleKnob, settings.bot_enabled && styles.toggleKnobOn]} />
              </View>
            </Pressable>
            <Pressable style={styles.toggleRow} onPress={toggleAutoNotify}>
              <Text style={styles.toggleLabel}>자동 알림 발송</Text>
              <View style={[styles.toggle, settings.auto_notify_enabled && styles.toggleOn]}>
                <View style={[styles.toggleKnob, settings.auto_notify_enabled && styles.toggleKnobOn]} />
              </View>
            </Pressable>
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>활동일</Text>
            <View style={styles.dayGrid}>
              {DAY_OPTIONS.map((day) => (
                <Pressable
                  key={day.key}
                  style={[styles.dayChip, editDays.includes(day.key) && styles.dayChipActive]}
                  onPress={() => {
                    setEditDays((prev) =>
                      prev.includes(day.key) ? prev.filter((d) => d !== day.key) : [...prev, day.key]
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
            <Text style={styles.blockTitle}>시간</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>활동 시작</Text>
              <TextInput style={styles.input} value={editTime} onChangeText={setEditTime} placeholder="18:30" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>알림 시간</Text>
              <TextInput style={styles.input} value={editNotifyTime} onChangeText={setEditNotifyTime} placeholder="18:00" placeholderTextColor={colors.textMuted} />
            </View>
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>메시지 템플릿</Text>
            <Text style={styles.hint}>{'{time}'} → 활동 시작 시간으로 치환됨</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editTemplate}
              onChangeText={setEditTemplate}
              multiline
              numberOfLines={3}
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>버튼 텍스트</Text>
              <TextInput style={styles.input} value={editButtonText} onChangeText={setEditButtonText} placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>취소 메시지</Text>
              <TextInput style={styles.input} value={editCancelMsg} onChangeText={setEditCancelMsg} placeholderTextColor={colors.textMuted} />
            </View>
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>미리보기</Text>
            <View style={styles.previewBubble}>
              <Text style={styles.previewText}>{editTemplate.replace('{time}', editTime)}</Text>
              <View style={styles.previewBtn}>
                <Text style={styles.previewBtnText}>{editButtonText}</Text>
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

      {/* ─── 메시지 발송 ─── */}
      {sub === 'send' && (
        <View style={styles.content}>
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>활동 알림 수동 발송</Text>
            <View style={styles.previewBubble}>
              <Text style={styles.previewText}>{settings.message_template.replace('{time}', settings.activity_start_time)}</Text>
              <View style={styles.previewBtn}>
                <Text style={styles.previewBtnText}>{settings.button_text}</Text>
              </View>
            </View>
            <View style={styles.gap} />
            <Button title="활동 알림 발송" onPress={() => onToast('success', '활동 알림 발송됨')} variant="secondary" fullWidth />
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>커스텀 메시지</Text>
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
            <Button
              title="발송"
              onPress={() => {
                if (!customMessage.trim()) { onToast('warning', '메시지를 입력하세요'); return; }
                onToast('success', '메시지 발송됨');
                setCustomMessage('');
              }}
              variant="outline"
              fullWidth
            />
          </Card>
        </View>
      )}

      {/* ─── 기록 ─── */}
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
                    {new Date(log.sent_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={styles.logMsg}>{log.message}</Text>
                <Text style={styles.logResponse}>응답: {log.response_count}명</Text>
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
  // Status bar
  statusBar: { marginBottom: spacing.sm, paddingVertical: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  online: { backgroundColor: colors.success },
  offline: { backgroundColor: colors.error },
  statusText: { ...typography.small, color: colors.textMuted, marginRight: spacing.md },
  // Tabs
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
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockTitle: { ...typography.bodyBold, color: colors.text },
  hint: { ...typography.small, color: colors.textMuted },
  empty: { ...typography.caption, color: colors.textMuted, paddingVertical: spacing.md },
  gap: { height: spacing.sm },
  // Stats
  statRow: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
  },
  statHighlight: { backgroundColor: colors.primaryLight },
  statValue: { ...typography.h3, color: colors.primary },
  statValueBig: { ...typography.h1, color: colors.primary, fontSize: 32 },
  statLabel: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  seekingColor: { color: '#E67E22' },
  // Cancel
  cancelBanner: { backgroundColor: '#FFF3CD', borderWidth: 1, borderColor: '#FFC107' },
  cancelText: { ...typography.bodyBold, color: '#856404' },
  // Person list
  sectionLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '700', marginTop: spacing.sm },
  seekingSection: { color: '#E67E22' },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  seekingRow: { backgroundColor: '#FFF8F0', borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm },
  personAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekingAvatar: { backgroundColor: '#E67E22' },
  personInitial: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  personName: { ...typography.body, color: colors.text, fontWeight: '600', flex: 1 },
  personTime: { ...typography.small, color: colors.textMuted },
  seekingBadge: { backgroundColor: '#FFF3CD', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  seekingBadgeText: { fontSize: 10, fontWeight: '700', color: '#E67E22' },
  // Dummy control
  dummyControl: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, justifyContent: 'center' },
  dummyCountText: { ...typography.h3, color: colors.primary, minWidth: 50, textAlign: 'center' },
  // Toggle
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  toggleLabel: { ...typography.body, color: colors.text },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.border, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.primary },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface },
  toggleKnobOn: { alignSelf: 'flex-end' },
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
  // Input
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
  // Preview
  previewBubble: { backgroundColor: '#FEE500', borderRadius: borderRadius.md, padding: spacing.md, gap: spacing.sm },
  previewText: { ...typography.body, color: '#191919' },
  previewBtn: { backgroundColor: '#FFF', borderRadius: borderRadius.sm, paddingVertical: spacing.sm, alignItems: 'center' },
  previewBtnText: { ...typography.bodyBold, color: '#191919' },
  // Logs
  logCard: { backgroundColor: colors.surfaceAlt, borderRadius: borderRadius.sm, padding: spacing.md, gap: 4 },
  logHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.border },
  logBadgeActivity: { backgroundColor: colors.primaryLight },
  logBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  logTime: { ...typography.small, color: colors.textMuted },
  logMsg: { ...typography.body, color: colors.text, marginTop: 4 },
  logResponse: { ...typography.caption, color: colors.textSecondary },
});
