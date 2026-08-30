import { useMemo } from 'react';
import { getGuideSections } from '@/src/constants/guideContent';
import { formatActivityScheduleLabelLocalized } from '@/src/i18n/activityLabels';
import { useActivityScheduleStore } from '@/src/stores/activityScheduleStore';
import { useFeatureFlagsStore } from '@/src/stores/featureFlagsStore';
import { useLocaleStore } from '@/src/stores/localeStore';
import { detectClientDevice, getPushGuideCopy } from '@/src/utils/clientDevice';

/** 설정에 저장된 정기 활동 시간이 반영된 이용 안내 섹션 */
export function useGuideSections() {
  const schedule = useActivityScheduleStore((s) => s.schedule);
  const eloOn = useFeatureFlagsStore((s) => s.eloFeaturesEnabled);
  const pointsOn = useFeatureFlagsStore((s) => s.pointsFeaturesEnabled);
  const reservationOn = useFeatureFlagsStore((s) => s.reservationEnabled);
  const locale = useLocaleStore((s) => s.locale);
  return useMemo(() => {
    const label = formatActivityScheduleLabelLocalized(schedule, locale);
    const sections = getGuideSections(label, locale);
    const device = detectClientDevice();
    const pushCopy = getPushGuideCopy(device, locale);
    const tailored = sections.map((section) => ({
      ...section,
      items: section.items
        .filter((item) => {
          if (item.forDevices && !item.forDevices.includes(device)) return false;
          if (item.when === 'reservation') return reservationOn;
          if (item.when === 'occupancy') return !reservationOn;
          if (item.when === 'points') return pointsOn;
          if (item.when === 'elo') return eloOn;
          return true;
        })
        .map((item) =>
          item.title === '활동 알림 (푸시)' || item.title === 'Session notifications (push)'
            ? { ...item, content: pushCopy.guideBody }
            : item
        ),
    }));
    return tailored.filter(
      (s) =>
        s.items.length > 0 &&
        (eloOn || s.id !== 'rank') &&
        (pointsOn || s.id !== 'points')
    );
  }, [schedule, eloOn, pointsOn, reservationOn, locale]);
}

export function useActivityScheduleLabel() {
  const schedule = useActivityScheduleStore((s) => s.schedule);
  const locale = useLocaleStore((s) => s.locale);
  return useMemo(
    () => formatActivityScheduleLabelLocalized(schedule, locale),
    [schedule, locale]
  );
}
