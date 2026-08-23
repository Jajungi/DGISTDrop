/** DGIST 학번: 연도 4자리 + 숫자 5자리 (예: 202600000) */
const STUDENT_ID_PATTERN = /^(\d{4})(\d{5})$/;

export type StudentIdValidation =
  | { ok: true; normalized: string }
  | { ok: false; message: string };

export function validateStudentId(raw: string): StudentIdValidation {
  const normalized = raw.trim();
  if (!normalized) {
    return { ok: false, message: '학번을 입력해 주세요.' };
  }
  if (!/^\d+$/.test(normalized)) {
    return { ok: false, message: '학번은 숫자만 입력할 수 있어요.' };
  }
  const match = normalized.match(STUDENT_ID_PATTERN);
  if (!match) {
    return { ok: false, message: '학번은 연도 4자리 + 숫자 5자리 형식이에요. (예: 202600000)' };
  }
  const year = Number(match[1]);
  if (year < 2000 || year > 2099) {
    return { ok: false, message: '학번 연도가 올바르지 않아요.' };
  }
  return { ok: true, normalized };
}

export function isGuestStudentId(studentId: string): boolean {
  return studentId.startsWith('guest-');
}
