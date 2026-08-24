import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getSeoulTodayKey } from '@/src/utils/dateFormat';

/** 자정이 지나면 한국 날짜를 다시 읽는다 */
export function useSeoulTodayKey(intervalMs = 60_000): string {
  const [key, setKey] = useState(() => getSeoulTodayKey());

  useEffect(() => {
    const sync = () => setKey(getSeoulTodayKey());
    sync();
    const id = setInterval(sync, intervalMs);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [intervalMs]);

  return key;
}
