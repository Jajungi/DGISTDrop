import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Platform } from 'react-native';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { useSiteOverlayStore } from '@/src/stores/siteOverlayStore';
import { useClubEventStore } from '@/src/stores/clubEventStore';
import { useCoachingStore } from '@/src/stores/coachingStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { recordAdminLogAsActor } from '@/src/services/adminLog';
import {
  clubEventKindLabel,
  newEventId,
  newOverlayId,
  todayLocalISODate,
} from '@/src/utils/siteOps';
import type { SiteOverlaySurface } from '@/src/types';
import { invokeBroadcastPush } from '@/src/services/supabase/pushSettings';
import { colors, spacing, typography, borderRadius } from '@/src/theme';
import type { BannerPrefill } from '@/src/components/admin/AdminClosureCalendar';

const SURFACES: { key: SiteOverlaySurface; label: string }[] = [
  { key: 'login', label: '로그인 창' },
  { key: 'post_login', label: '로그인 직후' },
  { key: 'home', label: '홈 진입' },
];

interface Props {
  adminId: string;
  adminName: string;
  onToast: (type: 'success' | 'info' | 'warning', message: string) => void;
  bannerPrefill?: BannerPrefill | null;
  onBannerPrefillConsumed?: () => void;
}

export function AdminNoticesPanel({
  adminId,
  adminName,
  onToast,
  bannerPrefill,
  onBannerPrefillConsumed,
}: Props) {
  const overlays = useSiteOverlayStore((s) => s.overlays);
  const upsertOverlay = useSiteOverlayStore((s) => s.upsert);
  const removeOverlay = useSiteOverlayStore((s) => s.remove);

  const events = useClubEventStore((s) => s.events);
  const upsertEvent = useClubEventStore((s) => s.upsert);
  const removeEvent = useClubEventStore((s) => s.remove);

  const announcements = useCoachingStore((s) => s.announcements);
  const postAnnouncement = useCoachingStore((s) => s.postAnnouncement);
  const removeAnnouncement = useCoachingStore((s) => s.removeAnnouncement);
  const adminBroadcastNotice = useNotificationStore((s) => s.adminBroadcastNotice);

  const [ovTitle, setOvTitle] = useState('');
  const [ovBody, setOvBody] = useState('');
  const [ovSurfaces, setOvSurfaces] = useState<SiteOverlaySurface[]>(['home']);
  const [ovDismissible, setOvDismissible] = useState(true);
  const [ovSendPush, setOvSendPush] = useState(true);

  const [bnTitle, setBnTitle] = useState('');
  const [bnBody, setBnBody] = useState('');
  const [bnStart, setBnStart] = useState(todayLocalISODate());
  const [bnEnd, setBnEnd] = useState(todayLocalISODate());
  const [bnSendPush, setBnSendPush] = useState(true);
  const [bnEventId, setBnEventId] = useState<string | null>(null);
  const [bnKind, setBnKind] = useState<'special' | 'closure'>('special');

  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [coachTitle, setCoachTitle] = useState('');
  const [coachBody, setCoachBody] = useState('');

  useEffect(() => {
    if (!bannerPrefill) return;
    setBnTitle(bannerPrefill.title);
    setBnBody(bannerPrefill.body);
    setBnStart(bannerPrefill.dateStart);
    setBnEnd(bannerPrefill.dateEnd);
    setBnEventId(bannerPrefill.eventId ?? null);
    setBnKind(bannerPrefill.kind === 'closure' ? 'closure' : 'special');
    onBannerPrefillConsumed?.();
  }, [bannerPrefill, onBannerPrefillConsumed]);

  const toggleSurface = (key: SiteOverlaySurface) => {
    setOvSurfaces((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const bannerEvents = events.filter((e) => e.kind === 'special' || e.kind === 'closure');

  return (
    <View style={styles.wrap}>
      <Card style={styles.block}>
        <Text style={styles.blockTitle}>화면 위 공지 (오버레이)</Text>
        <Text style={styles.hint}>
          알림함이 아니라 사이트 위에 모달로 뜹니다. 푸시를 켜면 알림을 허용한 승인 회원에게도 갑니다.
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
        <Pressable
          onPress={() => setOvSendPush((v) => !v)}
          style={styles.switchRow}
          accessibilityRole="switch"
          accessibilityState={{ checked: ovSendPush }}
        >
          <Text style={styles.switchLabel}>
            {ovSendPush ? '푸시 알림도 보내기' : '사이트 공지만'}
          </Text>
          <View style={[styles.switchTrack, ovSendPush && styles.switchTrackOn]}>
            <View style={[styles.switchKnob, ovSendPush && styles.switchKnobOn]} />
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
              if (ovSendPush) {
                try {
                  const push = await invokeBroadcastPush({
                    title: ovTitle.trim() || '공지',
                    message: ovBody.trim() || '새 공지가 등록되었습니다.',
                    type: 'notice',
                  });
                  onToast('info', `푸시 ${push.sent}명에게 발송됨`);
                } catch (err) {
                  onToast('warning', err instanceof Error ? err.message : '푸시 발송 실패');
                }
              }
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
        <Text style={styles.blockTitle}>배너 공지</Text>
        <Text style={styles.hint}>
          홈·친구·모집 상단 배너로 표시됩니다. 비어 있는 상태에서 제목·내용을 자유롭게 입력하세요.
          휴관 달력에서 넘어오면 문구가 미리 채워집니다.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="제목"
          placeholderTextColor={colors.textMuted}
          value={bnTitle}
          onChangeText={setBnTitle}
        />
        <TextInput
          style={[styles.input, styles.inputMulti]}
          placeholder="내용"
          placeholderTextColor={colors.textMuted}
          value={bnBody}
          onChangeText={setBnBody}
          multiline
        />
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>시작일</Text>
            <TextInput
              style={styles.input}
              value={bnStart}
              onChangeText={setBnStart}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>종료일</Text>
            <TextInput
              style={styles.input}
              value={bnEnd}
              onChangeText={setBnEnd}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
        <Pressable
          onPress={() => setBnSendPush((v) => !v)}
          style={styles.switchRow}
          accessibilityRole="switch"
          accessibilityState={{ checked: bnSendPush }}
        >
          <Text style={styles.switchLabel}>
            {bnSendPush ? '푸시 알림도 보내기' : '배너만 (푸시 안 보냄)'}
          </Text>
          <View style={[styles.switchTrack, bnSendPush && styles.switchTrackOn]}>
            <View style={[styles.switchKnob, bnSendPush && styles.switchKnobOn]} />
          </View>
        </Pressable>
        <Button
          title={bnEventId ? '휴관 배너 문구 저장' : '배너 공지 등록'}
          size="sm"
          fullWidth
          onPress={async () => {
            if (!bnTitle.trim() && !bnBody.trim()) {
              onToast('warning', '제목 또는 내용을 입력해 주세요.');
              return;
            }
            if (!/^\d{4}-\d{2}-\d{2}$/.test(bnStart) || !/^\d{4}-\d{2}-\d{2}$/.test(bnEnd)) {
              onToast('warning', '날짜는 YYYY-MM-DD 형식으로 입력해 주세요.');
              return;
            }
            const kind = bnKind;
            const r = await upsertEvent({
              id: bnEventId ?? newEventId(),
              kind,
              title: bnTitle.trim() || '공지',
              body: bnBody.trim() || undefined,
              dateStart: bnStart,
              dateEnd: bnEnd < bnStart ? bnStart : bnEnd,
              active: true,
            });
            onToast(r.success ? 'success' : 'warning', r.message);
            if (r.success) {
              if (bnSendPush) {
                try {
                  const range =
                    bnEnd < bnStart || bnStart === bnEnd ? bnStart : `${bnStart} ~ ${bnEnd}`;
                  const push = await invokeBroadcastPush({
                    title: `[${clubEventKindLabel(kind)}] ${bnTitle.trim() || '공지'}`,
                    message: bnBody.trim() || `${range} 공지가 등록되었습니다.`,
                    type: 'notice',
                  });
                  onToast('info', `푸시 ${push.sent}명에게 발송됨`);
                } catch (err) {
                  onToast('warning', err instanceof Error ? err.message : '푸시 발송 실패');
                }
              }
              setBnTitle('');
              setBnBody('');
              setBnEventId(null);
              setBnKind('special');
            }
          }}
        />
        {bannerEvents.map((e) => (
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
        <Text style={styles.blockTitle}>전체 공지 보내기</Text>
        <Text style={styles.hint}>승인된 모든 회원 알림함에 도착합니다.</Text>
        <TextInput
          style={styles.input}
          placeholder="제목"
          placeholderTextColor={colors.textMuted}
          value={noticeTitle}
          onChangeText={setNoticeTitle}
        />
        <TextInput
          style={[styles.input, styles.inputMulti]}
          placeholder="내용"
          placeholderTextColor={colors.textMuted}
          value={noticeBody}
          onChangeText={setNoticeBody}
          multiline
        />
        <Button
          title="공지 발송"
          onPress={() => {
            const r = adminBroadcastNotice(adminId, noticeTitle, noticeBody);
            onToast(r.success ? 'success' : 'warning', r.message);
            if (r.success) {
              setNoticeTitle('');
              setNoticeBody('');
            }
          }}
          size="sm"
          fullWidth
        />
      </Card>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>코칭 · 레슨 공지</Text>
        <Text style={styles.hint}>코칭 역할이 있는 회원 화면에 표시됩니다.</Text>
        <TextInput
          style={styles.input}
          placeholder="공지 제목"
          placeholderTextColor={colors.textMuted}
          value={coachTitle}
          onChangeText={setCoachTitle}
        />
        <TextInput
          style={[styles.input, styles.inputMulti]}
          placeholder="공지 내용"
          placeholderTextColor={colors.textMuted}
          value={coachBody}
          onChangeText={setCoachBody}
          multiline
        />
        <Button
          title="코칭 화면에 공지 등록"
          onPress={() => {
            const r = postAnnouncement(adminId, adminName, coachTitle, coachBody);
            if (r.success) {
              recordAdminLogAsActor(adminId, {
                category: 'lesson',
                action: 'coach.announcement',
                message: `코칭 공지: ${coachTitle.trim()}`,
              });
              setCoachTitle('');
              setCoachBody('');
            }
            onToast(r.success ? 'success' : 'warning', r.message);
          }}
          size="sm"
          variant="secondary"
          fullWidth
        />
        {announcements.slice(0, 5).map((a) => (
          <View key={a.id} style={styles.itemCard}>
            <Text style={styles.listTitle}>{a.title}</Text>
            <Text style={styles.listBody} numberOfLines={2}>
              {a.message}
            </Text>
            <Button
              title="삭제"
              onPress={() => {
                removeAnnouncement(a.id);
                recordAdminLogAsActor(adminId, {
                  category: 'lesson',
                  action: 'coach.announcement.remove',
                  message: `코칭 공지 삭제: ${a.title}`,
                });
                onToast('info', '공지를 삭제했어요.');
              }}
              size="sm"
              variant="danger"
            />
          </View>
        ))}
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
  itemCard: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.xs,
  },
});
