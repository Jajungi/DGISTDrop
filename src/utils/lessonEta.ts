import type { LessonQueueEntry } from '@/src/types';

/** 1인 레슨 대략 소요(분). 실제와 다를 수 있으며 종료 시마다 재계산. */
export const LESSON_MINUTES_PER_PERSON = 15;

/** 내 차례까지 앞선 인원 수 (진행 중·다음·앞 대기 포함) */
export function countPeopleAheadInLessonQueue(
  entry: LessonQueueEntry,
  queue: LessonQueueEntry[]
): number {
  if (entry.status === 'active') return 0;
  if (entry.status === 'done') return 0;

  let ahead = 0;
  if (queue.some((e) => e.status === 'active')) ahead += 1;
  if (entry.status === 'waiting' && queue.some((e) => e.status === 'next')) ahead += 1;
  ahead += queue.filter(
    (e) => e.status === 'waiting' && e.position < entry.position
  ).length;
  return ahead;
}

/** 예상 대기 분. null이면 ETA 표시 불필요(진행 중 등). */
export function estimateLessonEtaMinutes(
  entry: LessonQueueEntry,
  queue: LessonQueueEntry[]
): number | null {
  if (entry.status === 'active' || entry.status === 'done') return null;
  const ahead = countPeopleAheadInLessonQueue(entry, queue);
  return ahead * LESSON_MINUTES_PER_PERSON;
}

export function formatLessonEtaLabel(
  entry: LessonQueueEntry,
  queue: LessonQueueEntry[]
): string | null {
  if (entry.status === 'active') return null;
  if (entry.status === 'next') {
    const mins = estimateLessonEtaMinutes(entry, queue);
    if (mins == null || mins <= 0) return '곧 시작 · 준비해 주세요';
    return `약 ${mins}분 후 · 사이렌 전에 준비`;
  }
  if (entry.status !== 'waiting') return null;
  const mins = estimateLessonEtaMinutes(entry, queue);
  if (mins == null) return null;
  if (mins <= 0) return '곧 시작 · 준비해 주세요';
  return `약 ${mins}분 후 (1인 약 ${LESSON_MINUTES_PER_PERSON}분 · 변동 가능)`;
}
