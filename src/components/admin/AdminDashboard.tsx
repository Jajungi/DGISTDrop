import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useAuthStore, useAppStore } from '@/src/stores/authStore';
import { useFeatureFlagsStore, isEloFeaturesEnabled } from '@/src/stores/featureFlagsStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useLessonStore } from '@/src/stores/lessonStore';
import { useCourtStore } from '@/src/stores/courtStore';
import { useFriendStore } from '@/src/stores/friendStore';
import { useLobbyStore } from '@/src/stores/lobbyStore';
import { useAdminLogStore } from '@/src/stores/adminLogStore';
import { useAdminAlertStore } from '@/src/stores/adminAlertStore';
import { useAdminAlerts } from '@/src/hooks/useAdminAlerts';
import { Ionicons } from '@expo/vector-icons';
import { recordAdminLogAsActor } from '@/src/services/adminLog';
import { persistAppState } from '@/src/services/persistGate';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Avatar } from '@/src/components/ui/Avatar';
import { RankBadge } from '@/src/components/ui/RankBadge';
import { AdminLogPanel } from '@/src/components/admin/AdminLogPanel';
import { MemberAdminPanel } from '@/src/components/admin/MemberAdminPanel';
import { AdminSettingsPanel } from '@/src/components/admin/AdminSettingsPanel';
import { AdminSubTabs } from '@/src/components/admin/AdminSubTabs';
import { AdminPointsPanel } from '@/src/components/admin/AdminPointsPanel';
import { AdminDbResetPanel } from '@/src/components/admin/AdminDbResetPanel';
import { AdminPushPanel } from '@/src/components/admin/AdminPushPanel';
import { AdminFieldOpsPanel } from '@/src/components/admin/AdminFieldOpsPanel';
import { GAME_MODE_CONFIG } from '@/src/constants/court';
import { isAdminUser, isOperatorUser, roleBadgeLabel } from '@/src/utils/staffAccess';
import { getEffectiveSchedule, getTodayKey, formatTodayLabel } from '@/src/utils/dateFormat';
import { colors, spacing, typography, borderRadius } from '@/src/theme';
import type { AdminLogCategory, User, Court, MatchResult } from '@/src/types';
import type { AdminAlertSection } from '@/src/hooks/useAdminAlerts';

const QUEUE_STATUS_LABEL: Record<string, string> = {
  waiting: '대기',
  next: '다음 차례',
  active: '레슨 중',
  done: '완료',
};

const MEMBER_STATUS_LABEL: Record<string, string> = {
  pending: '승인 대기',
  approved: '승인됨',
  rejected: '거절됨',
  suspended: '정지됨',
};

const LESSON_STATUS_LABEL: Record<string, string> = {
  none: '미신청',
  pending: '레슨 승인 대기',
  approved: '레슨 권한 있음',
  rejected: '레슨 거절',
};

type AdminGroup = 'home' | 'people' | 'live' | 'points' | 'push' | 'settings' | 'logs' | 'developer';
type PeopleSub = 'members' | 'attendance' | 'social';
type LiveSub = 'courts' | 'matches' | 'lessons' | 'arrival' | 'lobby';

interface AdminDashboardProps {
  adminId: string;
}

export function AdminDashboard({ adminId }: AdminDashboardProps) {
  const users = useAuthStore((s) => s.users);
  const attendanceRecords = useAuthStore((s) => s.attendanceRecords);
  const approveLessonAccess = useAuthStore((s) => s.approveLessonAccess);
  const rejectLessonAccess = useAuthStore((s) => s.rejectLessonAccess);
  const adminRevokeAttendance = useAuthStore((s) => s.adminRevokeAttendance);
  const adminForceCheckIn = useAuthStore((s) => s.adminForceCheckIn);
  const adminSetLessonStatus = useAuthStore((s) => s.adminSetLessonStatus);
  const courts = useCourtStore((s) => s.courts);
  const returnCourt = useCourtStore((s) => s.returnCourt);
  const adminClearJoinRequests = useCourtStore((s) => s.adminClearJoinRequests);
  const adminRemovePlayer = useCourtStore((s) => s.adminRemovePlayer);
  const adminRefundAndReturn = useCourtStore((s) => s.adminRefundAndReturn);
  const pendingMatches = useNotificationStore((s) => s.pendingMatches);
  const matchHistory = useNotificationStore((s) => s.matchHistory);
  const confirmMatch = useNotificationStore((s) => s.confirmMatch);
  const adminCancelPendingMatch = useNotificationStore((s) => s.adminCancelPendingMatch);
  const adminRevokeConfirmedMatch = useNotificationStore((s) => s.adminRevokeConfirmedMatch);
  const showToast = useNotificationStore((s) => s.showToast);
  const lessonQueue = useLessonStore((s) => s.lessonQueue);
  const setNextInQueue = useLessonStore((s) => s.setNextInQueue);
  const startLesson = useLessonStore((s) => s.startLesson);
  const completeLesson = useLessonStore((s) => s.completeLesson);
  const adminRemoveFromQueue = useLessonStore((s) => s.adminRemoveFromQueue);
  const friendRequests = useFriendStore((s) => s.friendRequests);
  const adminDismissFriendRequest = useFriendStore((s) => s.adminDismissFriendRequest);
  const lobbyRooms = useLobbyStore((s) => s.rooms);
  const adminLogs = useAdminLogStore((s) => s.logs);
  const clearAdminLogs = useAdminLogStore((s) => s.clear);
  const infinitePoints = useAppStore((s) => s.infinitePoints);
  const setInfinitePoints = useAppStore((s) => s.setInfinitePoints);
  const eloOn = useFeatureFlagsStore((s) => s.eloFeaturesEnabled);
  const setEloFeaturesEnabled = useFeatureFlagsStore((s) => s.setEloFeaturesEnabled);
  const pointsOn = useFeatureFlagsStore((s) => s.pointsFeaturesEnabled);
  const setPointsFeaturesEnabled = useFeatureFlagsStore((s) => s.setPointsFeaturesEnabled);
  const reservationEnabled = useFeatureFlagsStore((s) => s.reservationEnabled);
  const setReservationEnabled = useFeatureFlagsStore((s) => s.setReservationEnabled);
  const adminAlerts = useAdminAlerts();
  const dismissAlert = useAdminAlertStore((s) => s.dismiss);

  const [group, setGroup] = useState<AdminGroup>('home');
  const [peopleSub, setPeopleSub] = useState<PeopleSub>('members');
  const [liveSub, setLiveSub] = useState<LiveSub>('courts');
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<AdminLogCategory | 'all'>('all');

  const goAlertSection = (section: AdminAlertSection) => {
    if (section === 'members' || section === 'social') {
      setGroup('people');
      setPeopleSub(section === 'social' ? 'social' : 'members');
      return;
    }
    setGroup('live');
    setLiveSub(section === 'lessons' ? 'lessons' : 'matches');
  };

  const today = getTodayKey();
  const pendingMembers = users.filter((u) => u.memberStatus === 'pending');
  const suspendedMembers = users.filter((u) => u.memberStatus === 'suspended');
  const unconfirmedMatches = pendingMatches.filter((m) => m.status === 'pending');
  const pendingLessonUsers = users.filter((u) => u.lessonStatus === 'pending');
  const activeQueue = lessonQueue.filter((e) => e.status !== 'done');
  const pendingFriendRequests = friendRequests.filter((r) => r.status === 'pending');
  const approvedMembers = users.filter((u) => u.memberStatus === 'approved');
  const atGymCount = approvedMembers.filter((u) => u.isAtGym).length;
  const todayAttendance = attendanceRecords.filter((r) => r.date === today);
  const todayAttendedIds = new Set(todayAttendance.map((r) => r.userId));
  const notCheckedInToday = approvedMembers.filter((u) => !todayAttendedIds.has(u.id));
  const activeLobbyRooms = lobbyRooms.filter((r) => r.status === 'open').length;

  const courtStats = useMemo(() => {
    const empty = courts.filter((c) => c.status === 'empty').length;
    const playing = courts.filter((c) => c.status === 'playing').length;
    const reserved = courts.filter((c) => c.status === 'reserved').length;
    return { empty, playing, reserved, total: courts.length };
  }, [courts]);

  const resolveUser = (id: string) => users.find((u) => u.id === id);

  const logCourtReturn = (court: Court) => {
    returnCourt(court.id);
    recordAdminLogAsActor(adminId, {
      category: 'court',
      action: 'court.force_return',
      message: `코트 ${court.id} 강제 반납`,
      meta: { courtId: court.id },
    });
    showToast({ type: 'info', title: '', message: `코트 ${court.id}를 반납 처리했어요.` });
  };

  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdminActor = isAdminUser(
    currentUser?.id === adminId ? currentUser : users.find((u) => u.id === adminId)
  );
  const isOperatorActor = isOperatorUser(
    currentUser?.id === adminId ? currentUser : users.find((u) => u.id === adminId)
  );

  const groups: { key: AdminGroup; label: string; badge?: number }[] = [
    { key: 'home', label: '홈', badge: adminAlerts.length || undefined },
    {
      key: 'people',
      label: '사람',
      badge:
        (pendingMembers.length +
          suspendedMembers.length +
          pendingFriendRequests.length) || undefined,
    },
    {
      key: 'live',
      label: '현장',
      badge:
        (unconfirmedMatches.length + pendingLessonUsers.length + activeQueue.length) ||
        undefined,
    },
    ...(pointsOn ? [{ key: 'points' as AdminGroup, label: '포인트' }] : []),
    { key: 'settings', label: '설정' },
    { key: 'push', label: '알림' },
    { key: 'logs', label: '로그' },
    ...(isAdminActor ? [{ key: 'developer' as AdminGroup, label: '개발자' }] : []),
  ];

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {groups.map((s) => (
          <Pressable
            key={s.key}
            onPress={() => setGroup(s.key)}
            style={[styles.tab, group === s.key && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, group === s.key && styles.tabLabelActive]}>
              {s.label}
            </Text>
            {s.badge != null && s.badge > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{s.badge}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {group === 'home' && (
        <View style={styles.sectionBody}>
          <Text style={styles.dateHeading}>{formatTodayLabel()}</Text>
          <View style={styles.statGrid}>
            <StatCard label="승인 회원" value={String(approvedMembers.length)} />
            <StatCard label="오늘 출석" value={String(todayAttendance.length)} accent />
            <StatCard label="체육관 도착" value={String(atGymCount)} />
            <StatCard label="승인 대기" value={String(pendingMembers.length)} accent />
            <StatCard label="정지 계정" value={String(suspendedMembers.length)} accent />
            <StatCard label="경기 확정 대기" value={String(unconfirmedMatches.length)} accent />
            <StatCard label="레슨 권한 대기" value={String(pendingLessonUsers.length)} accent />
            <StatCard
              label="코트 사용 중"
              value={`${courtStats.playing + courtStats.reserved}/${courtStats.total}`}
            />
            <StatCard label="로비 방" value={String(activeLobbyRooms)} />
            <StatCard label="친구 신청" value={String(pendingFriendRequests.length)} />
          </View>

          <Card style={styles.block}>
            <View style={styles.blockHeader}>
              <Text style={styles.blockTitle}>확인 필요 ({adminAlerts.length})</Text>
            </View>
            {adminAlerts.length === 0 && <Text style={styles.empty}>새 알림이 없습니다</Text>}
            {adminAlerts.map((alert) => (
              <View key={alert.id} style={styles.alertCard}>
                <Pressable
                  style={styles.alertBody}
                  onPress={() => {
                    goAlertSection(alert.section);
                    dismissAlert(alert.id);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${alert.title} — 처리하러 가기`}
                >
                  <View style={styles.alertDot} />
                  <View style={styles.alertText}>
                    <Text style={styles.itemTitle}>{alert.title}</Text>
                    <Text style={styles.itemSub}>{alert.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
                <Pressable
                  style={styles.alertDismiss}
                  onPress={() => dismissAlert(alert.id)}
                  accessibilityRole="button"
                  accessibilityLabel="알림 확인 (숨기기)"
                  hitSlop={8}
                >
                  <Ionicons name="close" size={16} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </Card>

          <Card style={styles.block}>
            <View style={styles.blockHeader}>
              <Text style={styles.blockTitle}>최근 활동 로그</Text>
              <Pressable onPress={() => setGroup('logs')}>
                <Text style={styles.linkText}>전체 보기</Text>
              </Pressable>
            </View>
            <AdminLogPanel
              logs={adminLogs}
              filter="all"
              onFilterChange={() => {}}
              compact
              maxItems={5}
              onViewAll={() => setGroup('logs')}
            />
          </Card>

          <Card style={styles.hintCard}>
            <Text style={styles.hintTitle}>관리자 안내</Text>
            <Text style={styles.hintText}>
              사람(회원·출석·친구) · 현장(코트·도착·모집·경기·레슨) · 설정(활동 시간·달력·공지)에서 운영 작업을
              하세요. 주요 작업은 로그에 남습니다.
            </Text>
          </Card>
        </View>
      )}

      {group === 'settings' && (
        <View style={styles.sectionBody}>
          <AdminSettingsPanel
            adminId={adminId}
            adminName={resolveUser(adminId)?.name ?? '관리자'}
            onToast={(type, message) => showToast({ type, title: '', message })}
          />
        </View>
      )}

      {group === 'logs' && (
        <View style={styles.sectionBody}>
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>활동 로그 ({adminLogs.length}건)</Text>
            <AdminLogPanel
              logs={adminLogs}
              filter={logFilter}
              onFilterChange={setLogFilter}
              onClear={() => {
                clearAdminLogs();
                persistAppState();
                showToast({ type: 'info', title: '', message: '활동 로그를 비웠어요.' });
              }}
            />
          </Card>
        </View>
      )}

      {group === 'developer' && isAdminActor && (
        <View style={styles.sectionBody}>
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>개발자 모드</Text>
            {pointsOn ? (
              <>
            <DevToggle
              label="무한 포인트 모드"
              hint="ON: 999,999P 부여 · OFF: 켜기 전 포인트로 복귀 (실제 차감·적립은 정상 동작)"
              value={infinitePoints}
              onToggle={() => setInfinitePoints(!infinitePoints)}
            />
            <View style={styles.devDivider} />
              </>
            ) : null}
            {isOperatorActor ? (
              <>
            <DevToggle
              label="예약 기능 (데모)"
              hint="ON: 이름·게임 수로 코트를 예약합니다. OFF: 사용 중/비움만 보이고 운영진이 점유를 바꿉니다."
              value={reservationEnabled}
              onToggle={() => {
                void setReservationEnabled(!reservationEnabled).then((r) =>
                  showToast({ type: r.success ? 'info' : 'warning', title: '', message: r.message })
                );
              }}
            />
            <View style={styles.devDivider} />
            <DevToggle
              label="포인트 상점 기능 (데모)"
              hint="OFF: 포인트 화면·적립·차감이 숨겨집니다. 코트 현황 모드와 함께 끄는 것을 권장합니다."
              value={pointsOn}
              onToggle={() => {
                void setPointsFeaturesEnabled(!pointsOn).then((r) =>
                  showToast({ type: r.success ? 'info' : 'warning', title: '', message: r.message })
                );
              }}
            />
            <View style={styles.devDivider} />
            <DevToggle
              label="Elo · 랭크 (실험적 기능)"
              hint="OFF: 브론즈 등 티어, Elo 추이·순위표, 랭크 할인·모집 랭크 제한이 모두 숨겨집니다."
              value={eloOn}
              onToggle={() => {
                void setEloFeaturesEnabled(!eloOn).then((r) =>
                  showToast({ type: r.success ? 'info' : 'warning', title: '', message: r.message })
                );
              }}
            />
              </>
            ) : (
            <Text style={styles.demoHint}>예약·포인트 상점·Elo 스위치는 운영자만 바꿀 수 있어요.</Text>
            )}
          </Card>

          <AdminDbResetPanel adminId={adminId} />
        </View>
      )}

      {group === 'people' && (
        <View style={styles.sectionBody}>
          <AdminSubTabs
            active={peopleSub}
            onChange={setPeopleSub}
            items={[
              {
                key: 'members',
                label: '회원',
                badge: (pendingMembers.length + suspendedMembers.length) || undefined,
              },
              {
                key: 'attendance',
                label: '출석',
                badge: todayAttendance.length || undefined,
              },
              {
                key: 'social',
                label: '친구',
                badge: pendingFriendRequests.length || undefined,
              },
            ]}
          />

      {peopleSub === 'members' && (
          <MemberAdminPanel
            adminId={adminId}
            onToast={(type, message) => showToast({ type, title: '', message })}
          />
      )}

      {peopleSub === 'attendance' && (
        <>
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>
              오늘 출석 ({formatTodayLabel()}) · {todayAttendance.length}명
            </Text>
            {todayAttendance.length === 0 && (
              <Text style={styles.empty}>오늘 출석 기록이 없습니다</Text>
            )}
            {todayAttendance.map((record) => {
              const user = resolveUser(record.userId);
              if (!user) return null;
              return (
                <View key={record.id} style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <Avatar name={user.name} color={user.avatarColor} size={36} />
                    <View style={styles.itemBody}>
                      <Text style={styles.itemTitle}>{user.name}</Text>
                      <Text style={styles.itemSub}>
                        {user.studentId} ·{' '}
                        {new Date(record.checkedInAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        출석
                        {user.isAtGym ? ' · 현재 체육관' : ''}
                      </Text>
                    </View>
                    <RankBadge rank={user.rank} size="sm" />
                  </View>
                  <View style={styles.itemActions}>
                    <Button
                      title="출석 취소"
                      onPress={() => {
                        const r = adminRevokeAttendance(record.id, adminId);
                        showToast({
                          type: r.success ? 'info' : 'warning',
                          title: '',
                          message: r.message,
                        });
                      }}
                      size="sm"
                      variant="danger"
                    />
                  </View>
                </View>
              );
            })}
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>미출석 회원 ({notCheckedInToday.length})</Text>
            {notCheckedInToday.length === 0 && (
              <Text style={styles.empty}>오늘 승인 회원이 모두 출석했어요</Text>
            )}
            {notCheckedInToday.slice(0, 12).map((user) => (
              <View key={user.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <Avatar name={user.name} color={user.avatarColor} size={32} />
                  <View style={styles.itemBody}>
                    <Text style={styles.itemTitle}>{user.name}</Text>
                    <Text style={styles.itemSub}>{user.studentId}</Text>
                  </View>
                </View>
                <View style={styles.itemActions}>
                  <Button
                    title="출석 대리 인증"
                    onPress={() => {
                      const r = adminForceCheckIn(user.id, adminId);
                      showToast({
                        type: r.success ? 'success' : 'warning',
                        title: '',
                        message: r.message,
                      });
                    }}
                    size="sm"
                    variant="outline"
                  />
                </View>
              </View>
            ))}
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>도착 예정 (오늘)</Text>
            {approvedMembers
              .filter((u) => getEffectiveSchedule(u).start)
              .map((user) => {
                const sched = getEffectiveSchedule(user);
                return (
                  <View key={user.id} style={styles.itemCard}>
                    <Text style={styles.itemTitle}>{user.name}</Text>
                    <Text style={styles.itemSub}>
                      {sched.start}
                      {sched.end ? ` ~ ${sched.end}` : ''}
                      {user.isAtGym ? ' · 도착함' : ' · 미도착'}
                    </Text>
                  </View>
                );
              })}
          </Card>
        </>
      )}

      {peopleSub === 'social' && (
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>친구 신청 대기 ({pendingFriendRequests.length})</Text>
            {pendingFriendRequests.length === 0 && (
              <Text style={styles.empty}>대기 중인 친구 신청이 없습니다</Text>
            )}
            {pendingFriendRequests.map((req) => {
              const from = resolveUser(req.fromUserId);
              const to = resolveUser(req.toUserId);
              return (
                <View key={req.id} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>
                    {from?.name ?? req.fromUserId} → {to?.name ?? req.toUserId}
                  </Text>
                  <Text style={styles.itemSub}>
                    {new Date(req.createdAt).toLocaleString('ko-KR')}
                  </Text>
                  <View style={styles.itemActions}>
                    <Button
                      title="신청 거절"
                      onPress={() => {
                        const r = adminDismissFriendRequest(req.id);
                        if (r.success) {
                          recordAdminLogAsActor(adminId, {
                            category: 'social',
                            action: 'friend.dismiss',
                            message: `친구 신청 거절 (${from?.name} → ${to?.name})`,
                            targetId: req.id,
                          });
                        }
                        showToast({
                          type: r.success ? 'info' : 'warning',
                          title: '',
                          message: r.message,
                        });
                      }}
                      size="sm"
                      variant="danger"
                    />
                  </View>
                </View>
              );
            })}
          </Card>
      )}
        </View>
      )}

      {group === 'live' && (
        <View style={styles.sectionBody}>
          <AdminSubTabs
            active={liveSub}
            onChange={setLiveSub}
            items={[
              { key: 'courts', label: '코트' },
              { key: 'arrival', label: '도착' },
              { key: 'lobby', label: '모집' },
              {
                key: 'matches',
                label: '경기',
                badge: unconfirmedMatches.length || undefined,
              },
              {
                key: 'lessons',
                label: '레슨',
                badge: (pendingLessonUsers.length + activeQueue.length) || undefined,
              },
            ]}
          />

      {liveSub === 'arrival' && (
        <AdminFieldOpsPanel
          adminId={adminId}
          onToast={(type, message) => showToast({ type, title: '', message })}
          sections={['arrival']}
        />
      )}

      {liveSub === 'lobby' && (
        <AdminFieldOpsPanel
          adminId={adminId}
          onToast={(type, message) => showToast({ type, title: '', message })}
          sections={['lobby']}
        />
      )}

      {liveSub === 'matches' && (
        <>
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>확정 대기 ({unconfirmedMatches.length})</Text>
            {unconfirmedMatches.length === 0 && (
              <Text style={styles.empty}>대기 중인 경기가 없습니다</Text>
            )}
            {unconfirmedMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                resolveUser={resolveUser}
                expanded={expandedMatchId === match.id}
                onToggle={() => setExpandedMatchId((id) => (id === match.id ? null : match.id))}
                actions={
                  <View style={styles.actionStack}>
                    <Button
                      title={eloOn ? '결과 확정 및 Elo 반영' : '결과 확정 및 포인트 반영'}
                      onPress={() => {
                        confirmMatch(match.id, adminId);
                        showToast({
                          type: 'success',
                          title: '확정 완료',
                          message: eloOn ? 'Elo 및 포인트가 반영되었습니다.' : '포인트가 반영되었습니다.',
                        });
                      }}
                      size="sm"
                      variant="secondary"
                      fullWidth
                    />
                    <Button
                      title="제출 취소"
                      onPress={() => {
                        const r = adminCancelPendingMatch(match.id, adminId);
                        showToast({
                          type: r.success ? 'info' : 'warning',
                          title: '',
                          message: r.message,
                        });
                      }}
                      size="sm"
                      variant="danger"
                      fullWidth
                    />
                  </View>
                }
              />
            ))}
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>최근 확정 경기</Text>
            {matchHistory
              .filter((m) => m.status === 'confirmed')
              .slice(0, 8)
              .map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  resolveUser={resolveUser}
                  expanded={expandedMatchId === match.id}
                  onToggle={() => setExpandedMatchId((id) => (id === match.id ? null : match.id))}
                  actions={
                    <Button
                      title={eloOn ? '확정 철회 (Elo·포인트 되돌림)' : '확정 철회 (포인트 되돌림)'}
                      onPress={() => {
                        const r = adminRevokeConfirmedMatch(match.id, adminId);
                        showToast({
                          type: r.success ? 'info' : 'warning',
                          title: '',
                          message: r.message,
                        });
                      }}
                      size="sm"
                      variant="danger"
                      fullWidth
                    />
                  }
                />
              ))}
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>취소·철회된 경기</Text>
            {matchHistory.filter((m) => m.status === 'cancelled' || m.status === 'revoked').length === 0 && (
              <Text style={styles.empty}>취소·철회 기록이 없습니다</Text>
            )}
            {matchHistory
              .filter((m) => m.status === 'cancelled' || m.status === 'revoked')
              .slice(0, 6)
              .map((match) => (
                <MatchCard key={match.id} match={match} resolveUser={resolveUser} expanded={false} />
              ))}
          </Card>
        </>
      )}

      {liveSub === 'lessons' && (
        <>
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>레슨 권한 승인 대기 ({pendingLessonUsers.length})</Text>
            {pendingLessonUsers.length === 0 && (
              <Text style={styles.empty}>대기 중인 레슨 권한 신청이 없습니다</Text>
            )}
            {pendingLessonUsers.map((user) => (
              <MemberCard
                key={user.id}
                user={user}
                expanded={expandedMemberId === user.id}
                onToggle={() => setExpandedMemberId((id) => (id === user.id ? null : user.id))}
                actions={
                  <>
                    <Button
                      title="레슨 권한 승인"
                      onPress={() => {
                        const r = approveLessonAccess(user.id);
                        showToast({
                          type: r.success ? 'success' : 'warning',
                          title: '',
                          message: r.message,
                        });
                      }}
                      size="sm"
                      variant="secondary"
                    />
                    <Button
                      title="거절"
                      onPress={() => {
                        const r = rejectLessonAccess(user.id);
                        showToast({ type: 'info', title: '', message: r.message });
                      }}
                      size="sm"
                      variant="danger"
                    />
                  </>
                }
              />
            ))}
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>레슨 권한 보유 회원</Text>
            {approvedMembers.filter((u) => u.lessonStatus === 'approved').length === 0 && (
              <Text style={styles.empty}>레슨 권한 회원이 없습니다</Text>
            )}
            {approvedMembers
              .filter((u) => u.lessonStatus === 'approved')
              .map((user) => (
                <View key={user.id} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{user.name}</Text>
                  <Text style={styles.itemSub}>{user.studentId}</Text>
                  <View style={styles.itemActions}>
                    <Button
                      title="레슨 권한 회수"
                      onPress={() => {
                        const r = adminSetLessonStatus(user.id, 'none');
                        if (r.success) {
                          recordAdminLogAsActor(adminId, {
                            category: 'lesson',
                            action: 'lesson.revoke',
                            message: `${user.name} 레슨 권한 회수`,
                            targetId: user.id,
                            targetName: user.name,
                          });
                        }
                        showToast({
                          type: r.success ? 'info' : 'warning',
                          title: '',
                          message: r.success ? '레슨 권한을 회수했어요.' : r.message,
                        });
                      }}
                      size="sm"
                      variant="danger"
                    />
                  </View>
                </View>
              ))}
          </Card>

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>레슨 대기열</Text>
            {activeQueue.length === 0 && <Text style={styles.empty}>대기열이 비어 있습니다</Text>}
            {activeQueue.map((entry) => (
              <View key={entry.id} style={styles.queueCard}>
                <View style={styles.queueTop}>
                  <Text style={styles.queuePos}>{entry.position}</Text>
                  <View style={styles.queueInfo}>
                    <Text style={styles.queueName}>{entry.userName}</Text>
                    <Text style={styles.queueStatus}>{QUEUE_STATUS_LABEL[entry.status]}</Text>
                    <Text style={styles.queueMeta}>
                      등록 {new Date(entry.joinedAt).toLocaleString('ko-KR')}
                    </Text>
                  </View>
                </View>
                <View style={styles.queueActions}>
                  {entry.status === 'waiting' && (
                    <Button
                      title="다음 차례로"
                      onPress={() => {
                        setNextInQueue(entry.id);
                        recordAdminLogAsActor(adminId, {
                          category: 'lesson',
                          action: 'lesson.queue.next',
                          message: `${entry.userName} 레슨 대기열 → 다음 차례 지정`,
                          targetId: entry.userId,
                          targetName: entry.userName,
                        });
                        showToast({
                          type: 'info',
                          title: '',
                          message: `${entry.userName}님을 다음 차례로 지정했어요.`,
                        });
                      }}
                      size="sm"
                      variant="outline"
                    />
                  )}
                  {entry.status === 'next' && (
                    <Button
                      title="레슨 시작"
                      onPress={() => {
                        startLesson(entry.id);
                        recordAdminLogAsActor(adminId, {
                          category: 'lesson',
                          action: 'lesson.start',
                          message: `${entry.userName} 레슨 시작`,
                          targetId: entry.userId,
                          targetName: entry.userName,
                        });
                        showToast({ type: 'success', title: '', message: '레슨을 시작했어요.' });
                      }}
                      size="sm"
                      variant="secondary"
                    />
                  )}
                  {entry.status === 'active' && (
                    <Button
                      title="레슨 완료"
                      onPress={() => {
                        completeLesson(entry.id);
                        recordAdminLogAsActor(adminId, {
                          category: 'lesson',
                          action: 'lesson.complete',
                          message: `${entry.userName} 레슨 완료`,
                          targetId: entry.userId,
                          targetName: entry.userName,
                        });
                        showToast({
                          type: 'success',
                          title: '',
                          message: '레슨 완료. 다음 순서에 알림을 보냈어요.',
                        });
                      }}
                      size="sm"
                    />
                  )}
                  <Button
                    title="대기열 제거"
                    onPress={() => {
                      const r = adminRemoveFromQueue(entry.id);
                      if (r.success) {
                        recordAdminLogAsActor(adminId, {
                          category: 'lesson',
                          action: 'lesson.queue.remove',
                          message: `${entry.userName} 레슨 대기열 제거`,
                          targetId: entry.userId,
                          targetName: entry.userName,
                        });
                      }
                      showToast({
                        type: r.success ? 'info' : 'warning',
                        title: '',
                        message: r.message,
                      });
                    }}
                    size="sm"
                    variant="danger"
                  />
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      {liveSub === 'courts' && (
        <>
          <View style={styles.statGrid}>
            <StatCard label="빈 코트" value={String(courtStats.empty)} />
            <StatCard label="예약" value={String(courtStats.reserved)} />
            <StatCard label="경기 중" value={String(courtStats.playing)} />
          </View>
          <Card style={styles.block}>
            <Text style={styles.blockTitle}>코트 현황</Text>
            {courts.map((court) => (
              <CourtAdminCard
                key={court.id}
                court={court}
                resolveUser={resolveUser}
                adminId={adminId}
                onForceReturn={
                  court.status !== 'empty' ? () => logCourtReturn(court) : undefined
                }
                onRefundAndReturn={
                  court.status !== 'empty'
                    ? () => {
                        const r = adminRefundAndReturn(court.id);
                        if (r.success) {
                          recordAdminLogAsActor(adminId, {
                            category: 'court',
                            action: 'court.refund_return',
                            message: `코트 ${court.id} 환불 반납`,
                            meta: { courtId: court.id },
                          });
                        }
                        showToast({
                          type: r.success ? 'info' : 'warning',
                          title: '',
                          message: r.message,
                        });
                      }
                    : undefined
                }
                onRemovePlayer={(userId, userName) => {
                  const r = adminRemovePlayer(court.id, userId);
                  if (r.success) {
                    recordAdminLogAsActor(adminId, {
                      category: 'court',
                      action: 'court.remove_player',
                      message: `코트 ${court.id}에서 ${userName}보냄`,
                      targetId: userId,
                      targetName: userName,
                      meta: { courtId: court.id },
                    });
                  }
                  showToast({
                    type: r.success ? 'info' : 'warning',
                    title: '',
                    message: r.message,
                  });
                }}
                onClearJoinRequests={
                  court.joinRequests.length > 0
                    ? () => {
                        const r = adminClearJoinRequests(court.id);
                        if (r.success) {
                          recordAdminLogAsActor(adminId, {
                            category: 'court',
                            action: 'court.clear_join_requests',
                            message: `코트 ${court.id} 합류 신청 전체 삭제`,
                            meta: { courtId: court.id },
                          });
                        }
                        showToast({
                          type: r.success ? 'info' : 'warning',
                          title: '',
                          message: r.message,
                        });
                      }
                    : undefined
                }
              />
            ))}
          </Card>
        </>
      )}
        </View>
      )}

      {group === 'push' && (
        <View style={styles.sectionBody}>
          <AdminPushPanel
            adminId={adminId}
            onToast={(type, message) => showToast({ type, title: '', message })}
          />
        </View>
      )}

      {group === 'points' && (
        <View style={styles.sectionBody}>
          <AdminPointsPanel
            adminId={adminId}
            onToast={(type, message) =>
              showToast({ type, title: '', message })
            }
          />
        </View>
      )}
    </View>
  );
}

function DevToggle({
  label,
  hint,
  value,
  onToggle,
}: {
  label: string;
  hint: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={styles.demoRow}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <View style={styles.demoTextWrap}>
        <Text style={styles.demoLabel}>{label}</Text>
        <Text style={styles.demoHint}>{hint}</Text>
      </View>
      <View style={[styles.demoSwitch, value && styles.demoSwitchOn]}>
        <View style={[styles.demoKnob, value && styles.demoKnobOn]} />
      </View>
    </Pressable>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={[styles.statCard, accent && styles.statCardAccent]}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MemberCard({
  user,
  expanded,
  onToggle,
  actions,
}: {
  user: User;
  expanded: boolean;
  onToggle?: () => void;
  actions?: React.ReactNode;
}) {
  const pointsOn = useFeatureFlagsStore((s) => s.pointsFeaturesEnabled);
  return (
    <Pressable onPress={onToggle} style={styles.itemCard}>
      <View style={styles.itemRow}>
        <Avatar name={user.name} color={user.avatarColor} size={40} />
        <View style={styles.itemBody}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.itemTitle}>{user.name}</Text>
            <RankBadge rank={user.rank} size="sm" />
          </View>
          <Text style={styles.itemSub}>
            {user.studentId} · {MEMBER_STATUS_LABEL[user.memberStatus]}
          </Text>
        </View>
      </View>
      {expanded && (
        <View style={styles.detailBox}>
          <DetailRow label="이메일" value={user.email} />
          <DetailRow label="등급" value={roleBadgeLabel(user)} />
          {isEloFeaturesEnabled() ? <DetailRow label="Elo" value={String(user.elo)} /> : null}
          {pointsOn ? <DetailRow label="포인트" value={`${user.points}P`} /> : null}
          <DetailRow label="전적" value={`${user.wins}승 ${user.losses}패`} />
          <DetailRow label="가입일" value={new Date(user.createdAt).toLocaleDateString('ko-KR')} />
          <DetailRow label="출석(오늘)" value={user.isAtGym ? '체육관' : '미도착'} />
          <DetailRow label="레슨 권한" value={LESSON_STATUS_LABEL[user.lessonStatus ?? 'none']} />
          {(() => {
            const sched = getEffectiveSchedule(user);
            return sched.start ? (
              <DetailRow
                label="오늘 도착"
                value={`${sched.start}${sched.end ? ` ~ ${sched.end}` : ''}`}
              />
            ) : null;
          })()}
          {actions && <View style={styles.itemActions}>{actions}</View>}
        </View>
      )}
    </Pressable>
  );
}

const MATCH_STATUS_LABEL: Record<MatchResult['status'], string> = {
  pending: '확정 대기',
  confirmed: '확정됨',
  cancelled: '제출 취소',
  revoked: '확정 철회',
};

function MatchCard({
  match,
  resolveUser,
  expanded,
  onToggle,
  actions,
}: {
  match: MatchResult;
  resolveUser: (id: string) => User | undefined;
  expanded?: boolean;
  onToggle?: () => void;
  actions?: React.ReactNode;
}) {
  const modeLabel = match.gameMode ? GAME_MODE_CONFIG[match.gameMode].label : '경기';
  const teamANames = match.teamA.map((id) => resolveUser(id)?.name ?? id).join(', ');
  const teamBNames = match.teamB.map((id) => resolveUser(id)?.name ?? id).join(', ');

  return (
    <Pressable onPress={onToggle} style={styles.itemCard}>
      <Text style={styles.itemTitle}>
        코트 {match.courtId} · {modeLabel}
      </Text>
      <Text style={styles.itemSub}>
        {new Date(match.playedAt).toLocaleString('ko-KR')} · {MATCH_STATUS_LABEL[match.status]}
        {match.cancelReason ? ` · ${match.cancelReason}` : ''}
      </Text>
      <Text style={styles.matchScore}>
        A {match.scoreA} : {match.scoreB} B · 승자 Team {match.winner}
      </Text>
      {(expanded || !onToggle) && (
        <View style={styles.detailBox}>
          <DetailRow label="Team A" value={teamANames || '-'} />
          <DetailRow label="Team B" value={teamBNames || '-'} />
          {actions}
        </View>
      )}
    </Pressable>
  );
}

function CourtAdminCard({
  court,
  resolveUser,
  adminId: _adminId,
  onForceReturn,
  onRefundAndReturn,
  onRemovePlayer,
  onClearJoinRequests,
}: {
  court: Court;
  resolveUser: (id: string) => User | undefined;
  adminId: string;
  onForceReturn?: () => void;
  onRefundAndReturn?: () => void;
  onRemovePlayer?: (userId: string, userName: string) => void;
  onClearJoinRequests?: () => void;
}) {
  const statusLabel =
    court.status === 'empty'
      ? '비어있음'
      : court.status === 'reserved'
        ? '예약'
        : court.status === 'playing'
          ? '경기 중'
          : '방금 종료';
  const modeLabel = court.gameMode ? GAME_MODE_CONFIG[court.gameMode].label : '-';
  const host = court.reservedBy ? resolveUser(court.reservedBy) : undefined;

  return (
    <View style={styles.itemCard}>
      <Text style={styles.itemTitle}>
        코트 {court.id}
        {court.isCenter ? ' (센터)' : ''}
        {court.isCoachCourt ? ' · 코치' : ''}
      </Text>
      <Text style={styles.itemSub}>
        {statusLabel} · {modeLabel} · {court.gamesCompleted}/{court.maxGames}게임
      </Text>
      {host && <DetailRow label="예약자" value={`${host.name} (${host.studentId})`} />}
      {court.players.length > 0 && (
        <>
          <DetailRow label="참가" value={court.players.map((p) => p.name).join(', ')} />
          <View style={styles.playerKickRow}>
            {court.players.map((p) => (
              <Button
                key={p.userId}
                title={`${p.name}보내기`}
                onPress={() => onRemovePlayer?.(p.userId, p.name)}
                size="sm"
                variant="outline"
              />
            ))}
          </View>
        </>
      )}
      {court.joinRequests.length > 0 && (
        <DetailRow label="합류 대기" value={court.joinRequests.map((r) => r.userName).join(', ')} />
      )}
      <View style={styles.waitQueueBox}>
        <Text style={styles.waitQueueTitle}>
          대기열 {court.waitQueue?.length ? `(${court.waitQueue.length})` : ''}
        </Text>
        {(!court.waitQueue || court.waitQueue.length === 0) ? (
          <Text style={styles.waitQueueEmpty}>대기자 없음 · 예약/경기 중 코트가 반납되면 대기자에게 알림</Text>
        ) : (
          court.waitQueue.map((w, i) => (
            <Text key={`${w.userId}-${i}`} style={styles.waitQueueItem}>
              {i + 1}. {w.userName}
            </Text>
          ))
        )}
      </View>
      {(onForceReturn || onRefundAndReturn || onClearJoinRequests) && (
        <View style={styles.itemActions}>
          {onRefundAndReturn && (
            <Button title="환불 반납" onPress={onRefundAndReturn} size="sm" variant="secondary" />
          )}
          {onForceReturn && (
            <Button title="강제 반납" onPress={onForceReturn} size="sm" variant="danger" />
          )}
          {onClearJoinRequests && (
            <Button
              title="합류 신청 삭제"
              onPress={onClearJoinRequests}
              size="sm"
              variant="outline"
            />
          )}
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
  tabBar: { marginBottom: spacing.md, flexGrow: 0 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceAlt,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  tabActive: { backgroundColor: colors.primaryLight },
  tabLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  tabLabelActive: { color: colors.primary, fontWeight: '800' },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  sectionBody: { gap: spacing.md, paddingBottom: spacing.xxl },
  dateHeading: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: {
    // 고정 3열 — 좁은 화면에서도 세로로 무너지지 않고 글자만 작아지도록 minWidth 제거
    width: '31.5%',
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    alignItems: 'center',
  },
  statCardAccent: { backgroundColor: colors.primaryLight },
  statValue: { ...typography.h3, color: colors.text, fontSize: 20 },
  statValueAccent: { color: colors.primary },
  statLabel: { ...typography.small, color: colors.textMuted, fontSize: 10, textAlign: 'center' },
  hintCard: { gap: spacing.xs },
  hintTitle: { ...typography.bodyBold, color: colors.text },
  hintText: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
  block: { gap: spacing.sm },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  blockTitle: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.xs },
  linkText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  demoTextWrap: { flex: 1, gap: 4 },
  demoLabel: { ...typography.bodyBold, color: colors.text },
  demoHint: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
  demoSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 3,
    justifyContent: 'center',
  },
  demoSwitchOn: { backgroundColor: colors.primary },
  demoKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
  },
  demoKnobOn: { alignSelf: 'flex-end' },
  devDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  empty: { ...typography.caption, color: colors.textMuted, paddingVertical: spacing.md },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    paddingRight: spacing.xs,
  },
  alertBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  alertText: { flex: 1, gap: 2 },
  alertDismiss: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  itemCard: {
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    gap: 4,
  },
  waitQueueBox: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: '#F7F8FA',
    gap: 2,
  },
  waitQueueTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    fontSize: 12,
  },
  waitQueueEmpty: {
    ...typography.small,
    color: colors.textMuted,
    lineHeight: 16,
  },
  waitQueueItem: {
    ...typography.small,
    color: colors.text,
    lineHeight: 18,
  },
  itemRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  itemBody: { flex: 1, gap: 2 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemTitle: { ...typography.bodyBold, color: colors.text },
  itemSub: { ...typography.caption, color: colors.textMuted },
  matchScore: { ...typography.body, color: colors.textSecondary, marginTop: 2 },
  detailBox: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: 4,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  detailLabel: { ...typography.small, color: colors.textMuted, flex: 1 },
  detailValue: { ...typography.small, color: colors.text, fontWeight: '600', flex: 2, textAlign: 'right' },
  itemActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  playerKickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 4 },
  actionStack: { gap: spacing.sm, marginTop: spacing.xs },
  queueCard: {
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  queueTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  queuePos: { ...typography.h2, color: colors.primary, width: 36 },
  queueInfo: { flex: 1 },
  queueName: { ...typography.bodyBold, color: colors.text },
  queueStatus: { ...typography.caption, color: colors.textMuted },
  queueMeta: { ...typography.small, color: colors.textMuted, fontSize: 11 },
  queueActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rankNum: { ...typography.bodyBold, color: colors.primary, width: 20 },
  pointValue: { ...typography.bodyBold, color: colors.primary },
  positive: { color: colors.success },
  negative: { color: colors.error },
});
