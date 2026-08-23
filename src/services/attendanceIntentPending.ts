import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEY = 'drop-attendance-intent';

export function parseAttendanceIntent(value: unknown): 'going' | 'not_going' | null {
  return value === 'going' || value === 'not_going' ? value : null;
}

export async function savePendingAttendanceIntent(intent: 'going' | 'not_going'): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(KEY, intent);
      return;
    }
    await AsyncStorage.setItem(KEY, intent);
  } catch {
    /* ignore */
  }
}

export async function takePendingAttendanceIntent(): Promise<'going' | 'not_going' | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof sessionStorage === 'undefined') return null;
      const intent = parseAttendanceIntent(sessionStorage.getItem(KEY));
      if (intent) sessionStorage.removeItem(KEY);
      return intent;
    }
    const raw = await AsyncStorage.getItem(KEY);
    const intent = parseAttendanceIntent(raw);
    if (intent) await AsyncStorage.removeItem(KEY);
    return intent;
  } catch {
    return null;
  }
}
