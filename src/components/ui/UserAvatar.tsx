import React from 'react';
import { Avatar } from '@/src/components/ui/Avatar';
import { useAuthStore } from '@/src/stores/authStore';

interface UserAvatarProps {
  userId?: string;
  name: string;
  color: string;
  imageUri?: string | null;
  size?: number;
  showOnline?: boolean;
}

/** 회원 목록에서 프로필 사진·색을 보강해 표시 (모집방·코트·관리 등) */
export function UserAvatar({
  userId,
  name,
  color,
  imageUri,
  size,
  showOnline,
}: UserAvatarProps) {
  const profile = useAuthStore((s) => (userId ? s.users.find((u) => u.id === userId) : undefined));

  return (
    <Avatar
      name={name}
      color={profile?.avatarColor ?? color}
      size={size}
      imageUri={imageUri ?? profile?.avatarUri}
      showOnline={showOnline === undefined ? profile?.isAtGym : showOnline}
    />
  );
}
