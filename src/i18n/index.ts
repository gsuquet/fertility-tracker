import { en } from './locales/en';
import { fr } from './locales/fr';
import { TranslationSchema, SupportedLanguage } from './types';

export const translations: Record<SupportedLanguage, TranslationSchema> = {
  en,
  fr,
};

export const supportedLanguages: readonly SupportedLanguage[] = ['en', 'fr'] as const;

export * from './types';
export { en, fr };
