import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { Language } from '../types/crms';
import type { TranslationSchema } from '../i18n';
import { translations } from '../i18n';
import { readStorage, writeStorage } from '../utils/storage';

const LANGUAGE_STORAGE_KEY = 'fertility_care_lang';

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

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    writeStorage(LANGUAGE_STORAGE_KEY, lang);
  };

  // Screen readers and the browser use the lang attribute to pick the voice and hyphenation
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
