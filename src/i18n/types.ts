export type AppLocale = 'ko' | 'en';

export const LOCALES: AppLocale[] = ['ko', 'en'];

export type TranslationValue = string | TranslationTree;
export type TranslationTree = { readonly [key: string]: TranslationValue };
