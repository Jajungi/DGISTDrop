import { isOwnerStudentId } from '@/src/constants/roles';
import type { User } from '@/src/types';

/** 관리자 플래그 — 승인 여부와 무관 (배지·토글 상태) */
export function hasAdminRole(user: User | null | undefined): boolean {
  if (!user) return false;
  return !!user.isAdmin || user.membershipTier === 'admin' || hasOperatorRole(user);
}

/** 운영자 플래그 — 승인 여부와 무관. 고정 학번도 포함 */
export function hasOperatorRole(user: User | null | undefined): boolean {
  if (!user) return false;
  return !!user.isOperator || isOwnerStudentId(user.studentId);
}

/** 관리자 역할 — 승인된 계정만 운영 권한 */
export function isAdminUser(user: User | null | undefined): boolean {
  return hasAdminRole(user) && user?.memberStatus === 'approved';
}

/** 운영자 — 승인된 최상위 권한 */
export function isOperatorUser(user: User | null | undefined): boolean {
  return hasOperatorRole(user) && user?.memberStatus === 'approved';
}

export function isOwnerUser(user: User | null | undefined): boolean {
  return !!user && isOwnerStudentId(user.studentId);
}

/** 관리자 또는 운영자 — 일상 운영 권한 */
export function isStaffUser(user: User | null | undefined): boolean {
  return isAdminUser(user) || isOperatorUser(user);
}

/** 화면용: 운영자 > 관리자 > 정회원/준회원/게스트. 비회원은 게스트만 */
export function roleBadgeLabel(user: User | null | undefined): string {
  if (!user) return '게스트';
  if (hasOperatorRole(user)) return '운영자';
  if (hasAdminRole(user)) return '관리자';
  if (user.membershipTier === 'guest') return '게스트';
  if (user.membershipTier === 'associate') return '준회원';
  if (user.membershipTier === 'full' || user.membershipTier === 'admin') return '정회원';
  if (user.memberStatus === 'pending') return '가입 대기';
  return '게스트';
}

/** 회비 등급만 (역할과 무관) */
export function clubGradeOf(user: User | null | undefined): 'guest' | 'associate' | 'full' {
  if (!user || user.membershipTier === 'guest') return 'guest';
  if (user.membershipTier === 'associate') return 'associate';
  return 'full';
}

export function clubGradeLabel(grade: 'guest' | 'associate' | 'full'): string {
  if (grade === 'full') return '정회원';
  if (grade === 'associate') return '준회원';
  return '게스트';
}
