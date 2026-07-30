import type { User } from '@/src/types';
import { isStaffUser } from '@/src/utils/staffAccess';

/** 코치 공지 작성·삭제 권한 (운영진 또는 코치 권한 부여 회원) */
export function canPostCoachAnnouncement(user: User | null | undefined): boolean {
  if (!user) return false;
  if (isStaffUser(user)) return true;
  return Boolean(user.isCoach);
}

export function canManageCoachAnnouncement(
  user: User | null | undefined,
  announcementAuthorId?: string
): boolean {
  if (!user) return false;
  if (isStaffUser(user)) return true;
  if (!user.isCoach) return false;
  return !announcementAuthorId || announcementAuthorId === user.id;
}
