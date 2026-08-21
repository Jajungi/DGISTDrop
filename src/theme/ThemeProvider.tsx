import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  darkPalette,
  lightPalette,
  PALETTE_KEYS,
  type ColorSchemeName,
  type ThemePalette,
} from '@/src/theme/palettes';

const THEME_KEY = 'drop-color-scheme';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  scheme: ColorSchemeName;
  preference: ThemePreference;
  colors: ThemePalette;
  setPreference: (next: ThemePreference) => void;
  toggleScheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  scheme: 'light',
  preference: 'system',
  colors: lightPalette,
  setPreference: () => undefined,
  toggleScheme: () => undefined,
});

function osScheme(): ColorSchemeName {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

function parsePreference(v: string | null): ThemePreference | null {
  if (v === 'light' || v === 'dark' || v === 'system') return v;
  return null;
}

function readStoredWeb(): ThemePreference | null {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return null;
  return parsePreference(localStorage.getItem(THEME_KEY));
}

function applyDomTheme(scheme: ColorSchemeName) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.colorScheme = scheme;
  root.dataset.theme = scheme;
  const palette = scheme === 'dark' ? darkPalette : lightPalette;
  PALETTE_KEYS.forEach((k) => {
    root.style.setProperty(`--drop-${k}`, palette[k]);
  });
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', palette.background);
  window.dispatchEvent(new CustomEvent('drop-theme-change', { detail: scheme }));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const stored = readStoredWeb();
  const [preference, setPreferenceState] = useState<ThemePreference>(stored ?? 'system');
  const [scheme, setScheme] = useState<ColorSchemeName>(
    stored === 'light' || stored === 'dark' ? stored : osScheme()
  );

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(THEME_KEY).then((v) => {
      if (cancelled) return;
      const parsed = parsePreference(v);
      if (!parsed) return;
      setPreferenceState(parsed);
      setScheme(parsed === 'system' ? osScheme() : parsed);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (preference !== 'system') {
      setScheme(preference);
      return;
    }
    setScheme(osScheme());
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const update = () => setScheme(mq.matches ? 'dark' : 'light');
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => sub.remove();
  }, [preference]);

  useEffect(() => {
    applyDomTheme(scheme);
  }, [scheme]);

  const persist = useCallback((next: ThemePreference) => {
    void AsyncStorage.setItem(THEME_KEY, next);
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_KEY, next);
    }
  }, []);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      persist(next);
    },
    [persist]
  );

  const toggleScheme = useCallback(() => {
    setPreference(scheme === 'dark' ? 'light' : 'dark');
  }, [scheme, setPreference]);

  const value = useMemo(
    () => ({
      scheme,
      preference,
      colors: scheme === 'dark' ? darkPalette : lightPalette,
      setPreference,
      toggleScheme,
    }),
    [scheme, preference, setPreference, toggleScheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
