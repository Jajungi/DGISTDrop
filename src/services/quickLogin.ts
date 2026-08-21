import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseEnabled } from '@/src/lib/supabase';

const SAVED_LOGIN_KEY = '@badmin/saved-login';
const LEGACY_QUICK_LOGIN_KEY = '@badmin/quick-login';

export type SavedLoginKind = 'member' | 'guest';

export interface SavedLoginAccount {
  kind: SavedLoginKind;
  name: string;
  studentId?: string;
  /** 로그아웃 후 확인창을 띄울지. true면 Supabase 세션은 유지한 채 UI만 로그아웃 */
  pendingConfirm?: boolean;
  /** 로컬 모드 빠른 로그인용 */
  password?: string;
}

function isValidAccount(value: unknown): value is SavedLoginAccount {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.name !== 'string' || !v.name.trim()) return false;
  if (v.kind === 'guest') return true;
  if (v.kind === 'member') return typeof v.studentId === 'string';
  return typeof v.studentId === 'string';
}

function normalizeAccount(value: SavedLoginAccount): SavedLoginAccount {
  if (value.kind === 'guest' || value.kind === 'member') return value;
  return {
    ...value,
    kind: 'member',
  };
}

async function migrateLegacyEntries(): Promise<SavedLoginAccount | null> {
  const raw = await AsyncStorage.getItem(LEGACY_QUICK_LOGIN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0] as Record<string, unknown>;
      if (typeof first.studentId === 'string' && typeof first.name === 'string') {
        await AsyncStorage.removeItem(LEGACY_QUICK_LOGIN_KEY);
        return { kind: 'member', studentId: first.studentId, name: first.name };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function canQuickLogin(account: SavedLoginAccount): boolean {
  if (account.pendingConfirm) {
    if (isSupabaseEnabled()) return true;
    if (account.kind === 'guest') return account.name.trim().length >= 2;
    return Boolean(account.studentId && account.password);
  }
  if (isSupabaseEnabled()) return false;
  if (account.kind === 'guest') return account.name.trim().length >= 2;
  return Boolean(account.studentId && account.password);
}

/** 이 기기에 저장된 마지막 로그인 계정 */
export async function loadSavedLogin(): Promise<SavedLoginAccount | null> {
  const raw = await AsyncStorage.getItem(SAVED_LOGIN_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isValidAccount(parsed)) return normalizeAccount(parsed);
    } catch {
      /* fall through */
    }
  }
  return migrateLegacyEntries();
}

export async function saveSavedLogin(account: SavedLoginAccount): Promise<void> {
  const next = normalizeAccount(account);
  await AsyncStorage.setItem(
    SAVED_LOGIN_KEY,
    JSON.stringify({
      kind: next.kind,
      name: next.name,
      studentId: next.studentId,
      pendingConfirm: next.pendingConfirm,
      password: next.password,
    })
  );
}

export async function clearSavedLogin(): Promise<void> {
  await AsyncStorage.removeItem(SAVED_LOGIN_KEY);
}
