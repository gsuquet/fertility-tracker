import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';
import { CycleProvider, useCycleData } from '../context/CycleContext';
import type { Language, Observation } from '../types/crms';

export const OBSERVATIONS_STORAGE_KEY = 'fertility_care_observations';

interface ProviderOptions {
  language?: Language;
  observations?: Observation[];
  selectedCycleId?: string;
}

const SelectCycle = ({ id }: { id: string }) => {
  const { setSelectedCycleId } = useCycleData();
  useEffect(() => setSelectedCycleId(id), [id, setSelectedCycleId]);
  return null;
};

/**
 * Renders a component inside every app provider. Use `language` to render in French
 * and `observations` to start with saved data. `selectedCycleId` selects a cycle after the first render.
 */
export const renderWithProviders = (
  ui: ReactElement,
  { language = 'en', observations, selectedCycleId }: ProviderOptions = {}
) => {
  localStorage.setItem('fertility_care_lang', language);
  if (observations) {
    localStorage.setItem(OBSERVATIONS_STORAGE_KEY, JSON.stringify(observations));
  }
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <CycleProvider>
          {selectedCycleId !== undefined && <SelectCycle id={selectedCycleId} />}
          {ui}
        </CycleProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};
