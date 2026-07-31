import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Platform } from 'react-native';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { useSiteOverlayStore } from '@/src/stores/siteOverlayStore';
import { useClubEventStore } from '@/src/stores/clubEventStore';
import { useLobbyExpiryStore } from '@/src/stores/lobbyExpiryStore';
import {
  clubEventKindLabel,
  newEventId,
  newOverlayId,
  todayLocalISODate,
} from '@/src/utils/siteOps';
import { lobbyExpiryLabel } from '@/src/utils/lobbyExpiry';
import type { ClubEventKind, LobbyExpiryMode, SiteOverlaySurface } from '@/src/types';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

const SURFACES: { key: SiteOverlaySurface; label: string; hint: string }[] = [
  { key: 'login', label: '로그인 창', hint: '로그인 화면 위에 표시' },
  { key: 'post_login', label: '로그인 직후', hint: '로그인 성공 직후 한 번' },
  { key: 'home', label: '홈 진입', hint: '홈(코트) 화면에 들어올 때' },
];

interface Props {
  onToast: (type: 'success' | 'info' | 'warning', message: string) => void;
}

export function AdminSiteOpsPanel({ onToast }: Props) {
  const overlays = useSiteOverlayStore((s) => s.overlays);
  const upsertOverlay = useSiteOverlayStore((s) => s.upsert);
  const removeOverlay = useSiteOverlayStore((s) => s.remove);

  const events = useClubEventStore((s) => s.events);
  const upsertEvent = useClubEventStore((s) => s.upsert);
  const removeEvent = useClubEventStore((s) => s.remove);

  const lobbyExpiry = useLobbyExpiryStore((s) => s.config);
  const saveLobbyExpiry = useLobbyExpiryStore((s) => s.save);
  const [expiryMode, setExpiryMode] = useState<LobbyExpiryMode>(lobbyExpiry.mode);
  const [expiryHours, setExpiryHours] = useState(String(lobbyExpiry.hours));

  useEffect(() => {
    setExpiryMode(lobbyExpiry.mode);
    setExpiryHours(String(lobbyExpiry.hours));
  }, [lobbyExpiry.mode, lobbyExpiry.hours]);

  const [ovTitle, setOvTitle] = useState('');
  const [ovBody, setOvBody] = useState('');
  const [ovSurfaces, setOvSurfaces] = useState<SiteOverlaySurface[]>(['home']);
  const [ovDismissible, setOvDismissible] = useState(true);

  const [evKind, setEvKind] = useState<ClubEventKind>('closure');
  const [evTitle, setEvTitle] = useState('');
  const [evBody, setEvBody] = useState('');
  const [evStart, setEvStart] = useState(todayLocalISODate());
  const [evEnd, setEvEnd] = useState(todayLocalISODate());

  const toggleSurface = (key: SiteOverlaySurface) => {
    setOvSurfaces((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  return (
    <View style={styles.wrap}>
      <Card style={styles.block}>
        <Text style={styles.blockTitle}>화면 위 공지 (오버레이)</Text>
        <Text style={styles.hint}>
          알림함이 아니라 사이트 위에 모달로 뜹니다. 노출 위치를 나눠 설정할 수 있어요.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="제목"
          placeholderTextColor={colors.textMuted}
          value={ovTitle}
          onChangeText={setOvTitle}
        />
        <TextInput
          style={[styles.input, styles.inputMulti]}
          placeholder="내용"
          placeholderTextColor={colors.textMuted}
          value={ovBody}
          onChangeText={setOvBody}
          multiline
        />
        <Text style={styles.fieldLabel}>노출 위치</Text>
        <View style={styles.chipRow}>
          {SURFACES.map((s) => {
            const on = ovSurfaces.includes(s.key);
            return (
              <Pressable
                key={s.key}
                onPress={() => toggleSurface(s.key)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => setOvDismissible((v) => !v)}
          style={styles.switchRow}
          accessibilityRole="switch"
          accessibilityState={{ checked: ovDismissible }}
        >
          <Text style={styles.switchLabel}>
            {ovDismissible ? '닫기 가능 (다시 보지 않기)' : '닫기만 (매번 세션마다 표시)'}
          </Text>
          <View style={[styles.switchTrack, ovDismissible && styles.switchTrackOn]}>
            <View style={[styles.switchKnob, ovDismissible && styles.switchKnobOn]} />
          </View>
        </Pressable>
        <Button
          title="오버레이 공지 등록"
          size="sm"
          fullWidth
          onPress={async () => {
            if (!ovTitle.trim() && !ovBody.trim()) {
              onToast('warning', '제목 또는 내용을 입력해 주세요.');
              return;
            }
            if (!ovSurfaces.length) {
              onToast('warning', '노출 위치를 하나 이상 선택해 주세요.');
              return;
            }
            const now = new Date().toISOString();
            const r = await upsertOverlay({
              id: newOverlayId(),
              title: ovTitle.trim() || '공지',
              body: ovBody.trim(),
              surfaces: ovSurfaces,
              active: true,
              dismissible: ovDismissible,
              createdAt: now,
              updatedAt: now,
            });
            onToast(r.success ? 'success' : 'warning', r.message);
            if (r.success) {
              setOvTitle('');
              setOvBody('');
            }
          }}
        />
        {overlays.map((o) => (
          <View key={o.id} style={styles.listItem}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.listTitle}>
                {o.active ? '' : '[꺼짐] '}
                {o.title}
              </Text>
              <Text style={styles.listMeta}>
                {o.surfaces.map((s) => SURFACES.find((x) => x.key === s)?.label ?? s).join(' · ')}
              </Text>
              {!!o.body && <Text style={styles.listBody} numberOfLines={2}>{o.body}</Text>}
            </View>
            <View style={styles.listActions}>
              <Button
                title={o.active ? '끄기' : '켜기'}
                size="sm"
                variant="outline"
                onPress={async () => {
                  const r = await upsertOverlay({
                    ...o,
                    active: !o.active,
                    updatedAt: new Date().toISOString(),
                  });
                  onToast(r.success ? 'success' : 'warning', r.message);
                }}
              />
              <Button
                title="삭제"
                size="sm"
                variant="ghost"
                onPress={async () => {
                  const r = await removeOverlay(o.id);
                  onToast(r.success ? 'success' : 'warning', r.message);
                }}
              />
            </View>
          </View>
        ))}
      </Card>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>휴관 · 특강 일정</Text>
        <Text style={styles.hint}>해당 날짜에 홈·친구·모집 상단 배너로 표시됩니다.</Text>
        <View style={styles.chipRow}>
          {(['closure', 'special'] as ClubEventKind[]).map((k) => (
            <Pressable
              key={k}
              onPress={() => setEvKind(k)}
              style={[styles.chip, evKind === k && styles.chipOn]}
            >
              <Text style={[styles.chipText, evKind === k && styles.chipTextOn]}>
                {clubEventKindLabel(k)}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="제목 (예: 시험기간 휴관)"
          placeholderTextColor={colors.textMuted}
          value={evTitle}
          onChangeText={setEvTitle}
        />
        <TextInput
          style={[styles.input, styles.inputMulti]}
          placeholder="부가 설명 (선택)"
          placeholderTextColor={colors.textMuted}
          value={evBody}
          onChangeText={setEvBody}
          multiline
        />
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>시작일 (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={evStart}
              onChangeText={setEvStart}
              placeholder="2026-07-30"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>종료일</Text>
            <TextInput
              style={styles.input}
              value={evEnd}
              onChangeText={setEvEnd}
              placeholder="2026-07-30"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
        <Button
          title="일정 등록"
          size="sm"
          fullWidth
          onPress={async () => {
            if (!evTitle.trim()) {
              onToast('warning', '제목을 입력해 주세요.');
              return;
            }
            if (!/^\d{4}-\d{2}-\d{2}$/.test(evStart) || !/^\d{4}-\d{2}-\d{2}$/.test(evEnd)) {
              onToast('warning', '날짜는 YYYY-MM-DD 형식으로 입력해 주세요.');
              return;
            }
            const r = await upsertEvent({
              id: newEventId(),
              kind: evKind,
              title: evTitle.trim(),
              body: evBody.trim() || undefined,
              dateStart: evStart,
              dateEnd: evEnd < evStart ? evStart : evEnd,
              active: true,
            });
            onToast(r.success ? 'success' : 'warning', r.message);
            if (r.success) {
              setEvTitle('');
              setEvBody('');
            }
          }}
        />
        {events.map((e) => (
          <View key={e.id} style={styles.listItem}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.listTitle}>
                [{clubEventKindLabel(e.kind)}] {e.active ? '' : '(꺼짐) '}
                {e.title}
              </Text>
              <Text style={styles.listMeta}>
                {e.dateStart === e.dateEnd ? e.dateStart : `${e.dateStart} ~ ${e.dateEnd}`}
              </Text>
            </View>
            <View style={styles.listActions}>
              <Button
                title={e.active ? '끄기' : '켜기'}
                size="sm"
                variant="outline"
                onPress={async () => {
                  const r = await upsertEvent({ ...e, active: !e.active });
                  onToast(r.success ? 'success' : 'warning', r.message);
                }}
              />
              <Button
                title="삭제"
                size="sm"
                variant="ghost"
                onPress={async () => {
                  const r = await removeEvent(e.id);
                  onToast(r.success ? 'success' : 'warning', r.message);
                }}
              />
            </View>
          </View>
        ))}
      </Card>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>모집방 자동 종료</Text>
        <Text style={styles.hint}>
          오래 남은 모집방을 목록에서 정리합니다. 코트 예약까지 완료된 방(예약됨)은 유지됩니다.
          현재: {lobbyExpiryLabel(lobbyExpiry)}
        </Text>
        <View style={styles.chipRow}>
          {(
            [
              { key: 'hours' as const, label: '시간 단위' },
              { key: 'end_of_day' as const, label: '등록 당일까지' },
              { key: 'never' as const, label: '삭제 안 함' },
            ] as const
          ).map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => setExpiryMode(opt.key)}
              style={[styles.chip, expiryMode === opt.key && styles.chipOn]}
            >
              <Text style={[styles.chipText, expiryMode === opt.key && styles.chipTextOn]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {expiryMode === 'hours' && (
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>생성 후 N시간 (1~168)</Text>
            <TextInput
              style={styles.input}
              value={expiryHours}
              onChangeText={setExpiryHours}
              keyboardType="number-pad"
              placeholder="6"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        )}
        <Button
          title="만료 설정 저장"
          size="sm"
          fullWidth
          onPress={async () => {
            const hours = Math.max(1, Math.min(168, Number(expiryHours) || 6));
            const r = await saveLobbyExpiry({ mode: expiryMode, hours });
            onToast(r.success ? 'success' : 'warning', r.message);
          }}
        />
      </Card>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>코트 대기열</Text>
        <Text style={styles.hint}>
          예약됨·경기 중인 코트에 다른 회원이 「대기열 등록」을 할 수 있어요. 코트가 반납되면
          대기자 알림함으로 안내됩니다. 별도 설정 없이 바로 동작합니다.
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  chipTextOn: { color: colors.textLight },
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
  dateRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  dateField: { flex: 1, minWidth: 140, gap: 4 },
  listItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  listTitle: { ...typography.bodyBold, color: colors.text, fontSize: 13 },
  listMeta: { ...typography.small, color: colors.primary },
  listBody: { ...typography.small, color: colors.textMuted },
  listActions: { gap: 4 },
});
