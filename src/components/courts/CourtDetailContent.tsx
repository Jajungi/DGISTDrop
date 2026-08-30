import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import type { Court, GameMode, NantaHalf } from '@/src/types';
import { CourtIllustration } from './CourtIllustration';
import { CourtPlayerProfiles } from './CourtPlayerProfiles';
import { COURT_FLOOR_COLORS, getCourtHeight, GAME_COUNT_OPTIONS, GAME_MODE_CONFIG, getCourtColumnLabel, GYM_VENUE } from '@/src/constants/court';
import { formatCleanupRemaining, formatElapsed } from '@/src/utils/courtTime';
import {
  occupancySetupFromStatus,
  OCCUPANCY_SETUP_LABEL,
  type OccupancySetupState,
} from '@/src/utils/occupancyCourt';
import { GameCountPicker } from './GameCountPicker';
import { GameModePicker } from './GameModePicker';
import { GameModeBadge } from './GameModeBadge';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { RankBadge } from '@/src/components/ui/RankBadge';
import { Button } from '@/src/components/ui/Button';
import { TouchGuard } from '@/src/components/ui/TouchGuard';
import { useAuthStore } from '@/src/stores/authStore';
import { useFeatureFlagsStore } from '@/src/stores/featureFlagsStore';
import { useLessonStore } from '@/src/stores/lessonStore';
import { CoachingScreenContent } from '@/src/components/coaching/CoachingScreenContent';
import { colors, borderRadius, spacing, typography } from '@/src/theme';

export interface CourtDetailContentProps {
  court: Court;
  onReserve: (gameCount: number, gameMode: GameMode, nantaHalf?: NantaHalf) => void;
  onJoin: () => void;
  onJoinWait?: () => void;
  onLeaveWait?: () => void;
  onRemoveWait?: (entryId: string) => void;
  onCompleteGame: () => void;
  onReturnCourt: () => void;
  onCancelReservation: () => void;
  onStartGame: () => void;
  onAcceptJoin: (requestId: string) => void;
  onRejectJoin: (requestId: string) => void;
  onRecordScore: () => void;
  isCurrentUserOnCourt: boolean;
  isHost: boolean;
  canPerformActions: boolean;
  courtPreviewWidth?: number;
  hideCourtPreview?: boolean;
  /** 확대 패널: 경기유형 옆 작은 코트 */
  showInlineCourt?: boolean;
  embedded?: boolean;
  /** 확대 뷰 — 버튼 외 영역 탭 시 닫기 */
  onDismiss?: () => void;
  occupancyMode?: boolean;
  isStaff?: boolean;
  onSetSetupState?: (state: OccupancySetupState) => void;
  /** @deprecated onSetSetupState 사용 */
  onSetOccupancy?: (occupied: boolean) => void;
}

const STATUS_LABEL: Record<Court['status'], string> = {
  empty: '예약 가능',
  reserved: '예약됨',
  playing: '경기 중',
  just_finished: '반납 대기',
};

const OCCUPANCY_LABEL: Record<Court['status'], string> = {
  empty: OCCUPANCY_SETUP_LABEL.unset,
  reserved: OCCUPANCY_SETUP_LABEL.ready,
  playing: OCCUPANCY_SETUP_LABEL.active,
  just_finished: OCCUPANCY_SETUP_LABEL.active,
};

export function CourtDetailContent({
  court,
  onReserve,
  onJoin,
  onJoinWait,
  onLeaveWait,
  onRemoveWait,
  onCompleteGame,
  onReturnCourt,
  onCancelReservation,
  onStartGame,
  onAcceptJoin,
  onRejectJoin,
  onRecordScore,
  isCurrentUserOnCourt,
  isHost,
  canPerformActions,
  courtPreviewWidth = 300,
  hideCourtPreview = false,
  showInlineCourt = false,
  embedded = false,
  onDismiss,
  occupancyMode = false,
  isStaff = false,
  onSetSetupState,
  onSetOccupancy,
}: CourtDetailContentProps) {
  const [gameCount, setGameCount] = useState<number>(GAME_COUNT_OPTIONS[1]);
  const [gameMode, setGameMode] = useState<GameMode>('casual');
  const [nantaHalf, setNantaHalf] = useState<NantaHalf>('near');

  useEffect(() => {
    setGameCount(GAME_COUNT_OPTIONS[1]);
    setGameMode('casual');
    setNantaHalf('near');
  }, [court.id]);

  const currentUserId = useAuthStore((s) => s.currentUser?.id);
  const eloOn = useFeatureFlagsStore((s) => s.eloFeaturesEnabled);
  const canReserveCoachCourt = useLessonStore((s) => s.canReserveCoachCourt);
  // 코치 코트는 기본 예약 불가 — 레슨 권한·차례가 된 사용자만 예약 가능
  const coachReservable = court.isCoachCourt
    ? currentUserId
      ? canReserveCoachCourt(currentUserId).allowed
      : false
    : true;

  const canJoin =
    !occupancyMode &&
    court.status === 'playing' &&
    court.players.length >= 2 &&
    court.players.length < 4;
  const waitQueue = occupancyMode ? [] : court.waitQueue ?? [];
  const canWait =
    (court.status === 'reserved' || court.status === 'playing') &&
    !isCurrentUserOnCourt &&
    !waitQueue.some((w) => w.userId === currentUserId);
  const isWaiting = !!currentUserId && waitQueue.some((w) => w.userId === currentUserId);
  const floorColor = COURT_FLOOR_COLORS[court.status];
  const previewH = getCourtHeight(courtPreviewWidth);
  const inlineW = Math.min(courtPreviewWidth, 160);
  const inlineH = getCourtHeight(inlineW);
  const colLabel = getCourtColumnLabel(court.id);
  const elapsed = formatElapsed(court.startedAt);
  const cleanupLeft = formatCleanupRemaining(court.finishedAt);
  const courtMeta = [
    GYM_VENUE.shortName,
    colLabel,
    court.isCenter ? '센터 코트' : null,
    court.isCoachCourt ? '코치 코트' : null,
    GYM_VENUE.floorMaterial,
  ]
    .filter(Boolean)
    .join(' · ');

  const statusLabel = occupancyMode ? OCCUPANCY_LABEL[court.status] : STATUS_LABEL[court.status];
  const guard = (node: React.ReactNode) =>
    onDismiss ? <TouchGuard>{node}</TouchGuard> : node;

  const inlineCourtNode = showInlineCourt ? (
    <View
      style={[styles.inlineCourt, { width: inlineW, height: inlineH, pointerEvents: 'none' }]}
    >
      <CourtIllustration court={court} width={inlineW} borderRadius={borderRadius.sm} />
      {!occupancyMode && court.players.length > 0 && (
        <CourtPlayerProfiles
          players={court.players}
          avatarSize={Math.max(10, Math.min(14, inlineW * 0.1))}
          courtWidth={inlineW}
          courtHeight={inlineH}
          compact
        />
      )}
    </View>
  ) : null;

  const setupState = occupancySetupFromStatus(court.status);
  const applySetup =
    onSetSetupState ??
    (onSetOccupancy
      ? (state: OccupancySetupState) => onSetOccupancy(state === 'active')
      : undefined);

  const actionsBlock = occupancyMode ? (
    isStaff && applySetup ? (
      <View style={[styles.actions, embedded && styles.actionsEmbedded]}>
        {setupState === 'unset' && (
          <>
            {guard(
              <Button
                title="코트 치기"
                onPress={() => applySetup('ready')}
                fullWidth
                size="lg"
              />
            )}
            {guard(
              <Button
                title="사용 중으로"
                onPress={() => applySetup('active')}
                fullWidth
                size="md"
                variant="secondary"
                style={{ marginTop: spacing.sm }}
              />
            )}
          </>
        )}
        {setupState === 'ready' && (
          <>
            {guard(
              <Button
                title="사용 중으로"
                onPress={() => applySetup('active')}
                fullWidth
                size="lg"
              />
            )}
            {guard(
              <Button
                title="코트 정리 (미설치)"
                onPress={() => applySetup('unset')}
                fullWidth
                size="md"
                variant="ghost"
                style={{ marginTop: spacing.sm }}
              />
            )}
          </>
        )}
        {setupState === 'active' && (
          <>
            {guard(
              <Button
                title="사용 종료"
                onPress={() => applySetup('ready')}
                fullWidth
                size="lg"
              />
            )}
            {guard(
              <Button
                title="코트 정리 (미설치)"
                onPress={() => applySetup('unset')}
                fullWidth
                size="md"
                variant="ghost"
                style={{ marginTop: spacing.sm }}
              />
            )}
          </>
        )}
      </View>
    ) : null
  ) : (
    <View style={[styles.actions, embedded && styles.actionsEmbedded]}>
      {!canPerformActions && (
        <Text style={styles.warningText}>체육관 근처에서만 예약·이용할 수 있어요</Text>
      )}

      {court.status === 'reserved' && isCurrentUserOnCourt && canPerformActions && (
        <>
          {guard(
            <Button
              title={`게임 시작 (${court.players.length}명)`}
              onPress={onStartGame}
              fullWidth
              size="lg"
            />
          )}
          {isHost &&
            guard(
              <Button
                title="예약 취소"
                onPress={onCancelReservation}
                fullWidth
                size="md"
                variant="ghost"
                style={{ marginTop: spacing.sm }}
              />
            )}
        </>
      )}

      {court.status === 'reserved' && !isCurrentUserOnCourt && isHost && canPerformActions &&
        guard(
          <Button
            title="예약 취소"
            onPress={onCancelReservation}
            fullWidth
            size="lg"
            variant="outline"
          />
        )}

      {canJoin && !isCurrentUserOnCourt && canPerformActions &&
        guard(
          <Button title="빈자리 합류 신청" onPress={onJoin} fullWidth size="lg" variant="outline" />
        )}

      {canWait && onJoinWait && canPerformActions &&
        guard(
          <Button
            title={`다음 이용 대기${waitQueue.length ? ` (${waitQueue.length}명)` : ''}`}
            onPress={onJoinWait}
            fullWidth
            size="md"
            variant="outline"
          />
        )}

      {isWaiting && onLeaveWait && canPerformActions &&
        guard(
          <Button title="대기 취소" onPress={onLeaveWait} fullWidth size="md" variant="ghost" />
        )}

      {court.status === 'playing' && isCurrentUserOnCourt && canPerformActions && (
        <>
          {guard(<Button title="게임 1판 완료" onPress={onCompleteGame} fullWidth size="lg" />)}
          {guard(
            <Button
              title="코트 반납"
              onPress={onReturnCourt}
              fullWidth
              size="md"
              variant="ghost"
              style={{ marginTop: spacing.sm }}
            />
          )}
        </>
      )}

      {court.status === 'just_finished' && isCurrentUserOnCourt && canPerformActions && (
        <>
          {guard(<Button title="코트 반납" onPress={onReturnCourt} fullWidth size="lg" />)}
          {guard(
            <Button
              title="결과 기록 (선택)"
              onPress={onRecordScore}
              fullWidth
              size="sm"
              variant="ghost"
              style={{ marginTop: spacing.sm }}
            />
          )}
        </>
      )}
    </View>
  );

  const content = (
    <>
      {!hideCourtPreview && (
        <View style={styles.header}>
          <Text style={styles.title}>{court.id}번 코트</Text>
          <Text style={styles.courtMeta}>{courtMeta}</Text>
          <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: floorColor }]} />
          <Text style={styles.status}>{statusLabel}</Text>
          {court.maxGames > 0 && court.status !== 'empty' && (
            <Text style={styles.gameMeta}>· {court.maxGames}게임</Text>
          )}
          {elapsed && court.status === 'playing' && (
            <Text style={styles.gameMeta}>· {elapsed}</Text>
          )}
          {cleanupLeft && court.status === 'just_finished' && (
            <Text style={styles.gameMeta}>· {cleanupLeft}</Text>
          )}
          {court.gameMode && court.status !== 'empty' && (
            <View style={styles.modeBadgeInline}>
              <GameModeBadge mode={court.gameMode} nantaHalf={court.nantaHalf} />
            </View>
          )}
        </View>
          {court.isCoachCourt && <Text style={styles.tag}>코칭</Text>}
        </View>
      )}

      {hideCourtPreview && (
        <View style={[styles.compactStatus, embedded && styles.compactStatusEmbedded]}>
          <View style={[styles.statusDot, { backgroundColor: floorColor }]} />
          <Text style={styles.status}>{statusLabel}</Text>
          {court.maxGames > 0 && court.status !== 'empty' && (
            <Text style={styles.gameMeta}>· {court.maxGames}게임</Text>
          )}
          {court.gameMode && court.status !== 'empty' && (
            <GameModeBadge mode={court.gameMode} nantaHalf={court.nantaHalf} compact />
          )}
          {court.isCoachCourt && <Text style={styles.tag}>· 코칭</Text>}
        </View>
      )}

      {!hideCourtPreview && (
      <View style={styles.courtPreview}>
        <View style={{ width: courtPreviewWidth, height: previewH, position: 'relative' }}>
          <CourtIllustration court={court} width={courtPreviewWidth} />
          <CourtPlayerProfiles
            players={occupancyMode ? [] : court.players}
            avatarSize={28}
            courtWidth={courtPreviewWidth}
            courtHeight={previewH}
          />
        </View>
      </View>
      )}

      {court.isCoachCourt && <CoachingScreenContent embedded />}

      {occupancyMode ? (
        <View style={[styles.withInlineRow, embedded && styles.withInlineRowEmbedded]}>
          <View style={[styles.infoBlock, styles.withInlineMain, embedded && styles.infoBlockEmbedded]}>
            <Text style={styles.infoLine}>
              <Text style={styles.infoBold}>{court.status === 'empty' ? '비어 있음' : '사용 중'}</Text>
            </Text>
          </View>
          {inlineCourtNode}
        </View>
      ) : (
        <>
      {court.status === 'empty' && court.isCoachCourt && !coachReservable && (
        <View style={[styles.withInlineRow, embedded && styles.withInlineRowEmbedded]}>
          <View style={[styles.infoBlock, styles.withInlineMain, embedded && styles.infoBlockEmbedded]}>
            <Text style={styles.infoLine}>
              <Text style={styles.infoBold}>코치 코트</Text> · 예약할 수 없어요
            </Text>
            <Text style={styles.infoSub}>레슨 권한 신청 후 대기 순서가 되면 이 화면에서 예약할 수 있어요.</Text>
          </View>
          {inlineCourtNode}
        </View>
      )}

      {court.status === 'empty' && canPerformActions && coachReservable && (
        <View style={[styles.withInlineRow, embedded && styles.withInlineRowEmbedded]}>
          <View style={[styles.reserveBlock, styles.withInlineMain, embedded && styles.reserveBlockEmbedded]}>
            <Text style={styles.blockTitle}>경기 유형</Text>
            {guard(
              <GameModePicker
                value={gameMode}
                nantaHalf={nantaHalf}
                onChange={setGameMode}
                onNantaHalfChange={setNantaHalf}
              />
            )}
            <Text style={[styles.blockTitle, { marginTop: spacing.sm }]}>게임 수</Text>
            {guard(<GameCountPicker value={gameCount} onChange={setGameCount} />)}
            {guard(
              <Button
                title={`${gameCount}게임 예약하기`}
                onPress={() => onReserve(gameCount, gameMode, gameMode === 'nanta' ? nantaHalf : undefined)}
                fullWidth
                size="lg"
              />
            )}
          </View>
          {inlineCourtNode}
        </View>
      )}

      {court.status === 'empty' && !canPerformActions && !(court.isCoachCourt && !coachReservable) && (
        <View style={[styles.withInlineRow, embedded && styles.withInlineRowEmbedded]}>
          <View style={[styles.infoBlock, styles.withInlineMain, embedded && styles.infoBlockEmbedded]}>
            <Text style={styles.infoSub}>체육관 근처에서만 예약할 수 있어요.</Text>
          </View>
          {inlineCourtNode}
        </View>
      )}

      {court.status === 'reserved' && (
        <View style={[styles.withInlineRow, embedded && styles.withInlineRowEmbedded]}>
          <View style={[styles.infoBlock, styles.withInlineMain, embedded && styles.infoBlockEmbedded]}>
            <Text style={styles.infoLine}>
              <Text style={styles.infoBold}>
                {court.gameMode ? GAME_MODE_CONFIG[court.gameMode].label : '경기'}
              </Text>
              {' · '}
              <Text style={styles.infoBold}>{court.maxGames}게임</Text> 예약됨
            </Text>
            <Text style={styles.infoSub}>참가 {court.players.length}명 · 게임 시작 전</Text>
          </View>
          {inlineCourtNode}
        </View>
      )}

      {court.status === 'playing' && court.maxGames > 0 && (
        <View style={[styles.withInlineRow, embedded && styles.withInlineRowEmbedded]}>
          <View style={[styles.infoBlock, styles.withInlineMain, embedded && styles.infoBlockEmbedded]}>
            <Text style={styles.infoLine}>
              {court.gameMode && (
                <Text style={styles.infoBold}>{GAME_MODE_CONFIG[court.gameMode].label} · </Text>
              )}
              진행 <Text style={styles.infoBold}>{court.gamesCompleted}/{court.maxGames}</Text> 게임
            </Text>
          </View>
          {inlineCourtNode}
        </View>
      )}

      {court.status === 'just_finished' && (
        <View style={[styles.withInlineRow, embedded && styles.withInlineRowEmbedded]}>
          <View style={[styles.infoBlock, styles.withInlineMain, embedded && styles.infoBlockEmbedded]}>
            <Text style={styles.infoLine}>
              <Text style={styles.infoBold}>정리 중</Text>
              {cleanupLeft ? ` · ${cleanupLeft}` : ''}
            </Text>
          </View>
          {inlineCourtNode}
        </View>
      )}
        </>
      )}

      {embedded && actionsBlock}

      {!occupancyMode && court.players.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>참가자 {court.players.length}/4</Text>
          {court.players.map((p) => (
            <View key={p.userId} style={styles.playerRow}>
              <UserAvatar userId={p.userId} name={p.name} color={p.avatarColor} size={36} />
              <Text style={styles.playerName}>{p.name}</Text>
              {eloOn ? <RankBadge rank={p.rank} size="sm" /> : null}
            </View>
          ))}
        </View>
      )}

      {!occupancyMode && court.joinRequests.length > 0 && isHost && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>합류 신청</Text>
          {court.joinRequests.map((req) => (
            <View key={req.id} style={styles.requestRow}>
              <UserAvatar userId={req.userId} name={req.userName} color={colors.primary} size={32} />
              <Text style={styles.playerName}>{req.userName}</Text>
              <View style={styles.requestActions}>
                {guard(<Button title="수락" onPress={() => onAcceptJoin(req.id)} size="sm" />)}
                {guard(
                  <Button title="거절" onPress={() => onRejectJoin(req.id)} size="sm" variant="ghost" />
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {!occupancyMode && waitQueue.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>다음 이용 대기 {waitQueue.length}명</Text>
          {waitQueue.map((w, i) => (
            <View key={w.id} style={styles.requestRow}>
              <UserAvatar userId={w.userId} name={w.userName} color={colors.primary} size={28} />
              <Text style={styles.playerName}>
                {i + 1}. {w.userName}
                {w.userId === currentUserId ? ' (나)' : ''}
              </Text>
              {isHost && onRemoveWait && canPerformActions
                ? guard(
                    <Button title="제외" onPress={() => onRemoveWait(w.id)} size="sm" variant="ghost" />
                  )
                : null}
            </View>
          ))}
        </View>
      )}

      {!embedded && actionsBlock}
    </>
  );

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        embedded && styles.scrollContentEmbedded,
        embedded && styles.scrollContentEmbeddedTight,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
      bounces={false}
    >
      {onDismiss ? (
        <Pressable onPress={onDismiss} style={styles.dismissSurface}>
          {content}
        </Pressable>
      ) : (
        content
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  scrollContentEmbedded: { padding: spacing.md, paddingBottom: spacing.lg },
  scrollContentEmbeddedTight: { paddingBottom: spacing.md, flexGrow: 0 },
  dismissSurface: {},
  header: { marginBottom: spacing.md },
  compactStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  compactStatusEmbedded: { marginBottom: spacing.sm },
  title: { ...typography.h2, color: colors.text },
  courtMeta: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    marginBottom: spacing.xs,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  status: { ...typography.caption, color: colors.textSecondary },
  gameMeta: { ...typography.caption, color: colors.textMuted },
  modeBadgeInline: { marginLeft: 4 },
  tag: { ...typography.small, color: colors.primary, marginTop: 4 },
  courtPreview: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  withInlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  withInlineRowEmbedded: { marginBottom: spacing.sm },
  withInlineMain: {
    flex: 1,
    minWidth: 160,
    marginBottom: 0,
  },
  inlineCourt: {
    flexShrink: 0,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
  },
  reserveBlock: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  reserveBlockEmbedded: { marginBottom: spacing.sm, padding: spacing.sm },
  blockTitle: { ...typography.bodyBold, color: colors.text },
  infoBlock: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoBlockEmbedded: { marginBottom: spacing.sm, padding: spacing.sm },
  infoLine: { ...typography.body, color: colors.text },
  infoBold: { fontFamily: typography.bodyBold.fontFamily, color: colors.primary },
  infoSub: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  section: { marginBottom: spacing.md },
  sectionTitle: { ...typography.label, color: colors.textMuted, marginBottom: spacing.sm },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  playerName: { ...typography.bodyBold, color: colors.text, flex: 1 },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
  },
  requestActions: { flexDirection: 'row', gap: 4 },
  actions: { marginTop: spacing.sm, gap: spacing.sm },
  actionsEmbedded: { marginTop: 0, marginBottom: spacing.sm },
  warningText: { ...typography.caption, color: colors.warning, textAlign: 'center', marginBottom: spacing.sm },
});
