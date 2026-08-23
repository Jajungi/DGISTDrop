/** 최상위 운영자 학번 — 등급 변경으로 운영자 권한이 빠지지 않음 */
export const OWNER_STUDENT_ID = '202662024';

export function isOwnerStudentId(studentId: string | undefined | null): boolean {
  return studentId === OWNER_STUDENT_ID;
}
