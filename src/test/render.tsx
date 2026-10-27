import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';
import { CycleProvider } from '../context/CycleContext';
import type { Language, Observation } from '../types/crms';

export const OBSERVATIONS_STORAGE_KEY = 'fertility_care_observations';

interface ProviderOptions {
  language?: Language;
  observations?: Observation[];
}

/**
 * Renders a component inside every app provider. Use `language` to render in French
 * and `observations` to start with saved data.
 */
export const renderWithProviders = (
  ui: ReactElement,
  { language = 'en', observations }: ProviderOptions = {}
) => {
  localStorage.setItem('fertility_care_lang', language);
  if (observations) {
    localStorage.setItem(OBSERVATIONS_STORAGE_KEY, JSON.stringify(observations));
  }
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <CycleProvider>{ui}</CycleProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};
