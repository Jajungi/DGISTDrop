import { useMemo } from 'react';
import { getGuideSections } from '@/src/constants/guideContent';
import { getActivityDayLabel } from '@/src/services/activityTime';
import { useActivityScheduleStore } from '@/src/stores/activityScheduleStore';
import { formatActivityScheduleLabel } from '@/src/utils/activitySchedule';

/** 설정에 저장된 정기 활동 시간이 반영된 이용 안내 섹션 */
export function useGuideSections() {
  const schedule = useActivityScheduleStore((s) => s.schedule);
  return useMemo(() => {
    const label = formatActivityScheduleLabel(schedule, getActivityDayLabel);
    return getGuideSections(label);
  }, [schedule]);
}

export function useActivityScheduleLabel() {
  const schedule = useActivityScheduleStore((s) => s.schedule);
  return useMemo(
    () => formatActivityScheduleLabel(schedule, getActivityDayLabel),
    [schedule]
  );
}
