import { validateStudentId } from '@/src/utils/studentId';

export interface ClubRosterEntry {
  studentId: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ParsedRosterLine {
  studentId: string;
  name: string;
}

export interface ParseRosterResult {
  entries: ParsedRosterLine[];
  errors: string[];
}

function looksLikeStudentId(token: string): boolean {
  return validateStudentId(token).ok;
}

/** 한 줄: `202410001 정명진` / `202410001,정명진` / `정명진 202410001` */
export function parseRosterLine(raw: string): ParsedRosterLine | { error: string } {
  const line = raw.trim();
  if (!line || line.startsWith('#')) {
    return { error: '' };
  }
  const parts = line.split(/[,;\t]+/).flatMap((p) => p.trim().split(/\s+/)).filter(Boolean);
  if (parts.length < 2) {
    return { error: `"${line}" — 학번과 이름이 모두 필요해요.` };
  }

  const first = parts[0];
  const last = parts[parts.length - 1];

  if (looksLikeStudentId(first)) {
    const idCheck = validateStudentId(first);
    if (!idCheck.ok) return { error: `"${line}" — ${idCheck.message}` };
    const name = parts.slice(1).join(' ').trim();
    if (name.replace(/\s+/g, '').length < 2) {
      return { error: `"${line}" — 이름이 너무 짧아요.` };
    }
    return { studentId: idCheck.normalized, name };
  }

  if (looksLikeStudentId(last)) {
    const idCheck = validateStudentId(last);
    if (!idCheck.ok) return { error: `"${line}" — ${idCheck.message}` };
    const name = parts.slice(0, -1).join(' ').trim();
    if (name.replace(/\s+/g, '').length < 2) {
      return { error: `"${line}" — 이름이 너무 짧아요.` };
    }
    return { studentId: idCheck.normalized, name };
  }

  return { error: `"${line}" — 학번(연도4자리+숫자5자리)을 찾지 못했어요.` };
}

export function parseRosterPaste(raw: string): ParseRosterResult {
  const entries: ParsedRosterLine[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const line of raw.split(/\r?\n/)) {
    const parsed = parseRosterLine(line);
    if ('error' in parsed) {
      if (parsed.error) errors.push(parsed.error);
      continue;
    }
    if (seen.has(parsed.studentId)) {
      errors.push(`${parsed.studentId} — 같은 학번이 여러 줄에 있어요. 마지막 이름으로 덮습니다.`);
    }
    seen.add(parsed.studentId);
    const existing = entries.findIndex((e) => e.studentId === parsed.studentId);
    if (existing >= 0) entries[existing] = parsed;
    else entries.push(parsed);
  }

  return { entries, errors };
}
