import { AVATAR_COLORS } from '@/src/constants';
import type {
  AttendanceRecord,
  CleaningSubmission,
  Court,
  EloHistoryPoint,
  LessonQueueEntry,
  LessonApplication,
  MatchResult,
  PointTransaction,
  TeamRoom,
  User,
  CoachAnnouncement,
} from '@/src/types';
import { createEmptyCourts } from './courtService';

function pickAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

const MOCK_TODAY = new Date().toISOString().slice(0, 10);

export const MOCK_USERS: User[] = [
  {
    id: 'user-1',
    studentId: '20240001',
    name: '김민준',
    nickname: '김민준',
    email: 'minjun@dgist.ac.kr',
    membershipTier: 'full',
    memberStatus: 'approved',
    rank: 'gold',
    elo: 1285,
    points: 120,
    wins: 45,
    losses: 32,
    totalGames: 77,
    cleaningContributions: 8,
    peakTimeReservations: 1,
    isAtGym: true,
    scheduleDate: MOCK_TODAY,
    scheduledStart: '18:30',
    scheduledEnd: '21:00',
    lessonStatus: 'none',
    avatarColor: pickAvatarColor(0),
    createdAt: '2024-03-01',
  },
  {
    id: 'user-2',
    studentId: '20240002',
    name: '이서연',
    nickname: '이서연',
    email: 'seoyeon@dgist.ac.kr',
    membershipTier: 'full',
    memberStatus: 'approved',
    rank: 'platinum',
    elo: 1450,
    points: 95,
    wins: 62,
    losses: 28,
    totalGames: 90,
    cleaningContributions: 12,
    peakTimeReservations: 0,
    isAtGym: true,
    scheduleDate: MOCK_TODAY,
    scheduledStart: '19:00',
    scheduledEnd: '21:30',
    lessonStatus: 'pending',
    lessonRequestedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    avatarColor: pickAvatarColor(1),
    createdAt: '2024-03-01',
  },
  {
    id: 'user-3',
    studentId: '20240003',
    name: '박지호',
    nickname: '박지호',
    email: 'jiho@dgist.ac.kr',
    membershipTier: 'associate',
    memberStatus: 'approved',
    rank: 'silver',
    elo: 1100,
    points: 80,
    wins: 20,
    losses: 25,
    totalGames: 45,
    cleaningContributions: 3,
    peakTimeReservations: 0,
    isAtGym: false,
    scheduleDate: MOCK_TODAY,
    scheduledStart: '18:30',
    scheduledEnd: '20:30',
    lessonStatus: 'approved',
    avatarColor: pickAvatarColor(2),
    createdAt: '2024-09-01',
  },
  {
    id: 'user-4',
    studentId: '20240004',
    name: '최유나',
    nickname: '최유나',
    email: 'yuna@dgist.ac.kr',
    membershipTier: 'associate',
    memberStatus: 'approved',
    rank: 'bronze',
    elo: 980,
    points: 65,
    wins: 12,
    losses: 18,
    totalGames: 30,
    cleaningContributions: 5,
    peakTimeReservations: 0,
    isAtGym: true,
    scheduleDate: MOCK_TODAY,
    scheduledStart: '19:30',
    scheduledEnd: '21:50',
    lessonStatus: 'approved',
    avatarColor: pickAvatarColor(3),
    createdAt: '2024-09-01',
  },
  {
    id: 'user-5',
    studentId: '20240005',
    name: '정태양',
    nickname: '정태양',
    email: 'taeyang@dgist.ac.kr',
    membershipTier: 'full',
    memberStatus: 'approved',
    rank: 'diamond',
    elo: 1650,
    points: 150,
    wins: 88,
    losses: 35,
    totalGames: 123,
    cleaningContributions: 15,
    peakTimeReservations: 1,
    isAtGym: true,
    scheduleDate: MOCK_TODAY,
    scheduledStart: '18:30',
    scheduledEnd: '21:50',
    lessonStatus: 'none',
    avatarColor: pickAvatarColor(4),
    createdAt: '2023-03-01',
  },
  {
    id: 'admin-1',
    studentId: '20230001',
    name: '관리자',
    nickname: '관리자',
    email: 'admin@dgist.ac.kr',
    membershipTier: 'admin',
    memberStatus: 'approved',
    rank: 'master',
    elo: 1850,
    points: 200,
    wins: 100,
    losses: 20,
    totalGames: 120,
    cleaningContributions: 20,
    peakTimeReservations: 0,
    isAtGym: true,
    lessonStatus: 'approved',
    avatarColor: pickAvatarColor(5),
    createdAt: '2023-03-01',
  },
  {
    id: 'user-pending',
    studentId: '20250099',
    name: '한지우',
    nickname: '한지우',
    email: 'jiwoo@dgist.ac.kr',
    membershipTier: 'associate',
    memberStatus: 'pending',
    rank: 'bronze',
    elo: 1000,
    points: 50,
    wins: 0,
    losses: 0,
    totalGames: 0,
    cleaningContributions: 0,
    peakTimeReservations: 0,
    isAtGym: false,
    lessonStatus: 'none',
    avatarColor: pickAvatarColor(6),
    createdAt: '2025-09-01',
  },
];

export function createMockCourts(): Court[] {
  const courts = createEmptyCourts();

  courts[0] = {
    ...courts[0],
    status: 'playing',
    gameMode: 'casual',
    maxGames: 3,
    players: [
      { userId: 'user-1', name: '김민준', nickname: '김민준', rank: 'gold', avatarColor: pickAvatarColor(0) },
      { userId: 'user-2', name: '이서연', nickname: '이서연', rank: 'platinum', avatarColor: pickAvatarColor(1) },
      { userId: 'user-3', name: '박지호', nickname: '박지호', rank: 'silver', avatarColor: pickAvatarColor(2) },
    ],
    gamesCompleted: 2,
    startedAt: new Date().toISOString(),
  };

  courts[2] = {
    ...courts[2],
    status: 'playing',
    gameMode: 'nanta',
    nantaHalf: 'near',
    maxGames: 2,
    players: [
      { userId: 'user-4', name: '최유나', nickname: '최유나', rank: 'bronze', avatarColor: pickAvatarColor(3) },
    ],
    gamesCompleted: 1,
    startedAt: new Date().toISOString(),
  };

  courts[3] = {
    ...courts[3],
    status: 'playing',
    gameMode: 'casual',
    maxGames: 4,
    players: [
      { userId: 'user-5', name: '정태양', nickname: '정태양', rank: 'diamond', avatarColor: pickAvatarColor(4) },
      { userId: 'admin-1', name: '관리자', nickname: '관리자', rank: 'master', avatarColor: pickAvatarColor(5) },
    ],
    gamesCompleted: 3,
    startedAt: new Date().toISOString(),
  };

  courts[4] = {
    ...courts[4],
    status: 'reserved',
    gameMode: 'nanta',
    nantaHalf: 'far',
    maxGames: 3,
    reservedBy: 'user-2',
    reservedAt: new Date().toISOString(),
    players: [
      { userId: 'user-2', name: '이서연', nickname: '이서연', rank: 'platinum', avatarColor: pickAvatarColor(1) },
    ],
  };

  courts[6] = {
    ...courts[6],
    status: 'empty',
    gameMode: undefined,
    nantaHalf: undefined,
    maxGames: 0,
    players: [],
    gamesCompleted: 0,
  };

  courts[7] = {
    ...courts[7],
    status: 'just_finished',
    gameMode: 'casual',
    maxGames: 5,
    players: [],
    gamesCompleted: 5,
  };

  return courts;
}

export const MOCK_TEAM_ROOMS: TeamRoom[] = [
  {
    id: 'room-1',
    hostId: 'user-3',
    hostName: '박지호',
    title: '골드 이상 같이 치실 분!',
    minRank: 'gold',
    members: [
      { userId: 'user-3', name: '박지호', rank: 'silver', avatarColor: pickAvatarColor(2) },
    ],
    minMembers: 2,
    maxMembers: 4,
    status: 'open',
    createdAt: new Date().toISOString(),
    isHot: true,
    password: '1234',
    hasPassword: true,
    joinRequests: [],
  },
  {
    id: 'room-2',
    hostId: 'user-4',
    hostName: '최유나',
    title: '초보 환영! 편하게 같이 쳐요',
    maxRank: 'silver',
    members: [
      { userId: 'user-4', name: '최유나', rank: 'bronze', avatarColor: pickAvatarColor(3) },
      { userId: 'user-1', name: '김민준', rank: 'gold', avatarColor: pickAvatarColor(0) },
    ],
    minMembers: 2,
    maxMembers: 4,
    status: 'ready',
    createdAt: new Date().toISOString(),
    joinRequests: [],
  },
  {
    id: 'room-3',
    hostId: 'user-5',
    hostName: '정태양',
    title: '실력 비슷한 분 모집',
    minRank: 'platinum',
    maxRank: 'diamond',
    members: [
      { userId: 'user-5', name: '정태양', rank: 'diamond', avatarColor: pickAvatarColor(4) },
      { userId: 'user-2', name: '이서연', rank: 'platinum', avatarColor: pickAvatarColor(1) },
      { userId: 'user-1', name: '김민준', rank: 'gold', avatarColor: pickAvatarColor(0) },
    ],
    minMembers: 2,
    maxMembers: 4,
    status: 'open',
    createdAt: new Date().toISOString(),
    isHot: true,
    joinRequests: [],
  },
];

export const MOCK_ELO_HISTORY: EloHistoryPoint[] = [
  { date: '06/01', elo: 1200, change: 0 },
  { date: '06/08', elo: 1220, change: 20 },
  { date: '06/15', elo: 1210, change: -10 },
  { date: '06/22', elo: 1240, change: 30 },
  { date: '06/29', elo: 1260, change: 20 },
  { date: '07/06', elo: 1285, change: 25 },
];

export const MOCK_MATCH_RESULTS: MatchResult[] = [
  {
    id: 'match-1',
    courtId: 1,
    teamA: ['user-1', 'user-2'],
    teamB: ['user-3', 'user-4'],
    scoreA: 21,
    scoreB: 18,
    winner: 'A',
    status: 'confirmed',
    playedAt: '2026-07-01T19:15:00.000Z',
  },
  {
    id: 'match-2',
    courtId: 4,
    teamA: ['user-5', 'user-1'],
    teamB: ['user-2', 'user-3'],
    scoreA: 19,
    scoreB: 21,
    winner: 'B',
    status: 'confirmed',
    playedAt: '2026-06-24T20:00:00.000Z',
  },
  {
    id: 'match-3',
    courtId: 2,
    teamA: ['user-1', 'user-4'],
    teamB: ['user-5', 'user-2'],
    scoreA: 21,
    scoreB: 15,
    winner: 'A',
    status: 'confirmed',
    playedAt: '2026-06-17T18:45:00.000Z',
  },
  {
    id: 'match-4',
    courtId: 7,
    teamA: ['user-3', 'user-1'],
    teamB: ['user-4', 'user-5'],
    scoreA: 18,
    scoreB: 21,
    winner: 'B',
    status: 'confirmed',
    playedAt: '2026-06-10T19:30:00.000Z',
  },
  {
    id: 'match-5',
    courtId: 3,
    teamA: ['user-1', 'user-2'],
    teamB: ['user-3', 'user-4'],
    scoreA: 21,
    scoreB: 19,
    winner: 'A',
    status: 'pending',
    playedAt: new Date().toISOString(),
  },
];

export const MOCK_CLEANING_LEADERBOARD: CleaningSubmission[] = [
  { id: 'c1', userId: 'user-5', userName: '정태양', area: '코트 4-6 구역', participantCount: 2, submittedAt: '2026-07-01', points: 18 },
  { id: 'c2', userId: 'user-2', userName: '이서연', area: '셔틀콕 수거', participantCount: 1, submittedAt: '2026-07-03', points: 18 },
  { id: 'c3', userId: 'user-1', userName: '김민준', area: '코트 1-3 구역', participantCount: 3, submittedAt: '2026-07-04', points: 18 },
  { id: 'c4', userId: 'user-4', userName: '최유나', area: '탈의실 정리', participantCount: 2, submittedAt: '2026-07-05', points: 15 },
  { id: 'c5', userId: 'user-3', userName: '박지호', area: '라켓/물품 정리', participantCount: 1, submittedAt: '2026-07-06', points: 15 },
];

export const MOCK_LESSON_QUEUE: LessonQueueEntry[] = [
  {
    id: 'lq-1',
    userId: 'user-4',
    userName: '최유나',
    position: 1,
    status: 'next',
    joinedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
  {
    id: 'lq-2',
    userId: 'user-3',
    userName: '박지호',
    position: 2,
    status: 'waiting',
    joinedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
];

export const MOCK_COACH_ANNOUNCEMENTS: CoachAnnouncement[] = [
  {
    id: 'ca-seed-1',
    title: '오늘 레슨 안내',
    message:
      '18:30부터 코치 코트(3번)에서 그룹 레슨을 진행합니다. 차례가 되면 사이렌 알림 후 5분 안에 코트로 와 주세요. 셔틀콕은 직접 준비해 주세요.',
    authorId: 'user-6',
    authorName: '관리자',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    pinned: true,
  },
  {
    id: 'ca-seed-2',
    title: '기본기 클리닉 — 목요일',
    message: '초·중급 대상 클리닉은 목요일 19:00~20:00입니다. 레슨 권한 승인 후 대기열 등록해 주세요.',
    authorId: 'user-6',
    authorName: '관리자',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  },
];

/** 레슨 참여 권한 신청 (입금 확인 전 pending) */
export const MOCK_LESSON_APPLICATIONS: LessonApplication[] = [
  {
    id: 'la-1',
    userId: 'user-4',
    userName: '최유나',
    studentId: '20240004',
    status: 'approved',
    requestedAt: '2026-07-01T10:00:00.000Z',
    reviewedAt: '2026-07-02T11:00:00.000Z',
    reviewedBy: 'admin-1',
  },
  {
    id: 'la-2',
    userId: 'user-3',
    userName: '박지호',
    studentId: '20240003',
    status: 'approved',
    requestedAt: '2026-07-03T09:00:00.000Z',
    reviewedAt: '2026-07-03T14:00:00.000Z',
    reviewedBy: 'admin-1',
  },
  {
    id: 'la-3',
    userId: 'user-2',
    userName: '이서연',
    studentId: '20240002',
    status: 'pending',
    requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

/** 오늘 출석한 동아리원 (친구 화면 · 데모) */
export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  { id: 'att-demo-1', userId: 'user-1', date: todayIsoDate(), checkedInAt: new Date().toISOString() },
  { id: 'att-demo-2', userId: 'user-5', date: todayIsoDate(), checkedInAt: new Date().toISOString() },
  { id: 'att-demo-3', userId: 'user-2', date: todayIsoDate(), checkedInAt: new Date().toISOString() },
];

/** 포인트 거래 내역 (데모) */
export const MOCK_POINT_TRANSACTIONS: PointTransaction[] = [
  {
    id: 'pt-1',
    userId: 'user-1',
    amount: 120,
    type: 'check_in',
    description: '체육관 출석 인증',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'pt-2',
    userId: 'user-1',
    amount: -15,
    type: 'court_reserve',
    description: '2번 코트 예약 · 일반 2게임',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    meta: { courtId: 2 },
  },
  {
    id: 'pt-3',
    userId: 'user-1',
    amount: 12,
    type: 'match_win',
    description: '경기 승리',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    meta: { matchId: 'match-3' },
  },
  {
    id: 'pt-4',
    userId: 'user-1',
    amount: 18,
    type: 'cleaning',
    description: '청소 인증 · 코트 1-3 구역',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: 'pt-5',
    userId: 'user-1',
    amount: -25,
    type: 'court_reserve',
    description: '5번 코트 예약 · 난타 3게임 (피크)',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    meta: { courtId: 5 },
  },
  {
    id: 'pt-6',
    userId: 'user-1',
    amount: 500,
    type: 'welcome',
    description: '신입 부원 웰컴 리워드',
    createdAt: '2024-03-01T10:00:00.000Z',
  },
  {
    id: 'pt-7',
    userId: 'user-2',
    amount: 120,
    type: 'check_in',
    description: '체육관 출석 인증',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'pt-8',
    userId: 'user-2',
    amount: -13,
    type: 'court_reserve',
    description: '1번 코트 예약 · 랭크 3게임',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    meta: { courtId: 1 },
  },
];

export const CURRENT_USER_ID = 'user-1';
