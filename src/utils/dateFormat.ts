const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function getTodayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** 한국 날짜 YYYY-MM-DD — 참석 의사·게스트 일일 삭제와 맞춤 */
export function getSeoulTodayKey(date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

/** 예: 23일(금) */
export function formatCompactDayLabel(date = new Date()): string {
  const d = date.getDate();
  const day = DAY_LABELS[date.getDay()];
  return `${d}일(${day})`;
}

/** 예: 2026년 7월 7일 (화) */
export function formatTodayLabel(date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const day = DAY_LABELS[date.getDay()];
  return `${y}년 ${m}월 ${d}일 (${day})`;
}

export function isScheduleForToday(scheduleDate?: string, today = getTodayKey()): boolean {
  if (!scheduleDate) return true;
  return scheduleDate === today;
}

export function getEffectiveSchedule(user: {
  scheduleDate?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}): { start?: string; end?: string } {
  if (!user.scheduledStart) return {};
  if (user.scheduleDate && !isScheduleForToday(user.scheduleDate)) return {};
  return { start: user.scheduledStart, end: user.scheduledEnd };
}
