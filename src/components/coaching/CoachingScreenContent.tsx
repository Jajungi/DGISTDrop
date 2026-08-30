import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/stores/authStore';
import { useLessonStore } from '@/src/stores/lessonStore';
import { useCoachingStore } from '@/src/stores/coachingStore';
import { useCourtStore } from '@/src/stores/courtStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { COACH_COURT_ID } from '@/src/constants/court';
import { colors, spacing, typography, borderRadius } from '@/src/theme';
import { canManageCoachAnnouncement, canPostCoachAnnouncement } from '@/src/utils/coachAccess';
import { formatLessonEtaLabel } from '@/src/utils/lessonEta';
import { CoachLessonControls } from '@/src/components/coaching/CoachLessonControls';
import { occupancySetupFromStatus, OCCUPANCY_SETUP_LABEL } from '@/src/utils/occupancyCourt';

const QUEUE_STATUS: Record<string, string> = {
  waiting: '대기 중',
  next: '다음 차례',
  active: '레슨 중',
};

export function CoachingScreenContent({ embedded = false }: { embedded?: boolean }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const requestLessonAccess = useAuthStore((s) => s.requestLessonAccess);
  const joinQueue = useLessonStore((s) => s.joinQueue);
  const leaveQueue = useLessonStore((s) => s.leaveQueue);
  const notifyIfNext = useLessonStore((s) => s.notifyIfNext);
  const getQueueEntry = useLessonStore((s) => s.getQueueEntry);
  const lessonQueue = useLessonStore((s) => s.lessonQueue);
  const announcements = useCoachingStore((s) => s.announcements);
  const postAnnouncement = useCoachingStore((s) => s.postAnnouncement);
  const removeAnnouncement = useCoachingStore((s) => s.removeAnnouncement);
  const selectCourt = useCourtStore((s) => s.selectCourt);
  const coachCourt = useCourtStore((s) => s.courts.find((c) => c.id === COACH_COURT_ID));
  const showToast = useNotificationStore((s) => s.showToast);

  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [showPostForm, setShowPostForm] = useState(false);

  if (!currentUser) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>로그인이 필요합니다</Text>
      </View>
    );
  }

  const lessonStatus = currentUser.lessonStatus ?? 'none';
  const hasAccess = lessonStatus === 'approved';
  const canPost = canPostCoachAnnouncement(currentUser);
  const queueEntry = getQueueEntry(currentUser.id);
  const activeQueue = lessonQueue.filter((e) => e.status !== 'done');

  const handleRequest = () => {
    const result = requestLessonAccess(currentUser.id);
    showToast({ type: result.success ? 'success' : 'warning', title: '', message: result.message });
  };

  const handlePost = () => {
    const result = postAnnouncement(currentUser.id, currentUser.name, postTitle, postBody);
    showToast({ type: result.success ? 'success' : 'warning', title: '', message: result.message });
    if (result.success) {
      setPostTitle('');
      setPostBody('');
      setShowPostForm(false);
    }
  };

  const goToCoachCourt = () => {
    selectCourt(COACH_COURT_ID);
    if (!embedded) router.back();
  };

  const body = (
    <>
      {embedded ? (
        <Pressable
          onPress={() => router.push('/coaching')}
          style={styles.fullScreenLink}
          accessibilityRole="link"
          accessibilityLabel="코칭 전체 화면 열기"
        >
          <Ionicons name="expand-outline" size={16} color={colors.primary} />
          <Text style={styles.fullScreenLinkText}>코칭 전체 화면</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        </Pressable>
      ) : null}

      <Card style={styles.block}>
        <View style={styles.blockHeader}>
          <Ionicons name="megaphone-outline" size={18} color={colors.primary} />
          <Text style={styles.blockTitle}>코치 공지</Text>
        </View>

        {announcements.length === 0 && (
          <Text style={styles.empty}>등록된 공지가 없습니다</Text>
        )}

        {announcements.map((a) => (
          <View key={a.id} style={styles.announceCard}>
            <View style={styles.announceTop}>
              <Text style={styles.announceTitle}>{a.title}</Text>
              {canManageCoachAnnouncement(currentUser, a.authorId) && (
                <Pressable onPress={() => removeAnnouncement(a.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
            <Text style={styles.announceBody}>{a.message}</Text>
            <Text style={styles.announceMeta}>
              {a.authorName} · {new Date(a.createdAt).toLocaleString('ko-KR')}
            </Text>
          </View>
        ))}

        {canPost && (
          <>
            {!showPostForm ? (
              <Button
                title="공지 작성"
                onPress={() => setShowPostForm(true)}
                size="sm"
                variant="outline"
              />
            ) : (
              <View style={styles.postForm}>
                <TextInput
                  style={styles.input}
                  placeholder="제목"
                  placeholderTextColor={colors.textMuted}
                  value={postTitle}
                  onChangeText={setPostTitle}
                />
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="내용"
                  placeholderTextColor={colors.textMuted}
                  value={postBody}
                  onChangeText={setPostBody}
                  multiline
                />
                <View style={styles.postActions}>
                  <Button title="취소" onPress={() => setShowPostForm(false)} size="sm" variant="ghost" />
                  <Button title="등록" onPress={handlePost} size="sm" variant="secondary" />
                </View>
              </View>
            )}
          </>
        )}
      </Card>

      <Card style={styles.block}>
        <View style={styles.blockHeader}>
          <Ionicons name="school-outline" size={18} color={colors.primary} />
          <Text style={styles.blockTitle}>레슨 · {COACH_COURT_ID}번 코트</Text>
        </View>

        {canPost && (
          <View style={styles.coachPanel}>
            <Text style={styles.coachPanelTitle}>코치 레슨 진행</Text>
            <CoachLessonControls />
          </View>
        )}

        {lessonStatus === 'none' || lessonStatus === 'rejected' ? (
          <View style={styles.gateBox}>
            <Text style={styles.gateText}>
              레슨 권한이 없어요. 프로필에서 권한을 신청하거나 아래에서 바로 신청할 수
              있습니다.
            </Text>
            <Button title="레슨 권한 신청" onPress={handleRequest} fullWidth variant="outline" />
          </View>
        ) : null}

        {lessonStatus === 'pending' && (
          <View style={styles.gateBox}>
            <Text style={styles.gateText}>레슨 권한 승인 대기 중이에요. 승인 후 대기열 등록이 가능합니다.</Text>
          </View>
        )}

        {hasAccess && (
          <>
            {!queueEntry && (
              <Button title="레슨 대기열 등록" onPress={() => {
                const r = joinQueue(currentUser.id);
                showToast({ type: r.success ? 'success' : 'warning', title: '', message: r.message });
              }} fullWidth />
            )}

            {queueEntry && (
              <View style={styles.queueBox}>
                <View style={styles.queueHeader}>
                  <Text style={styles.queuePos}>{queueEntry.position}</Text>
                  <View style={styles.queueMeta}>
                    <Text style={styles.queueLabel}>내 대기 순서</Text>
                    <Text
                      style={[
                        styles.queueStatus,
                        queueEntry.status === 'next' && styles.statusNext,
                        queueEntry.status === 'active' && styles.statusActive,
                      ]}
                    >
                      {QUEUE_STATUS[queueEntry.status]}
                    </Text>
                  </View>
                </View>

                {queueEntry.status === 'next' && (
                  <>
                    <Text style={styles.etaText}>
                      {formatLessonEtaLabel(queueEntry, lessonQueue) ?? '곧 시작 · 준비해 주세요'}
                    </Text>
                    <Text style={styles.nextHint}>
                      {embedded
                        ? `지금 아래에서 코치 코트(${COACH_COURT_ID}번)를 예약할 수 있어요. 셔틀콕을 준비해 주세요!`
                        : `지금 코치 코트(${COACH_COURT_ID}번)를 예약할 수 있어요. 셔틀콕을 준비해 주세요!`}
                    </Text>
                    {!embedded && (
                      <Button title="코치 코트로 이동" onPress={goToCoachCourt} size="sm" variant="secondary" />
                    )}
                    {embedded && (
                      <Button
                        title="코칭 전체 화면"
                        onPress={() => router.push('/coaching')}
                        size="sm"
                        variant="outline"
                      />
                    )}
                    <Button
                      title="알림 테스트"
                      onPress={() => notifyIfNext(currentUser.id)}
                      size="sm"
                      variant="ghost"
                    />
                  </>
                )}

                {queueEntry.status === 'waiting' && (
                  <>
                    <Text style={styles.etaText}>
                      {formatLessonEtaLabel(queueEntry, lessonQueue)}
                    </Text>
                    <Text style={styles.waitHint}>앞 순서 레슨이 끝나면 사이렌 알림이 울려요.</Text>
                  </>
                )}

                {queueEntry.status !== 'active' && (
                  <Button
                    title="대기열 취소"
                    onPress={() => {
                      const r = leaveQueue(currentUser.id);
                      showToast({ type: 'info', title: '', message: r.message });
                    }}
                    size="sm"
                    variant="ghost"
                  />
                )}
              </View>
            )}

            {activeQueue.length > 0 && (
              <View style={styles.publicQueue}>
                <Text style={styles.publicTitle}>오늘 레슨 순서</Text>
                {activeQueue.map((e) => {
                  const eta =
                    e.userId === currentUser.id
                      ? formatLessonEtaLabel(e, lessonQueue)
                      : e.status === 'waiting' || e.status === 'next'
                        ? formatLessonEtaLabel(e, lessonQueue)
                        : null;
                  return (
                  <View key={e.id} style={styles.publicRow}>
                    <Text style={styles.publicPos}>{e.position}</Text>
                    <View style={styles.publicMeta}>
                      <Text style={[styles.publicName, e.userId === currentUser.id && styles.publicNameMe]}>
                        {e.userName}{e.userId === currentUser.id ? ' (나)' : ''}
                      </Text>
                      {eta ? <Text style={styles.publicEta}>{eta}</Text> : null}
                    </View>
                    <Text
                      style={[
                        styles.publicStatus,
                        e.status === 'next' && styles.statusNext,
                        e.status === 'active' && styles.statusActive,
                      ]}
                    >
                      {QUEUE_STATUS[e.status]}
                    </Text>
                  </View>
                  );
                })}
              </View>
            )}

            {!embedded && coachCourt && (
              <View style={styles.courtHint}>
                <Text style={styles.courtHintLabel}>코치 코트 현황</Text>
                <Text style={styles.courtHintText}>
                  {OCCUPANCY_SETUP_LABEL[occupancySetupFromStatus(coachCourt.status)]}
                  {coachCourt.players.length > 0 && ` · ${coachCourt.players.length}명`}
                </Text>
                <Button title="코트 현황에서 보기" onPress={goToCoachCourt} size="sm" variant="outline" />
              </View>
            )}
          </>
        )}
      </Card>
    </>
  );

  if (embedded) {
    return <View style={styles.embedded}>{body}</View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {body}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  embedded: { gap: spacing.md, marginBottom: spacing.md },
  fullScreenLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  fullScreenLinkText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  muted: { ...typography.body, color: colors.textMuted },
  block: { gap: spacing.sm },
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  blockTitle: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
  empty: { ...typography.caption, color: colors.textMuted, paddingVertical: spacing.sm },
  announceCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    gap: spacing.xs,
  },
  announceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  announceTitle: { ...typography.bodyBold, color: colors.text, flex: 1 },
  announceBody: { ...typography.caption, color: colors.textSecondary, lineHeight: 20 },
  announceMeta: { ...typography.small, color: colors.textMuted, fontSize: 11 },
  postForm: { gap: spacing.sm, marginTop: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  postActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  gateBox: { gap: spacing.sm },
  gateText: { ...typography.caption, color: colors.textMuted, lineHeight: 20 },
  queueBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  queueHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  queuePos: { fontSize: 36, fontWeight: '800', color: colors.primary, width: 48, textAlign: 'center' },
  queueMeta: { flex: 1, gap: 2 },
  queueLabel: { ...typography.caption, color: colors.textMuted },
  queueStatus: { ...typography.bodyBold, color: colors.text },
  statusNext: { color: colors.error },
  statusActive: { color: colors.primary },
  nextHint: { ...typography.caption, color: colors.error, fontWeight: '600', lineHeight: 18 },
  etaText: {
    ...typography.bodyBold,
    color: colors.primary,
    fontSize: 15,
    lineHeight: 20,
  },
  waitHint: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
  publicQueue: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  publicTitle: { ...typography.small, color: colors.textMuted, fontWeight: '600' },
  publicRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  publicPos: { ...typography.bodyBold, color: colors.primary, width: 24, textAlign: 'center' },
  publicMeta: { flex: 1, gap: 1 },
  publicName: { ...typography.caption, color: colors.text },
  publicNameMe: { fontWeight: '700' },
  publicEta: { ...typography.small, color: colors.textMuted, fontSize: 11 },
  publicStatus: { ...typography.small, color: colors.textMuted },
  courtHint: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  courtHintLabel: { ...typography.small, color: colors.primary, fontWeight: '700' },
  courtHintText: { ...typography.caption, color: colors.textSecondary },
  coachPanel: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  coachPanelTitle: { ...typography.bodyBold, color: colors.text },
});
