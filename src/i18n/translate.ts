import type { TranslationTree } from '@/src/i18n/types';

export function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function translate(
  tree: TranslationTree,
  key: string,
  params?: Record<string, string | number>
): string {
  const parts = key.split('.');
  let cur: unknown = tree;
  for (const part of parts) {
    if (!cur || typeof cur !== 'object' || !(part in cur)) return key;
    cur = (cur as TranslationTree)[part];
  }
  if (typeof cur !== 'string') return key;
  return interpolate(cur, params);
}
