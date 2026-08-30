export type MembershipTier = 'guest' | 'associate' | 'full' | 'admin';
export type MemberStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

/** 레슨 이용 권한 — 회원 승인과 동일한 pending/approved/rejected 흐름 */
export type LessonAccessStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';

export type CourtStatus = 'empty' | 'reserved' | 'playing' | 'just_finished';

/**
 * 난타(친선·반코트 연습) / 경기(casual).
 * 'ranked'는 '경기'로 통합되어 더 이상 새로 생성되지 않지만, 과거 데이터 호환을 위해 유지.
 * 경기 점수를 입력하면 Elo가 변동하고, 입력하지 않으면 친선경기로 유지됨.
 */
export type GameMode = 'nanta' | 'casual' | 'ranked';

/** 난타 시 사용 구역 — 네트 가로 기준 상·하 반 (전체 폭, 네트 중심) */
export type NantaHalf = 'near' | 'far';

export interface User {
  id: string;
  studentId: string;
  name: string;
  nickname: string;
  signupComplete?: boolean;
  membershipTier: MembershipTier;
  memberStatus: MemberStatus;
  /** 관리자 역할. 정회원/준회원과 별개 */
  isAdmin?: boolean;
  /** 오늘 참석 의사 going | not_going */
  attendanceIntent?: 'going' | 'not_going' | null;
  attendanceIntentDate?: string;
  rank: RankTier;
  elo: number;
  points: number;
  wins: number;
  losses: number;
  totalGames: number;
  cleaningContributions: number;
  peakTimeReservations: number;
  isAtGym: boolean;
  /** 오늘 도착 일정이 적용되는 날 (YYYY-MM-DD) */
  scheduleDate?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  lessonStatus: LessonAccessStatus;
  lessonRequestedAt?: string;
  /** 코치 공지 작성 권한 (운영진이 부여) */
  isCoach?: boolean;
  /** 운영자 — 일상 운영 권한 (관리자만 개발자/관리자 승격) */
  isOperator?: boolean;
  avatarColor: string;
  avatarUri?: string;
  createdAt: string;
  /** 운영진 내부 메모 (회원에게 비공개) */
  adminNote?: string;
  /** 동아리비 납부 인증 시각 */
  clubFeeVerifiedAt?: string;
  clubFeeVerifiedBy?: string;
  /** 정지 사유 · 시각 */
  suspendedReason?: string;
  suspendedAt?: string;
}

export interface CourtPlayer {
  userId: string;
  name: string;
  nickname: string;
  rank: RankTier;
  avatarColor: string;
}

export interface Court {
  id: number;
  name: string;
  isCenter: boolean;
  isCoachCourt: boolean;
  status: CourtStatus;
  players: CourtPlayer[];
  gamesCompleted: number;
  maxGames: number;
  reservedBy?: string;
  reservedAt?: string;
  startedAt?: string;
  /** just_finished 전환 시각 — 자동 반납 타이머용 */
  finishedAt?: string;
  joinRequests: JoinRequest[];
  /** 예약·경기 중 다음 이용 대기열 */
  waitQueue: CourtWaitEntry[];
  /** 예약·경기 유형 (empty면 없음) */
  gameMode?: GameMode;
  /** 난타일 때만 — 어느 반코트를 쓰는지 */
  nantaHalf?: NantaHalf;
}

export interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  rank: RankTier;
  requestedAt: string;
}

/** 코트 사용 중일 때 다음 차례 대기 */
export interface CourtWaitEntry {
  id: string;
  userId: string;
  userName: string;
  joinedAt: string;
}

/** 화면 위 오버레이 공지 노출 위치 */
export type SiteOverlaySurface = 'login' | 'post_login' | 'home';

export interface SiteOverlay {
  id: string;
  title: string;
  body: string;
  /** 로그인 창 / 로그인 직후 / 홈 진입 */
  surfaces: SiteOverlaySurface[];
  active: boolean;
  dismissible: boolean;
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** 휴관 · 특강 등 정기 활동 외 일정 */
export type ClubEventKind = 'closure' | 'special' | 'extra';

export interface ClubEvent {
  id: string;
  kind: ClubEventKind;
  title: string;
  body?: string;
  /** YYYY-MM-DD (로컬) */
  dateStart: string;
  /** YYYY-MM-DD inclusive */
  dateEnd: string;
  active: boolean;
  /**
   * 홈 등 ClubEventBanner 노출. undefined/true = 표시, false = 일정만(활동 규칙) 적용.
   */
  showBanner?: boolean;
  /**
   * 휴관·추가 활동일: 등록 직후가 아니라 해당일 KST 시각에 푸시.
   * 휴관은 time 사용, 추가 활동일은 활동 자동 알림 시각(notify_time)을 따름.
   * enabled=false 또는 없으면 푸시 없음.
   */
  pushNotify?: {
    enabled: boolean;
    /** HH:MM (KST) — 휴관 예약 시각 / 추가 활동일은 표시용 스냅샷 */
    time: string;
    /** 이미 발송한 날짜 YYYY-MM-DD */
    sentDates?: string[];
  };
}

export interface TeamRoom {
  id: string;
  hostId: string;
  hostName: string;
  title: string;
  minRank?: RankTier;
  maxRank?: RankTier;
  members: TeamMember[];
  minMembers: number;
  maxMembers: number;
  status: 'open' | 'ready' | 'reserved' | 'closed';
  createdAt: string;
  isHot?: boolean;
  /** 설정 시 참여 시 비밀번호 필요 (목록 조회 시에는 hasPassword만 노출) */
  password?: string;
  hasPassword?: boolean;
  /** 참가 승인 대기 */
  joinRequests: TeamRoomJoinRequest[];
}

export interface TeamRoomJoinRequest {
  id: string;
  userId: string;
  name: string;
  rank: RankTier;
  avatarColor: string;
  requestedAt: string;
}

export interface TeamMember {
  userId: string;
  name: string;
  rank: RankTier;
  avatarColor: string;
}

/** 모집방 자동 종료 정책 (관리자 설정) */
export type LobbyExpiryMode = 'hours' | 'end_of_day' | 'never';

export interface LobbyExpiryConfig {
  mode: LobbyExpiryMode;
  /** mode === 'hours' 일 때 생성 후 N시간 */
  hours: number;
}

export interface MatchResult {
  id: string;
  courtId: number;
  teamA: string[];
  teamB: string[];
  scoreA: number;
  scoreB: number;
  winner: 'A' | 'B';
  status: 'pending' | 'confirmed' | 'cancelled' | 'revoked';
  playedAt: string;
  confirmedBy?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  /** 확정 시 적용된 Elo 변동 (철회용) */
  eloChanges?: Record<string, number>;
  gameMode?: GameMode;
}

/** 친구 신청 */
export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  status: FriendRequestStatus;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  checkedInAt: string;
}

export interface CleaningSubmission {
  id: string;
  userId: string;
  userName: string;
  kind?: 'cleaning' | 'net_setup';
  area: string;
  participantCount: number;
  photoUri?: string;
  submittedAt: string;
  points: number;
  revokedAt?: string;
  revokedBy?: string;
}

export interface LessonQueueEntry {
  id: string;
  userId: string;
  userName: string;
  position: number;
  status: 'waiting' | 'next' | 'active' | 'done';
  joinedAt: string;
}

/** 레슨 참여 권한 신청 (입금 확인 후 관리자 승인) */
export type LessonApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface LessonApplication {
  id: string;
  userId: string;
  userName: string;
  studentId: string;
  status: LessonApplicationStatus;
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface EloHistoryPoint {
  date: string;
  elo: number;
  change: number;
}

export interface ActivitySession {
  /** 0=일 … 6=토 (Date.getDay) */
  day: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export type PointTransactionType =
  | 'check_in'
  | 'court_reserve'
  | 'match_win'
  | 'match_loss'
  | 'cleaning'
  | 'net_setup'
  | 'club_fee'
  | 'shuttlecock'
  | 'welcome'
  | 'bonus'
  | 'admin';

export interface PointTransaction {
  id: string;
  userId: string;
  /** 양수 = 적립, 음수 = 사용 */
  amount: number;
  type: PointTransactionType;
  description: string;
  createdAt: string;
  meta?: {
    courtId?: number;
    matchId?: string;
    reversalOfId?: string;
  };
  revokedAt?: string;
  revokedBy?: string;
  revokeReason?: string;
}

export interface SirenAlert {
  visible: boolean;
  title: string;
  message: string;
}

export type AppNotificationType = 'join' | 'coach' | 'system' | 'friend';

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  courtId?: number;
  /** 합류 요청 원탭 수락용 */
  joinRequestId?: string;
  /** 모집방 참가 신청 / 초대 */
  roomId?: string;
  /** 수신 대상 (없으면 브로드캐스트 — 레거시) */
  targetUserId?: string;
}

export type AdminLogCategory =
  | 'member'
  | 'lesson'
  | 'match'
  | 'court'
  | 'attendance'
  | 'social'
  | 'point'
  | 'system';

export interface AdminLogEntry {
  id: string;
  category: AdminLogCategory;
  action: string;
  message: string;
  actorId?: string;
  actorName?: string;
  targetId?: string;
  targetName?: string;
  createdAt: string;
  meta?: Record<string, string | number>;
}

export interface CoachAnnouncement {
  id: string;
  title: string;
  message: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  pinned?: boolean;
}
