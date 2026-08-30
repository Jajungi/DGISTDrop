import { useMemo } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { useI18n } from '@/src/i18n/useI18n';

type IconName = keyof typeof Ionicons.glyphMap;

export type NavItem = {
  href: '/' | '/friends' | '/lobby' | '/profile' | '/guide' | '/admin';
  icon: IconName;
  label: string;
  tabLabel: string;
};

export function useNavItems(): NavItem[] {
  const { t } = useI18n();
  return useMemo(
    () => [
      { href: '/', icon: 'grid', label: t('nav.courts'), tabLabel: t('nav.courtsTab') },
      { href: '/friends', icon: 'heart', label: t('nav.friends'), tabLabel: t('nav.friendsTab') },
      { href: '/lobby', icon: 'people', label: t('nav.lobby'), tabLabel: t('nav.lobbyTab') },
      { href: '/profile', icon: 'person', label: t('nav.profile'), tabLabel: t('nav.profileTab') },
      { href: '/guide', icon: 'document-text', label: t('nav.guide'), tabLabel: t('nav.guideTab') },
    ],
    [t]
  );
}

export function useAdminNavItem(): NavItem {
  const { t } = useI18n();
  return useMemo(
    () => ({
      href: '/admin',
      icon: 'shield-checkmark',
      label: t('nav.admin'),
      tabLabel: t('nav.adminTab'),
    }),
    [t]
  );
}
