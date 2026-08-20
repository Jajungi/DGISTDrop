import { useMemo } from 'react';
import { getGuideSections } from '@/src/constants/guideContent';
import { getActivityDayLabel } from '@/src/services/activityTime';
import { useActivityScheduleStore } from '@/src/stores/activityScheduleStore';
import { useFeatureFlagsStore } from '@/src/stores/featureFlagsStore';
import { formatActivityScheduleLabel } from '@/src/utils/activitySchedule';
import { detectClientDevice, getPushGuideCopy } from '@/src/utils/clientDevice';

/** 설정에 저장된 정기 활동 시간이 반영된 이용 안내 섹션 */
export function useGuideSections() {
  const schedule = useActivityScheduleStore((s) => s.schedule);
  const eloOn = useFeatureFlagsStore((s) => s.eloFeaturesEnabled);
  return useMemo(() => {
    const label = formatActivityScheduleLabel(schedule, getActivityDayLabel);
    const sections = getGuideSections(label);
    const device = detectClientDevice();
    const pushCopy = getPushGuideCopy(device);
    const tailored = sections.map((section) => ({
      ...section,
      items: section.items
        .filter((item) => !item.forDevices || item.forDevices.includes(device))
        .map((item) =>
          item.title === '활동 알림 (푸시)' ? { ...item, content: pushCopy.guideBody } : item
        ),
    }));
    if (eloOn) return tailored;
    return tailored.filter((s) => s.id !== 'rank');
  }, [schedule, eloOn]);
}

export function useActivityScheduleLabel() {
  const schedule = useActivityScheduleStore((s) => s.schedule);
  return useMemo(
    () => formatActivityScheduleLabel(schedule, getActivityDayLabel),
    [schedule]
  );
}
