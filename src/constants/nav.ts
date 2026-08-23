import type { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

export const WEB_BREAKPOINT = 768;

export const NAV_ITEMS: {
  href: '/' | '/friends' | '/lobby' | '/profile' | '/guide' | '/admin';
  icon: IconName;
  label: string;
  tabLabel: string;
}[] = [
  { href: '/', icon: 'grid', label: '코트 현황', tabLabel: '코트' },
  { href: '/friends', icon: 'heart', label: '친구', tabLabel: '친구' },
  { href: '/lobby', icon: 'people', label: '파트너 모집', tabLabel: '모집' },
  { href: '/profile', icon: 'person', label: 'MY 기록', tabLabel: 'MY' },
  { href: '/guide', icon: 'document-text', label: '이용 안내', tabLabel: '안내' },
];

export const ADMIN_NAV_ITEM = {
  href: '/admin' as const,
  icon: 'shield-checkmark' as IconName,
  label: '관리자 패널',
  tabLabel: '관리',
};
