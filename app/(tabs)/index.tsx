import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCourtStore } from '@/src/stores/courtStore';
import { useAuthStore } from '@/src/stores/authStore';
import { useAppStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useActivityStatus } from '@/src/hooks/useActivityStatus';
import { useGeoLocation } from '@/src/hooks/useGeoLocation';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { useCourtRealtime } from '@/src/hooks/useCourtRealtime';
import { CourtOverviewHeader } from '@/src/components/courts/CourtOverviewHeader';
import { CourtExpandView } from '@/src/components/courts/CourtExpandView';
import { MatchScoreSheet } from '@/src/components/courts/MatchScoreSheet';
import { ActivityNoticeBanner } from '@/src/components/guide/ActivityNoticeBanner';
import { PageContainer } from '@/src/components/layout/PageContainer';
import { colors } from '@/src/theme';
import type { Court, GameMode, NantaHalf } from '@/src/types';

export default function CourtsScreen() {
  const { remaining } = useActivityStatus();
  const { isAtGym } = useGeoLocation();
  useCourtRealtime();
  const { expandAreaHeight, needsVerticalScroll } = useLayoutMode();

  const courts = useCourtStore((s) => s.courts);
  const selectedCourtId = useCourtStore((s) => s.selectedCourtId);
  const selectCourt = useCourtStore((s) => s.selectCourt);
  const reserveCourt = useCourtStore((s) => s.reserveCourt);
  const startGame = useCourtStore((s) => s.startGame);
  const completeGame = useCourtStore((s) => s.completeGame);
  const returnCourt = useCourtStore((s) => s.returnCourt);
  const cancelReservation = useCourtStore((s) => s.cancelReservation);
  const requestJoin = useCourtStore((s) => s.requestJoin);
  const acceptJoin = useCourtStore((s) => s.acceptJoin);
  const rejectJoin = useCourtStore((s) => s.rejectJoin);
  const refreshCourts = useCourtStore((s) => s.refreshCourts);

  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useAuthStore((s) => s.users);
  const checkGeoFence = useAppStore((s) => s.checkGeoFence);
  const showToast = useNotificationStore((s) => s.showToast);
  const submitMatchResult = useNotificationStore((s) => s.submitMatchResult);

  const atGymCount = users.filter((u) => u.isAtGym && u.memberStatus === 'approved').length;

  const [refreshing, setRefreshing] = useState(false);
  const [showScoreSheet, setShowScoreSheet] = useState(false);
  const [filter, setFilter] = useState<'all' | 'empty' | 'mine'>('all');
  const closeExpandRef = useRef<() => void>(() => {});
  const remeasureExpandRef = useRef<() => void>(() => {});

  const selectedCourt = courts.find((c) => c.id === selectedCourtId) ?? null;

  // 친구·프로필 등 다른 화면으로 나가면 확대 해제 → 돌아오면 코트 목록
  useFocusEffect(
    useCallback(() => {
      return () => {
        const { selectedCourtId: id, selectCourt: clear } = useCourtStore.getState();
        if (id != null) clear(null);
      };
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshCourts();
    setTimeout(() => setRefreshing(false), 800);
  }, [refreshCourts]);

  const handleCourtPress = (court: Court) => selectCourt(court.id);
  const handleClose = () => {
    setShowScoreSheet(false);
    closeExpandRef.current();
  };

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { __selectCourt?: (id: number | null) => void };
    w.__selectCourt = (id) => selectCourt(id);
    return () => {
      delete w.__selectCourt;
    };
  }, [selectCourt]);

  const isCurrentUserOnCourt =
    selectedCourt?.players.some((p) => p.userId === currentUser?.id) ?? false;

  const isHost =
    !!currentUser &&
    !!selectedCourt &&
    (selectedCourt.reservedBy === currentUser.id ||
      selectedCourt.players[0]?.userId === currentUser.id);

  const contentProps = {
    onReserve: (gameCount: number, gameMode: GameMode, nantaHalf?: NantaHalf) => {
      if (!currentUser || !selectedCourt) return;
      const result = reserveCourt(
        selectedCourt.id,
        currentUser.id,
        gameCount,
        gameMode,
        nantaHalf
      );
      showToast({ type: result.success ? 'success' : 'warning', title: '', message: result.message });
      if (result.success) handleClose();
    },
    onJoin: () => {
      if (!currentUser || !selectedCourt) return;
      if (!checkGeoFence()) {
        showToast({ type: 'warning', title: '', message: '체육관 근처에서만 합류할 수 있어요.' });
        return;
      }
      const result = requestJoin(selectedCourt.id, currentUser.id, currentUser.name, currentUser.rank);
      showToast({ type: result.success ? 'success' : 'warning', title: '', message: result.message });
      if (result.success) handleClose();
    },
    onAcceptJoin: (requestId: string) => {
      if (!selectedCourt) return;
      const result = acceptJoin(selectedCourt.id, requestId);
      showToast({ type: result.success ? 'success' : 'warning', title: '', message: result.message });
    },
    onRejectJoin: (requestId: string) => {
      if (!selectedCourt) return;
      rejectJoin(selectedCourt.id, requestId);
      showToast({ type: 'info', title: '', message: '합류 신청을 거절했어요.' });
    },
    onCompleteGame: () => {
      if (!selectedCourt) return;
      const result = completeGame(selectedCourt.id);
      showToast({ type: result.success ? 'success' : 'warning', title: '', message: result.message });
    },
    onReturnCourt: () => {
      if (!selectedCourt) return;
      returnCourt(selectedCourt.id);
      setShowScoreSheet(false);
      showToast({ type: 'info', title: '', message: '코트가 반납되었어요.' });
      handleClose();
    },
    onCancelReservation: () => {
      if (!currentUser || !selectedCourt) return;
      const result = cancelReservation(selectedCourt.id, currentUser.id);
      showToast({ type: result.success ? 'info' : 'warning', title: '', message: result.message });
      if (result.success) handleClose();
    },
    onStartGame: () => {
      if (!selectedCourt) return;
      const result = startGame(selectedCourt.id);
      showToast({ type: result.success ? 'success' : 'warning', title: '', message: result.message });
    },
    onRecordScore: () => setShowScoreSheet(true),
    isCurrentUserOnCourt,
    isHost,
    canPerformActions: checkGeoFence(),
  };

  const handleSubmitScore = (scoreA: number, scoreB: number) => {
    if (!selectedCourt) return;
    const mid = Math.ceil(selectedCourt.players.length / 2);
    const teamA = selectedCourt.players.slice(0, mid).map((p) => p.userId);
    const teamB = selectedCourt.players.slice(mid).map((p) => p.userId);
    const result = submitMatchResult(
      selectedCourt.id,
      teamA,
      teamB,
      scoreA,
      scoreB,
      selectedCourt.gameMode
    );
    setShowScoreSheet(false);
    if (!result.recorded) {
      showToast({ type: 'warning', title: '', message: '점수를 다시 확인해주세요.' });
      return;
    }
    if (result.requiresApproval) {
      showToast({
        type: 'info',
        title: '',
        message: '오늘 경기가 많아 관리자 승인 후 Elo가 반영돼요.',
      });
    } else if (result.applied) {
      showToast({ type: 'success', title: '', message: 'Elo·포인트가 반영됐어요.' });
    } else {
      showToast({ type: 'success', title: '', message: '친선경기로 기록됐어요.' });
    }
  };

  return (
    <View style={styles.safe}>
      <PageContainer flush>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            selectedCourtId !== null && {
              minHeight: expandAreaHeight,
              flexGrow: 1,
              paddingBottom: 160,
            },
            selectedCourtId === null && needsVerticalScroll && { minHeight: expandAreaHeight },
          ]}
          scrollEnabled
          nestedScrollEnabled
          showsVerticalScrollIndicator={needsVerticalScroll || selectedCourtId !== null}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={32}
          onScroll={() => {
            if (selectedCourtId != null) remeasureExpandRef.current();
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          <ActivityNoticeBanner />

          <CourtOverviewHeader
            courts={courts}
            filter={filter}
            onFilterChange={setFilter}
            myUserId={currentUser?.id}
            isAtGym={isAtGym}
            atGymCount={atGymCount}
            remaining={remaining}
            isExpanded={selectedCourtId !== null}
          />

          <View
            style={[
              styles.gridArea,
              selectedCourtId === null && needsVerticalScroll && styles.gridAreaScrollable,
              { minHeight: selectedCourtId !== null ? expandAreaHeight : undefined },
              selectedCourtId !== null && styles.gridAreaExpanded,
            ]}
          >
            <CourtExpandView
              courts={courts}
              selectedCourtId={selectedCourtId}
              selectedCourt={selectedCourt}
              onCourtPress={handleCourtPress}
              onDeselect={() => selectCourt(null)}
              onRegisterClose={(fn) => {
                closeExpandRef.current = fn;
              }}
              onRegisterRemeasure={(fn) => {
                remeasureExpandRef.current = fn;
              }}
              filter={filter}
              myUserId={currentUser?.id}
              detailProps={contentProps}
            />
          </View>

          {selectedCourtId === null && needsVerticalScroll && (
            <Text style={styles.scrollHint}>아래로 스크롤해 전체 코트를 볼 수 있어요</Text>
          )}
        </ScrollView>
      </PageContainer>

      <MatchScoreSheet
        visible={showScoreSheet && selectedCourt !== null}
        courtId={selectedCourt?.id ?? 0}
        players={selectedCourt?.players ?? []}
        rated={selectedCourt?.gameMode !== 'nanta'}
        onSubmit={handleSubmitScore}
        onClose={() => setShowScoreSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 8 },
  gridArea: {},
  gridAreaScrollable: {
    flexGrow: 0,
  },
  gridAreaExpanded: { flex: 1 },
  scrollHint: {
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: colors.textMuted,
    paddingTop: 4,
    paddingBottom: 8,
  },
});
