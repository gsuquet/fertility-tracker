import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CycleStatsHeader } from '../CycleStatsHeader';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { buildDemoObservations } from '../../domain/demoData';
import { en } from '../../i18n';

const demo = buildDemoObservations('2026-09-30');
const dryDays = [
  makeObservation({ date: '2026-09-01', bleeding: 'H' }),
  makeObservation({ date: '2026-09-02', stretch: '0', intercourse: true }),
];

const LABELS = {
  'Cycle Length': en.stats.cycleLength,
  'Peak Day': en.stats.peakDay,
  'Luteal Phase': en.stats.lutealPhase,
  Intercourse: en.stats.intercourseCount,
};

const statValue = (stat: keyof typeof LABELS) =>
  screen.getByTitle(new RegExp(`^${LABELS[stat]}: `)).querySelector('.stat-value')?.textContent;

describe('CycleStatsHeader', () => {
  it('renders nothing without observations', () => {
    const { container } = renderWithProviders(<CycleStatsHeader />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the stats of the selected cycle', () => {
    renderWithProviders(<CycleStatsHeader />, { observations: demo });
    expect(statValue('Cycle Length')).toBe('28 days');
    expect(statValue('Peak Day')).toBe('CD 13 (2026-09-15)');
    expect(statValue('Luteal Phase')).toBe('15 days');
    expect(statValue('Intercourse')).toBe('3');
  });

  it('shows placeholders for a selected cycle without a peak', () => {
    renderWithProviders(<CycleStatsHeader />, { observations: dryDays });
    expect(statValue('Peak Day')).toBe('---');
    expect(statValue('Luteal Phase')).toBe('0 days');
    expect(statValue('Intercourse')).toBe('1');
  });

  it('shows averages and the latest peak for all cycles', () => {
    renderWithProviders(<CycleStatsHeader />, { observations: demo, selectedCycleId: 'all' });
    expect(statValue('Cycle Length')).toBe('28.0 days (avg)');
    expect(statValue('Peak Day')).toBe('CD 13 (2026-09-15)');
    expect(statValue('Luteal Phase')).toBe('15.0 days (avg)');
    expect(statValue('Intercourse')).toBe(String(demo.filter(o => o.intercourse).length));
  });

  it('shows placeholders for all cycles without a peak', () => {
    renderWithProviders(<CycleStatsHeader />, { observations: dryDays, selectedCycleId: 'all' });
    expect(statValue('Cycle Length')).toBe('2.0 days (avg)');
    expect(statValue('Peak Day')).toBe('---');
    expect(statValue('Luteal Phase')).toBe('0 days');
  });
});
