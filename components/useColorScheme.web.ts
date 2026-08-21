import { useEffect, useState } from 'react';

const THEME_KEY = 'drop-color-scheme';

function read(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  if (document.documentElement.dataset.theme === 'dark') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** 웹: 라이트/다크 지정값, 시스템(또는 미지정)은 OS */
export function useColorScheme(): 'light' | 'dark' | null {
  const [scheme, setScheme] = useState<'light' | 'dark' | null>(read);

  useEffect(() => {
    const onCustom = (e: Event) => {
      const next = (e as CustomEvent<'light' | 'dark'>).detail;
      if (next === 'light' || next === 'dark') setScheme(next);
    };
    window.addEventListener('drop-theme-change', onCustom);
    return () => window.removeEventListener('drop-theme-change', onCustom);
  }, []);

  return scheme;
}
