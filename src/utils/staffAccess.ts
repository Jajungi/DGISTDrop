import type { User } from '@/src/types';

/** 관리자(서버 주인) — membership_tier = admin */
export function isAdminUser(user: User | null | undefined): boolean {
  return !!user && user.membershipTier === 'admin' && user.memberStatus === 'approved';
}

/** 운영자 — is_operator 플래그 (관리자와 별개) */
export function isOperatorUser(user: User | null | undefined): boolean {
  return !!user && !!user.isOperator && user.memberStatus === 'approved';
}

/** 관리자 또는 운영자 — 일상 운영 권한 */
export function isStaffUser(user: User | null | undefined): boolean {
  return isAdminUser(user) || isOperatorUser(user);
}
