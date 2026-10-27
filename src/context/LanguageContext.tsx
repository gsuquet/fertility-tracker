import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Language } from '../types/crms';
import type { TranslationSchema } from '../i18n';
import { translations } from '../i18n';
import { readStorage, writeStorage } from '../utils/storage';
import { STORAGE_LANGUAGE_KEY as LANGUAGE_STORAGE_KEY } from '../utils/storageKeys';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationSchema;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = readStorage(LANGUAGE_STORAGE_KEY);
    return saved === 'fr' || saved === 'en' ? saved : 'en';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    writeStorage(LANGUAGE_STORAGE_KEY, lang);
  }, []);

  // Screen readers and the browser use the lang attribute to pick the voice and hyphenation
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, t: translations[language] }),
    [language, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
