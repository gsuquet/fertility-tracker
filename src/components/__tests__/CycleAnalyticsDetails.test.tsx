import { screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CycleAnalyticsView } from '../CycleAnalyticsView';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { buildDemoObservations } from '../../domain/demoData';
import { en } from '../../i18n';
import type { MucusModifier, MucusStretch, Observation } from '../../types/crms';

const day = (date: string, stretch?: MucusStretch, modifiers?: MucusModifier[]): Observation =>
  makeObservation({
    date,
    ...(stretch ? { stretch } : {}),
    ...(modifiers ? { modifiers } : {}),
  });

// One short cycle that uses every mucus score and ends three days after the peak
const shortCycle = [
  makeObservation({ date: '2026-09-01', bleeding: 'H' }),
  day('2026-09-02', '2'),
  day('2026-09-03', '2W'),
  day('2026-09-04', '4'),
  day('2026-09-05', '6'),
  day('2026-09-06', '8'),
  day('2026-09-07', '10DL'),
  day('2026-09-08', '10SL'),
  day('2026-09-09', '10WL'),
  day('2026-09-10', '0', ['K']),
  day('2026-09-11', '0'),
  day('2026-09-12', '0'),
  day('2026-09-13'),
];

const summary = () => screen.getByText(`${en.analytics.lutealHealth}:`).closest('div');
const scoreOf = (cycleDay: number) =>
  screen
    .getByTitle(new RegExp(`^CD ${cycleDay}: .*\\(Score: (\\d+)\\)$`))
    .title.match(/Score: (\d+)/)?.[1];

describe('CycleAnalyticsView details', () => {
  it('scores every stretch and modifier on the trend chart', () => {
    renderWithProviders(<CycleAnalyticsView />, { observations: shortCycle });
    expect([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13].map(scoreOf)).toEqual([
      '2',
      '2',
      '4',
      '6',
      '8',
      '10',
      '10',
      '10',
      '10',
      '0',
      '0',
    ]);
    expect(screen.getByText('(Cycle 1)', { exact: false })).toBeInTheDocument();
  });

  it('flags a short luteal phase', () => {
    renderWithProviders(<CycleAnalyticsView />, { observations: shortCycle });
    expect(summary()).toHaveTextContent(en.analytics.abnormalLuteal);
  });

  it('shows a pending peak when the cycle has no peak yet', () => {
    renderWithProviders(<CycleAnalyticsView />, { observations: shortCycle.slice(0, 4) });
    expect(summary()).toHaveTextContent(en.analytics.pendingPeak);
  });

  it('shows a normal luteal phase for a full cycle', () => {
    renderWithProviders(<CycleAnalyticsView />, {
      observations: buildDemoObservations('2026-09-30'),
    });
    expect(summary()).toHaveTextContent(en.analytics.normalLuteal);
  });

  it('shows every cycle in the combined view', () => {
    renderWithProviders(<CycleAnalyticsView />, {
      observations: buildDemoObservations('2026-09-30'),
      selectedCycleId: 'all',
    });
    expect(screen.getByText(/All Cycles Combined/)).toBeInTheDocument();
    expect(screen.getByText('Cycle 2 (Started 2026-09-03)')).toBeInTheDocument();
    expect(screen.getByText('Cycle 1 (Started 2026-08-06)')).toBeInTheDocument();
  });

  it('opens and closes the mucus score guide', () => {
    renderWithProviders(<CycleAnalyticsView />, { observations: shortCycle });
    const toggle = screen.getByRole('button', { name: en.analytics.mcsGuideTitle });
    fireEvent.click(toggle);
    expect(
      within(toggle.parentElement as HTMLElement).getByText(en.analytics.mcsGuideText)
    ).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByText(en.analytics.mcsGuideText)).toBeNull();
  });
});
