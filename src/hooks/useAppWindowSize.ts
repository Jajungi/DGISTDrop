import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { getCssOrient, subscribeAppOrientation } from '@/src/services/pwaOrientation';

/** CSS로 가로를 강제하면 창 크기는 세로로 남아서, 레이아웃용으로 가로·세로를 바꿔 준다. */
export function useAppWindowSize() {
  const dim = useWindowDimensions();
  const [css, setCss] = useState(getCssOrient);
  useEffect(() => subscribeAppOrientation(() => setCss(getCssOrient())), []);
  const cssLandscape = css !== 'portrait';
  if (cssLandscape) {
    return {
      width: Math.max(dim.width, dim.height),
      height: Math.min(dim.width, dim.height),
      cssLandscape: true,
    };
  }
  return { width: dim.width, height: dim.height, cssLandscape: false };
}
