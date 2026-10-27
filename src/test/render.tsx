import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';
import { CycleProvider, useCycleData } from '../context/CycleContext';
import type { Language, Observation } from '../types/crms';
import { STORAGE_LANGUAGE_KEY, STORAGE_OBSERVATIONS_KEY } from '../domain/versionTracker';

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
  localStorage.setItem(STORAGE_LANGUAGE_KEY, language);
  if (observations) {
    localStorage.setItem(STORAGE_OBSERVATIONS_KEY, JSON.stringify(observations));
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
