import { NAV_ITEMS } from '@/src/constants/nav';

export type TabTourHref = '/' | '/friends' | '/lobby' | '/profile' | '/guide';

export interface TabTourStep {
  href: TabTourHref;
  title: string;
  tabLabel: string;
  occupancy: string;
  reservation?: string;
}

export const TAB_TOUR_STEPS: TabTourStep[] = [
  {
    href: '/',
    title: NAV_ITEMS[0].label,
    tabLabel: NAV_ITEMS[0].tabLabel,
    occupancy:
      '9면이 비어 있음/사용 중인지만 보입니다. 코트를 누르면 커집니다. 위쪽 「올 사람」을 누르면 아래에서 오늘 온다고 한 사람 이름이 나옵니다. 「지금」은 체육관에 도착한 인원입니다.',
    reservation:
      '코트 예약·합류도 여기서 합니다. 코트를 누르면 커집니다. 「올 사람」을 누르면 아래에서 오늘 온다고 한 사람 목록을 볼 수 있습니다.',
  },
  {
    href: '/friends',
    title: NAV_ITEMS[1].label,
    tabLabel: NAV_ITEMS[1].tabLabel,
    occupancy: '동아리원 일정·누가 체육관에 있는지를 봅니다. 홈의 올 사람 목록과 달리, 여기서는 시간대별로 겹치는 사람을 봅니다.',
  },
  {
    href: '/lobby',
    title: NAV_ITEMS[2].label,
    tabLabel: NAV_ITEMS[2].tabLabel,
    occupancy: '같이 칠 사람을 모집하거나 방에 들어갑니다.',
  },
  {
    href: '/profile',
    title: NAV_ITEMS[3].label,
    tabLabel: NAV_ITEMS[3].tabLabel,
    occupancy: '오늘 참석, 출석, 알림, 내 기록을 봅니다. 참석을 고르면 홈의 올 사람 수와 명단에 들어갑니다.',
  },
  {
    href: '/guide',
    title: NAV_ITEMS[4].label,
    tabLabel: NAV_ITEMS[4].tabLabel,
    occupancy: '규칙·FAQ는 여기에 있습니다. 자세한 건 언제든 다시 보면 됩니다.',
  },
];

export function tabTourBody(step: TabTourStep, reservationOn: boolean): string {
  return reservationOn && step.reservation ? step.reservation : step.occupancy;
}
