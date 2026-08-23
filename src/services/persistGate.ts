import { scheduleSaveAppState, type AppStateSnapshot } from '@/src/services/appPersistence';
import { isSupabaseEnabled } from '@/src/lib/supabase';

let collectSnapshot: (() => AppStateSnapshot) | null = null;

export function bindAppStateCollector(fn: () => AppStateSnapshot) {
  collectSnapshot = fn;
}

export function persistAppState() {
  if (isSupabaseEnabled()) return;
  if (!collectSnapshot) return;
  scheduleSaveAppState(collectSnapshot);
}
