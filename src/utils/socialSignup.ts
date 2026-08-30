import type { User } from '@/src/types';

/** 소셜 OAuth 직후 DB에 생기는 임시 학번 (가입 미완료) */
export function isPendingSocialStudentId(studentId: string): boolean {
  return studentId.startsWith('pending-');
}

/** OAuth로 생긴 미완성 프로필(pending 학번 등) */
export function isIncompleteSocialSignup(
  user: Pick<User, 'studentId' | 'signupComplete'> | null | undefined
): boolean {
  if (!user) return false;
  if (isPendingSocialStudentId(user.studentId)) return true;
  return user.signupComplete === false;
}

/** 정식 회원으로 앱 이용 가능 */
export function isAppReadyMember(
  user: Pick<User, 'studentId' | 'signupComplete' | 'memberStatus'> | null | undefined
): boolean {
  if (!user) return false;
  if (isIncompleteSocialSignup(user)) return false;
  return true;
}
