import assert from 'node:assert/strict';
import test from 'node:test';

function isAttendancePayload(payload) {
  const kind = String(payload.kind || '').toLowerCase();
  if (kind === 'cancel' || kind === 'notice' || kind === 'custom' || kind === 'coach') return false;
  if (kind === 'activity' || kind === 'attendance') return true;
  if (payload.showAttendance) return true;
  const title = String(payload.title || '');
  if (/취소|휴관/.test(title)) return false;
  return title.includes('활동');
}

function isScheduleForToday(scheduleDate, today = '2026-08-24') {
  return Boolean(scheduleDate) && scheduleDate === today;
}

function todayAttendanceIntent(user, today = '2026-08-24') {
  if (!user?.attendanceIntent || user.attendanceIntentDate !== today) return null;
  return user.attendanceIntent;
}

test('cancel/notice 푸시는 참석 버튼이 없다', () => {
  assert.equal(isAttendancePayload({ kind: 'cancel', title: 'Drop 활동 취소' }), false);
  assert.equal(isAttendancePayload({ kind: 'notice', title: '[휴관] 추석' }), false);
  assert.equal(isAttendancePayload({ kind: 'custom', title: '공지' }), false);
  assert.equal(isAttendancePayload({ title: 'Drop 활동 취소' }), false);
  assert.equal(isAttendancePayload({ showAttendance: true, kind: 'cancel' }), false);
});

test('활동 푸시만 참석 버튼이 있다', () => {
  assert.equal(isAttendancePayload({ kind: 'activity', title: 'Drop 활동 알림' }), true);
  assert.equal(isAttendancePayload({ kind: 'attendance' }), true);
  assert.equal(isAttendancePayload({ title: 'Drop 활동 알림' }), true);
  assert.equal(isAttendancePayload({ showAttendance: true }), true);
});

test('날짜 없는 일정은 오늘이 아니다', () => {
  assert.equal(isScheduleForToday(undefined), false);
  assert.equal(isScheduleForToday(''), false);
  assert.equal(isScheduleForToday('2026-08-23'), false);
  assert.equal(isScheduleForToday('2026-08-24'), true);
});

test('날짜 없는 참석 의사는 오늘로 보지 않는다', () => {
  assert.equal(todayAttendanceIntent({ attendanceIntent: 'going' }), null);
  assert.equal(todayAttendanceIntent({ attendanceIntent: 'going', attendanceIntentDate: '2026-08-23' }), null);
  assert.equal(todayAttendanceIntent({ attendanceIntent: 'going', attendanceIntentDate: '2026-08-24' }), 'going');
});

test('한국 날짜 헬퍼', () => {
  const seoulNoon = new Date('2026-08-24T03:00:00.000Z'); // 12:00 KST
  const key = seoulNoon.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  assert.equal(key, '2026-08-24');
  const utc = new Date(Date.UTC(2026, 7, 24 + 1));
  assert.equal(utc.toISOString().slice(0, 10), '2026-08-25');
});
