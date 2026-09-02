import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CycleStatsHeader } from '../CycleStatsHeader';
import { LanguageProvider } from '../../context/LanguageContext';
import { CycleDataProvider, CycleUiProvider } from '../../context/CycleContext';
import * as CycleContextModule from '../../context/CycleContext';

describe('CycleStatsHeader Component', () => {
  it('renders stats for selected cycle and all cycles', () => {
    render(
      <LanguageProvider>
        <CycleDataProvider>
          <CycleUiProvider>
            <CycleStatsHeader />
          </CycleUiProvider>
        </CycleDataProvider>
      </LanguageProvider>
    );

    // Initial state with empty cycles returns null
    expect(screen.queryByText(/Cycle Length/i)).toBeNull();
  });

  it('renders stats when cycles are populated', () => {
    const mockUseCycle = vi.spyOn(CycleContextModule, 'useCycle').mockReturnValue({
      observations: [
        {
          id: '1',
          date: '2026-09-01',
          cycleDay: 1,
          bleeding: 'H',
          stamp: 'RED',
          codeString: 'H',
          modifiers: [],
          symptoms: [],
          notes: '',
        },
        {
          id: '2',
          date: '2026-09-02',
          cycleDay: 2,
          stretch: '10',
          modifiers: ['K', 'L'],
          isPeakDay: true,
          intercourse: true,
          stamp: 'WHITE_BABY',
          codeString: '10KL',
          symptoms: [],
          notes: '',
        },
        {
          id: '3',
          date: '2026-09-03',
          cycleDay: 3,
          stretch: '0',
          stamp: 'DARK_GREEN',
          codeString: '0',
          modifiers: [],
          symptoms: [],
          notes: '',
        },
      ],
      cycles: [
        {
          id: 'cycle-1',
          startDate: '2026-09-01',
          observations: [
            {
              id: '1',
              date: '2026-09-01',
              cycleDay: 1,
              bleeding: 'H',
              stamp: 'RED',
              codeString: 'H',
              modifiers: [],
              symptoms: [],
              notes: '',
            },
            {
              id: '2',
              date: '2026-09-02',
              cycleDay: 2,
              stretch: '10',
              modifiers: ['K', 'L'],
              isPeakDay: true,
              intercourse: true,
              stamp: 'WHITE_BABY',
              codeString: '10KL',
              symptoms: [],
              notes: '',
            },
            {
              id: '3',
              date: '2026-09-03',
              cycleDay: 3,
              stretch: '0',
              stamp: 'DARK_GREEN',
              codeString: '0',
              modifiers: [],
              symptoms: [],
              notes: '',
            },
          ],
        },
      ],
      selectedCycleId: 'cycle-1',
      setSelectedCycleId: vi.fn(),
      saveObservation: vi.fn(),
      deleteObservation: vi.fn(),
      toggleManualPeak: vi.fn(),
      exportDataJson: vi.fn(),
      importDataJson: vi.fn(),
      clearAllData: vi.fn(),
      loadDemoData: vi.fn(),
      selectedObservation: null,
      setSelectedObservation: vi.fn(),
      isDrawerOpen: false,
      setIsDrawerOpen: vi.fn(),
    });

    render(
      <LanguageProvider>
        <CycleStatsHeader />
      </LanguageProvider>
    );

    expect(screen.getByText(/3 days/i)).toBeInTheDocument();
    expect(screen.getByText(/CD 2 \(2026-09-02\)/i)).toBeInTheDocument();
    expect(screen.getByText(/1 days/i)).toBeInTheDocument();

    mockUseCycle.mockRestore();
  });
});
