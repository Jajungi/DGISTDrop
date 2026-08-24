const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const SEOUL = 'Asia/Seoul';

export function getTodayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** 한국 날짜 YYYY-MM-DD — 참석 의사·게스트 일일 삭제와 맞춤 */
export function getSeoulTodayKey(date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: SEOUL });
}

/** 한국 요일 0=일 … 6=토 */
export function getSeoulWeekday(date = new Date()): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: SEOUL,
    weekday: 'short',
  }).format(date);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const idx = days.indexOf(weekday);
  return idx >= 0 ? idx : date.getDay();
}

/** 한국 시각 (DST 없음) */
export function getSeoulClock(date = new Date()): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SEOUL,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return {
    hour: Number(parts.find((p) => p.type === 'hour')?.value ?? 0),
    minute: Number(parts.find((p) => p.type === 'minute')?.value ?? 0),
  };
}

/** YYYY-MM-DD에 달력 일수를 더함 (타임존 영향 없음) */
export function addCalendarDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const utc = new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) + days));
  return utc.toISOString().slice(0, 10);
}

/** 한국 날짜+시각을 Date로. 한국은 DST가 없어 +09:00 고정 */
export function seoulDateTime(isoDate: string, hour: number, minute: number): Date {
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return new Date(`${isoDate}T${hh}:${mm}:00+09:00`);
}

/** 예: 23일(금) — 한국 날짜 */
export function formatCompactDayLabel(date = new Date()): string {
  const [, , d] = getSeoulTodayKey(date).split('-');
  const day = DAY_LABELS[getSeoulWeekday(date)];
  return `${Number(d)}일(${day})`;
}

/** 예: 2026년 7월 7일 (화) — 한국 날짜 */
export function formatTodayLabel(date = new Date()): string {
  const [y, m, d] = getSeoulTodayKey(date).split('-');
  const day = DAY_LABELS[getSeoulWeekday(date)];
  return `${Number(y)}년 ${Number(m)}월 ${Number(d)}일 (${day})`;
}

/** 날짜가 비어 있으면 오늘이 아님 (어제 시각이 남으면 안 됨) */
export function isScheduleForToday(scheduleDate?: string, today = getSeoulTodayKey()): boolean {
  return Boolean(scheduleDate) && scheduleDate === today;
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
  if (!isScheduleForToday(user.scheduleDate)) return {};
  return { start, end: normalizeHHMM(user.scheduledEnd) };
}
