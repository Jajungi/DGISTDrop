import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { isStandalonePwa } from '@/src/utils/clientDevice';

/** 웹앱(홈 화면 아이콘) 모드 여부. display-mode 변경에 반응 */
export function useIsStandalonePwa(): boolean {
  const [standalone, setStandalone] = useState(() => isStandalonePwa());

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const sync = () => setStandalone(isStandalonePwa());
    sync();
    const queries = ['standalone', 'fullscreen', 'minimal-ui'].map((mode) =>
      window.matchMedia(`(display-mode: ${mode})`)
    );
    queries.forEach((mq) => mq.addEventListener('change', sync));
    window.addEventListener('visibilitychange', sync);
    return () => {
      queries.forEach((mq) => mq.removeEventListener('change', sync));
      window.removeEventListener('visibilitychange', sync);
    };
  }, []);

  return standalone;
}
