import type { User } from '@/src/types';
import { AVATAR_COLORS } from '@/src/constants';

/** 게스트(임시) 계정 여부 */
export function isGuestUser(user: User | null | undefined): boolean {
  return user?.membershipTier === 'guest';
}

/** 코트 예약·방 입장 등 게스트 허용 기능 */
export function canGuestUseBasicFeatures(user: User | null | undefined): boolean {
  return Boolean(user && isGuestUser(user) && user.memberStatus === 'approved');
}

/** 포인트·친구·랭크·프로필 등 정회원 전용 */
export function canAccessMemberFeatures(user: User | null | undefined): boolean {
  if (!user) return false;
  if (isGuestUser(user)) return false;
  return user.memberStatus === 'approved';
}

export function guestBlockedMessage(feature: string): string {
  return `게스트는 ${feature} 기능을 사용할 수 없어요. 회원가입 후 이용해 주세요.`;
}

export function validateGuestName(name: string): { ok: boolean; message?: string } {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { ok: false, message: '이름은 2자 이상 입력해 주세요.' };
  }
  if (trimmed.length > 12) {
    return { ok: false, message: '이름은 12자 이하로 입력해 주세요.' };
  }
  if (!/^[\p{L}\p{N}\s._-]+$/u.test(trimmed)) {
    return { ok: false, message: '이름에 사용할 수 없는 문자가 있어요.' };
  }
  return { ok: true };
}

/** 로컬(비-Supabase) 게스트 유저 생성 */
export function createLocalGuestUser(name: string, colorIndex: number): User {
  const trimmed = name.trim();
  const id = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const shortId = id.slice(-6).toUpperCase();
  return {
    id,
    studentId: `GUEST-${shortId}`,
    name: trimmed,
    nickname: trimmed,
    signupComplete: true,
    membershipTier: 'guest',
    memberStatus: 'approved',
    rank: 'bronze',
    elo: 1000,
    points: 0,
    wins: 0,
    losses: 0,
    totalGames: 0,
    cleaningContributions: 0,
    peakTimeReservations: 0,
    isAtGym: false,
    lessonStatus: 'none',
    avatarColor: AVATAR_COLORS[colorIndex % AVATAR_COLORS.length],
    createdAt: new Date().toISOString(),
  };
}
