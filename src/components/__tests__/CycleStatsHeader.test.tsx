import { screen, within } from '@testing-library/react';
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

/** The text of the tile with this label: the label, the value with its unit and the detail */
const tile = (label: string) =>
  within(screen.getByRole('list', { name: en.stats.label }))
    .getByText(label)
    .closest('li')
    ?.textContent?.replace(label, '');

describe('CycleStatsHeader', () => {
  it('renders nothing without observations', () => {
    const { container } = renderWithProviders(<CycleStatsHeader />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows four tiles with the values and the details of the selected cycle', () => {
    renderWithProviders(<CycleStatsHeader />, { observations: demo });
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(tile(en.stats.cycleLength)).toBe('28 daysSep 3 – Sep 30');
    expect(tile(en.stats.peakDay)).toBe('CD 13Sep 15');
    expect(tile(en.stats.lutealPhase)).toBe(`15 days${en.stats.afterPeak}`);
    expect(tile(en.stats.intercourseCount)).toBe(`3 days${en.stats.inThisCycle}`);
  });

  it('shows no Peak Day and no luteal phase before the Peak Day', () => {
    renderWithProviders(<CycleStatsHeader />, { observations: dryDays });
    expect(tile(en.stats.peakDay)).toBe(`---${en.stats.notYet}`);
    expect(tile(en.stats.lutealPhase)).toBe(`---${en.stats.afterPeak}`);
    expect(tile(en.stats.intercourseCount)).toBe(`1 days${en.stats.inThisCycle}`);
  });

  it('shows the averages and the latest Peak Day for all cycles', () => {
    renderWithProviders(<CycleStatsHeader />, { observations: demo, selectedCycleId: 'all' });
    expect(tile(en.stats.cycleLength)).toBe('28 daysAverage of 2 cycles');
    expect(tile(en.stats.peakDay)).toBe('CD 13Sep 15');
    expect(tile(en.stats.lutealPhase)).toBe('15 daysAverage of 2 cycles');
    expect(tile(en.stats.intercourseCount)).toBe(
      `${demo.filter(o => o.intercourse).length} days${en.stats.inAllCycles}`
    );
  });

  it('shows decimals, and no luteal phase, for all cycles without a Peak Day', () => {
    renderWithProviders(<CycleStatsHeader />, {
      observations: [...dryDays, makeObservation({ date: '2026-09-03', bleeding: 'H' })],
      selectedCycleId: 'all',
    });
    expect(tile(en.stats.cycleLength)).toBe('1.5 daysAverage of 2 cycles');
    expect(tile(en.stats.peakDay)).toBe(`---${en.stats.notYet}`);
    expect(tile(en.stats.lutealPhase)).toBe(`---${en.stats.afterPeak}`);
  });
});
