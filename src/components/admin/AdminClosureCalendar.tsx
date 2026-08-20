import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Modal,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { useActivityScheduleStore } from '@/src/stores/activityScheduleStore';
import { useClubEventStore } from '@/src/stores/clubEventStore';
import { newEventId, todayLocalISODate } from '@/src/utils/siteOps';
import { getKoreanHolidayName, getKoreanHolidaysForYear } from '@/src/utils/koreanHolidays';
import {
  DEFAULT_PUSH_SETTINGS,
  fetchPushNotifySettings,
} from '@/src/services/supabase/pushSettings';
import { colors, spacing, typography, borderRadius } from '@/src/theme';
import type { ClubEvent, ClubEventKind } from '@/src/types';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const FUTURE_WEEK_COUNT = 18;
const CELL_H = 48;

type PaintMode = 'closure' | 'extra';

function toISODate(d: Date): string {
  return todayLocalISODate(d);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function buildScrollWeeks(today: Date, futureWeeks = FUTURE_WEEK_COUNT): Date[][] {
  const thisWeekStart = startOfWeek(today);
  const pastWeekStart = addDays(thisWeekStart, -7);
  const weeks: Date[][] = [
    Array.from({ length: 7 }, (_, d) => addDays(pastWeekStart, d)),
  ];
  let cursor = thisWeekStart;
  for (let i = 0; i < futureWeeks; i++) {
    weeks.push(Array.from({ length: 7 }, (_, d) => addDays(cursor, d)));
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

function buildClosureTitle(reason: string): string {
  const r = reason.trim() || '일정';
  return `${r} 때문에 휴관`;
}

function buildClosureBody(reason: string, dateISO: string): string {
  const r = reason.trim() || '일정';
  return `${dateISO}은(는) ${r} 때문에 동아리 활동이 없습니다.`;
}

function buildExtraTitle(reason: string): string {
  const r = reason.trim();
  return r ? `${r} · 추가 활동` : '추가 활동일';
}

function buildExtraBody(reason: string, dateISO: string): string {
  const r = reason.trim();
  return r
    ? `${dateISO}에 ${r}로 추가 활동이 있습니다.`
    : `${dateISO}에 추가 활동이 있습니다.`;
}

export interface BannerPrefill {
  title: string;
  body: string;
  dateStart: string;
  dateEnd: string;
  eventId?: string;
  kind?: ClubEventKind;
}

interface Props {
  onToast: (type: 'success' | 'info' | 'warning', message: string) => void;
  /** @deprecated 달력에서 배너 여부를 직접 고르므로 선택 사항 */
  onGoToBannerNotice?: (prefill: BannerPrefill) => void;
}

export function AdminClosureCalendar({ onToast }: Props) {
  const schedule = useActivityScheduleStore((s) => s.schedule);
  const events = useClubEventStore((s) => s.events);
  const upsertEvent = useClubEventStore((s) => s.upsert);
  const removeEvent = useClubEventStore((s) => s.remove);

  const activityDays = useMemo(() => new Set(schedule.map((s) => s.day)), [schedule]);

  const today = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);
  const todayISO = toISODate(today);

  const weeks = useMemo(() => buildScrollWeeks(today), [today]);
  const yearSpan = useMemo(() => {
    const years = new Set(weeks.flat().map((d) => d.getFullYear()));
    return [...years];
  }, [weeks]);
  const holidays = useMemo(() => {
    const map: Record<string, string> = {};
    for (const y of yearSpan) Object.assign(map, getKoreanHolidaysForYear(y));
    return map;
  }, [yearSpan]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ClubEvent>();
    for (const ev of events) {
      if (!ev.active || (ev.kind !== 'closure' && ev.kind !== 'extra')) continue;
      const start = new Date(ev.dateStart + 'T12:00:00');
      const end = new Date(ev.dateEnd + 'T12:00:00');
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        map.set(toISODate(d), ev);
      }
    }
    return map;
  }, [events]);

  const [focusYear, setFocusYear] = useState(today.getFullYear());
  const [focusMonth, setFocusMonth] = useState(today.getMonth());
  const viewportH = useRef(320);

  const updateFocusFromOffset = useCallback(
    (offsetY: number) => {
      let y: number;
      let m: number;

      // 맨 위면 가운데가 아니라 제일 위(오늘 이후 첫 날) 달로 고정 — 남은 날이 짧은 달이 건너뛰어지지 않음
      if (offsetY <= 8) {
        let picked: Date | null = null;
        outer: for (const week of weeks) {
          for (const d of week) {
            if (toISODate(d) >= todayISO) {
              picked = d;
              break outer;
            }
          }
        }
        const mid = picked ?? weeks[1]?.[3] ?? weeks[0]?.[3];
        if (!mid) return;
        y = mid.getFullYear();
        m = mid.getMonth();
      } else {
        const center = offsetY + viewportH.current / 2;
        const idx = Math.max(0, Math.min(weeks.length - 1, Math.floor(center / CELL_H)));
        const mid = weeks[idx]?.[3];
        if (!mid) return;
        y = mid.getFullYear();
        m = mid.getMonth();
      }

      setFocusYear((prev) => (prev === y ? prev : y));
      setFocusMonth((prev) => (prev === m ? prev : m));
    },
    [weeks, todayISO]
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    updateFocusFromOffset(e.nativeEvent.contentOffset.y);
  };

  const onScrollLayout = (e: LayoutChangeEvent) => {
    viewportH.current = e.nativeEvent.layout.height;
    updateFocusFromOffset(0);
  };

  const [editorOpen, setEditorOpen] = useState(false);
  const [editKind, setEditKind] = useState<PaintMode>('closure');
  const [editDate, setEditDate] = useState(todayISO);
  const [reason, setReason] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sendPush, setSendPush] = useState(true);
  const [pushTime, setPushTime] = useState('09:00');
  const [activityNotifyTime, setActivityNotifyTime] = useState(DEFAULT_PUSH_SETTINGS.notify_time);
  const [showBanner, setShowBanner] = useState(true);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    void fetchPushNotifySettings()
      .then((s) => setActivityNotifyTime(s.notify_time || DEFAULT_PUSH_SETTINGS.notify_time))
      .catch(() => {});
  }, []);

  const autoKindForDate = (date: Date, existing?: ClubEvent): PaintMode => {
    if (existing?.kind === 'closure' || existing?.kind === 'extra') {
      return existing.kind;
    }
    return activityDays.has(date.getDay()) ? 'closure' : 'extra';
  };

  const openEditor = (dateISO: string, kind: PaintMode, existing?: ClubEvent) => {
    if (dateISO < todayISO) {
      onToast('warning', '지난 날짜는 설정할 수 없어요.');
      return;
    }
    setEditDate(dateISO);
    setEditKind(kind);
    if (existing && (existing.kind === 'closure' || existing.kind === 'extra')) {
      setExistingId(existing.id);
      setReason('');
      setTitle(existing.title);
      setBody(existing.body ?? '');
      setShowBanner(existing.showBanner !== false);
      setSendPush(existing.pushNotify?.enabled === true);
      if (kind === 'closure') {
        setPushTime(existing.pushNotify?.time ?? '09:00');
      } else {
        setPushTime(activityNotifyTime);
      }
    } else {
      setExistingId(null);
      setReason('');
      setShowBanner(true);
      setSendPush(true);
      if (kind === 'closure') {
        setTitle(buildClosureTitle(''));
        setBody(buildClosureBody('', dateISO));
        setPushTime('09:00');
      } else {
        setTitle(buildExtraTitle(''));
        setBody(buildExtraBody('', dateISO));
        setPushTime(activityNotifyTime);
      }
    }
    setEditorOpen(true);
  };

  const onCellPress = (date: Date, isPast: boolean) => {
    if (isPast) return;
    const iso = toISODate(date);
    const existing = eventsByDate.get(iso);
    openEditor(iso, autoKindForDate(date, existing), existing);
  };

  const applyReasonTemplate = (text: string) => {
    setReason(text);
    if (editKind === 'closure') {
      setTitle(buildClosureTitle(text));
      setBody(buildClosureBody(text, editDate));
    } else {
      setTitle(buildExtraTitle(text));
      setBody(buildExtraBody(text, editDate));
    }
  };

  const saveEvent = async () => {
    if (!title.trim()) {
      onToast('warning', '제목을 입력해 주세요.');
      return;
    }
    if (editKind === 'closure' && sendPush) {
      if (!/^\d{1,2}:\d{2}$/.test(pushTime.trim())) {
        onToast('warning', '푸시 시각은 HH:MM 형식으로 입력해 주세요. (예: 09:00)');
        return;
      }
    }

    const timeNorm = (() => {
      if (editKind === 'extra') return activityNotifyTime;
      const tm = /^(\d{1,2}):(\d{2})$/.exec(pushTime.trim());
      if (!tm) return '09:00';
      const h = Math.min(23, Math.max(0, Number(tm[1])));
      const m = Math.min(59, Math.max(0, Number(tm[2])));
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    })();

    const prevSent =
      existingId != null
        ? events.find((e) => e.id === existingId)?.pushNotify?.sentDates
        : undefined;

    const event: ClubEvent = {
      id: existingId ?? newEventId(),
      kind: editKind,
      title: title.trim(),
      body: body.trim() || undefined,
      dateStart: editDate,
      dateEnd: editDate,
      active: true,
      showBanner,
      pushNotify: {
        enabled: sendPush,
        time: timeNorm,
        sentDates: prevSent,
      },
    };
    const r = await upsertEvent(event);
    onToast(r.success ? 'success' : 'warning', r.message);
    if (!r.success) return;

    if (sendPush) {
      if (editKind === 'closure') {
        onToast('info', `당일 ${timeNorm}에 휴관 푸시가 예약됐어요. (바로 발송되지 않아요)`);
      } else {
        onToast(
          'info',
          `추가 활동일 당일 ${activityNotifyTime}(활동 알림 시각)에 푸시가 예약됐어요.`
        );
      }
    }

    setEditorOpen(false);
  };

  const cancelEvent = async () => {
    if (!existingId) {
      setEditorOpen(false);
      return;
    }
    const r = await removeEvent(existingId);
    onToast(
      r.success ? 'info' : 'warning',
      r.success ? (editKind === 'closure' ? '휴관을 취소했어요.' : '추가 활동일을 취소했어요.') : r.message
    );
    setEditorOpen(false);
  };

  const listed = events.filter((e) => e.kind === 'closure' || e.kind === 'extra');

  return (
    <View style={styles.wrap}>
      <Card style={styles.block}>
        <Text style={styles.blockTitle}>일정 달력</Text>
        <Text style={styles.hint}>
          정기 활동일 → 휴관, 그 외 → 추가 활동일. 스크롤하면 위 년·월이 바뀌고, 그 달만 선명해집니다.
        </Text>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendActivity]} />
            <Text style={styles.legendText}>정기 활동일 → 휴관</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendExtra]} />
            <Text style={styles.legendText}>그 외 → 추가 활동일</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendClosure]} />
            <Text style={styles.legendText}>휴관 등록됨</Text>
          </View>
        </View>

        <Text style={styles.focusMonth}>
          {focusYear}년 {focusMonth + 1}월
        </Text>

        <View style={styles.grid}>
          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((l) => (
              <View key={l} style={styles.weekdayCell}>
                <Text style={styles.weekdayLabel}>{l}</Text>
              </View>
            ))}
          </View>

          <ScrollView
            style={styles.weekScroll}
            contentContainerStyle={styles.weekScrollContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            onScroll={onScroll}
            scrollEventThrottle={16}
            onLayout={onScrollLayout}
          >
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((date) => {
                  const iso = toISODate(date);
                  const isPast = iso < todayISO;
                  const isToday = iso === todayISO;
                  const inFocus =
                    date.getFullYear() === focusYear && date.getMonth() === focusMonth;
                  const isActivity = !isPast && activityDays.has(date.getDay());
                  const marked = eventsByDate.get(iso);
                  const isHoliday = !!(holidays[iso] ?? getKoreanHolidayName(iso));

                  return (
                    <Pressable
                      key={iso}
                      onPress={() => onCellPress(date, isPast)}
                      disabled={isPast}
                      style={[
                        styles.cell,
                        isPast && styles.cellPast,
                        !isPast && inFocus && styles.cellFocusMonth,
                        !isPast && !inFocus && styles.cellOtherMonth,
                        isActivity && !marked && inFocus && !isPast && styles.cellActivity,
                        marked?.kind === 'closure' && !isPast && styles.cellClosure,
                        marked?.kind === 'extra' && !isPast && styles.cellExtra,
                        isToday && styles.cellToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.cellNum,
                          isPast && styles.cellNumPast,
                          !isPast && !inFocus && styles.cellNumFaded,
                          isHoliday && !isPast && inFocus && styles.cellNumHoliday,
                          marked?.kind === 'closure' && !isPast && styles.cellNumClosure,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </Card>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>등록된 일정</Text>
        {listed.length === 0 && <Text style={styles.hint}>등록된 휴관·추가 활일이 없습니다.</Text>}
        {listed.map((e) => (
          <View key={e.id} style={styles.listItem}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.listTitle}>
                [{e.kind === 'closure' ? '휴관' : '추가'}] {e.active ? '' : '(꺼짐) '}
                {e.title}
              </Text>
              <Text style={[styles.listMeta, e.kind === 'extra' && styles.listMetaExtra]}>
                {e.dateStart === e.dateEnd ? e.dateStart : `${e.dateStart} ~ ${e.dateEnd}`}
                {e.showBanner !== false ? ' · 배너' : ' · 배너 없음'}
                {e.pushNotify?.enabled
                  ? e.kind === 'extra'
                    ? ` · 활동알림 ${e.pushNotify.time || activityNotifyTime} 푸시`
                    : ` · 당일 ${e.pushNotify.time} 푸시`
                  : ''}
              </Text>
            </View>
            <Button
              title="열기"
              size="sm"
              variant="outline"
              onPress={() =>
                openEditor(e.dateStart, e.kind === 'extra' ? 'extra' : 'closure', e)
              }
            />
          </View>
        ))}
      </Card>

      <Modal visible={editorOpen} transparent animationType="fade" onRequestClose={() => setEditorOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.blockTitle}>
              {editKind === 'closure' ? '휴관' : '추가 활동일'} · {editDate}
            </Text>
            <Text style={styles.hint}>
              {editKind === 'closure'
                ? '사유를 넣으면 「____ 때문에 휴관」 문구가 채워집니다.'
                : '메모를 넣으면 제목·설명에 반영됩니다. 비워도 됩니다.'}
            </Text>
            <Text style={styles.fieldLabel}>
              {editKind === 'closure' ? '사유 (____ 때문에 휴관)' : '메모 (선택)'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={editKind === 'closure' ? '예: 시험기간, 체육관 공사' : '예: 대회 연습'}
              placeholderTextColor={colors.textMuted}
              value={reason}
              onChangeText={applyReasonTemplate}
            />
            <Text style={styles.fieldLabel}>제목</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.fieldLabel}>부가 설명</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={body}
              onChangeText={setBody}
              multiline
              placeholderTextColor={colors.textMuted}
            />
            <Pressable
              onPress={() => setShowBanner((v) => !v)}
              style={styles.switchRow}
              accessibilityRole="switch"
              accessibilityState={{ checked: showBanner }}
            >
              <Text style={styles.switchLabel}>
                {showBanner ? '홈 배너 공지 표시' : '배너 공지 안 함 (일정만)'}
              </Text>
              <View style={[styles.switchTrack, showBanner && styles.switchTrackOn]}>
                <View style={[styles.switchKnob, showBanner && styles.switchKnobOn]} />
              </View>
            </Pressable>
            <Pressable
              onPress={() => setSendPush((v) => !v)}
              style={styles.switchRow}
              accessibilityRole="switch"
              accessibilityState={{ checked: sendPush }}
            >
              <Text style={styles.switchLabel}>
                {editKind === 'closure'
                  ? sendPush
                    ? '당일 푸시 예약 (바로 안 보냄)'
                    : '푸시 안 보냄'
                  : sendPush
                    ? `활동 알림 시각(${activityNotifyTime})에 푸시`
                    : '푸시 안 보냄'}
              </Text>
              <View style={[styles.switchTrack, sendPush && styles.switchTrackOn]}>
                <View style={[styles.switchKnob, sendPush && styles.switchKnobOn]} />
              </View>
            </Pressable>
            {editKind === 'closure' && sendPush && (
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>당일 발송 시각 (KST, HH:MM)</Text>
                <TextInput
                  style={styles.input}
                  value={pushTime}
                  onChangeText={setPushTime}
                  placeholder="09:00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={styles.hint}>
                  저장해도 지금 알림은 가지 않고, 휴관 당일 이 시각에 자동 발송됩니다. (서버 스케줄러
                  필요)
                </Text>
              </View>
            )}
            {editKind === 'extra' && sendPush && (
              <Text style={styles.hint}>
                바로 보내지 않고, 알림 설정의 활동 자동 알림 시각({activityNotifyTime})에 일반 활동일과
                같은 방식으로 발송됩니다. 시각 변경은 [알림 → 알림 설정]에서 하세요.
              </Text>
            )}
            <View style={styles.modalActions}>
              {existingId ? (
                <Button title="취소(삭제)" size="sm" variant="danger" onPress={cancelEvent} />
              ) : (
                <Button title="닫기" size="sm" variant="ghost" onPress={() => setEditorOpen(false)} />
              )}
              <Button title={existingId ? '수정 저장' : '저장'} size="sm" onPress={saveEvent} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  block: { gap: spacing.sm, padding: spacing.md },
  blockTitle: { ...typography.h3, color: colors.text, fontSize: 15 },
  hint: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
  focusMonth: {
    ...typography.h3,
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 4,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 1 },
  legendActivity: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary },
  legendClosure: { backgroundColor: '#FECACA' },
  legendExtra: { backgroundColor: '#BFDBFE' },
  legendText: { ...typography.small, color: colors.textMuted, fontSize: 11 },
  grid: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  weekdayRow: { flexDirection: 'row', backgroundColor: colors.surfaceAlt },
  weekdayCell: {
    flex: 1,
    paddingVertical: 6,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
    alignItems: 'center',
  },
  weekdayLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  weekScroll: {
    maxHeight: 420,
    ...Platform.select({
      web: { overflowY: 'auto' as const } as object,
      default: {},
    }),
  },
  weekScrollContent: { paddingBottom: 4 },
  weekRow: { flexDirection: 'row', height: CELL_H },
  cell: {
    flex: 1,
    height: CELL_H,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderRightColor: colors.border,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 4,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  cellPast: {
    backgroundColor: '#E5E7EB',
  },
  cellFocusMonth: {
    backgroundColor: colors.surface,
  },
  cellOtherMonth: {
    backgroundColor: '#F7F8FA',
  },
  cellActivity: {
    backgroundColor: colors.primaryLight,
  },
  cellClosure: {
    backgroundColor: '#FEF2F2',
  },
  cellExtra: {
    backgroundColor: '#EFF6FF',
  },
  cellToday: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  cellNum: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 13,
  },
  cellNumPast: { color: '#9CA3AF', fontWeight: '500' },
  cellNumFaded: { color: colors.text, opacity: 0.28 },
  cellNumHoliday: { color: colors.error, fontWeight: '800' },
  cellNumClosure: { color: colors.error, fontWeight: '800' },
  listItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  listTitle: { ...typography.bodyBold, color: colors.text, fontSize: 13 },
  listMeta: { ...typography.small, color: colors.error },
  listMetaExtra: { color: colors.primary },
  fieldLabel: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
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
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  switchLabel: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    padding: 2,
  },
  switchTrackOn: { backgroundColor: colors.primary },
  switchKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
  },
  switchKnobOn: { alignSelf: 'flex-end' },
  timeField: { gap: 4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: 4 },
});
