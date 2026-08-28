import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';
import { measureCssSafeAreaInsets, mergeSafeAreaInsets } from '@/src/utils/safeArea';

const ZERO_INSETS: EdgeInsets = { top: 0, bottom: 0, left: 0, right: 0 };

/** RN insets + 웹 CSS env(safe-area-inset-*) 병합. iOS PWA에서 하단 잘림 방지 */
export function useEffectiveSafeAreaInsets(): EdgeInsets {
  const insets = useSafeAreaInsets();
  const [cssInsets, setCssInsets] = useState<EdgeInsets>(() =>
    Platform.OS === 'web' ? measureCssSafeAreaInsets() : ZERO_INSETS
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const update = () => setCssInsets(measureCssSafeAreaInsets());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      vv?.removeEventListener('resize', update);
    };
  }, []);

  if (Platform.OS !== 'web') return insets;
  return mergeSafeAreaInsets(insets, cssInsets);
}
