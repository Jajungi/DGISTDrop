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

export function isScheduleForToday(scheduleDate?: string, today = getSeoulTodayKey()): boolean {
  if (!scheduleDate) return true;
  return scheduleDate === today;
}

/** DB time(18:30:00) · HH:MM → 18:30. 형식이 아니면 undefined */
export function normalizeHHMM(value?: string | null): string | undefined {
  if (!value) return undefined;
  const match = String(value)
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return undefined;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** 화면용 시각. 초는 숨김. */
export function formatClockTime(value?: string | null): string {
  return normalizeHHMM(value) ?? '';
}

export function formatClockRange(start?: string | null, end?: string | null): string {
  const from = formatClockTime(start);
  if (!from) return '';
  const to = formatClockTime(end);
  return to ? `${from}–${to}` : from;
}

export function getEffectiveSchedule(user: {
  scheduleDate?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}): { start?: string; end?: string } {
  const start = normalizeHHMM(user.scheduledStart);
  if (!start) return {};
  if (user.scheduleDate && !isScheduleForToday(user.scheduleDate)) return {};
  return { start, end: normalizeHHMM(user.scheduledEnd) };
}
