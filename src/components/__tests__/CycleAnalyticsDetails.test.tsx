import { screen, fireEvent } from '@testing-library/react';
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

const demo = () => buildDemoObservations('2026-09-30');
const summaryValue = (label: string) => screen.getByText(label).nextElementSibling;
const phaseBar = () => screen.getByRole('img');
const scoreOf = (cycleDay: number) =>
  screen
    .getByTitle(new RegExp(`^CD ${cycleDay}: .*\\(Score: (\\d+)\\)$`))
    .title.match(/Score: (\d+)/)?.[1];
const stampCount = (label: string) =>
  [...document.querySelectorAll('.stamp-count')]
    .find(row => row.querySelector('.stamp-count-label')?.textContent === label)
    ?.querySelector('.stamp-count-value')?.textContent;

describe('CycleAnalyticsView details', () => {
  it('scores every stretch and modifier on the trend chart, with a bar height of 10 % a point', () => {
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
    const bar = (cycleDay: number) =>
      screen.getByTitle(new RegExp(`^CD ${cycleDay}: `)).querySelector('.trend-bar');
    expect(bar(5)).toHaveStyle({ height: '60%' });
    expect(bar(5)).toHaveClass('bar-fertile');
    expect(bar(4)).toHaveClass('bar-dry');
    expect(bar(10)).toHaveClass('bar-peak');
  });

  it('names day 1 and each fifth day on the trend axis', () => {
    renderWithProviders(<CycleAnalyticsView />, { observations: shortCycle });
    const labels = [...document.querySelectorAll('.trend-bar-label')].map(l => l.textContent);
    expect(labels.filter(Boolean)).toEqual(['1', '5', '10']);
  });

  it('shows the four phases in one bar, with the days of each', () => {
    renderWithProviders(<CycleAnalyticsView />, { observations: demo() });
    expect(phaseBar()).toHaveAccessibleName(
      'Menses: 4 days, Before Peak Day: 9 days, Post-Peak count: 3 days, After the count: 12 days'
    );
    expect([...phaseBar().children].map(part => part.textContent)).toEqual(['4', '9', '3', '12']);
    expect(screen.queryByText(en.analytics.noPeakYet)).toBeNull();
  });

  it('leaves out the empty phases and says that the Peak Day is not there yet', () => {
    renderWithProviders(<CycleAnalyticsView />, { observations: shortCycle.slice(0, 4) });
    expect([...phaseBar().children].map(part => part.textContent)).toEqual(['1', '3']);
    expect(screen.getByText(en.analytics.noPeakYet)).toBeInTheDocument();
    expect(summaryValue(en.analytics.lutealHealth)).toHaveTextContent(en.analytics.pendingPeak);
  });

  it('counts the stamps of the cycle', () => {
    renderWithProviders(<CycleAnalyticsView />, { observations: demo() });
    expect(stampCount(en.analytics.stampBleeding)).toBe('4');
    expect(stampCount(en.analytics.stampDry)).toBe('18');
    expect(stampCount(en.analytics.stampFertile)).toBe('3');
    expect(stampCount(en.analytics.stampCount)).toBe('3');
  });

  it('flags a short luteal phase', () => {
    renderWithProviders(<CycleAnalyticsView />, { observations: shortCycle });
    expect(summaryValue(en.analytics.lutealHealth)).toHaveTextContent(en.analytics.abnormalLuteal);
    expect(summaryValue(en.analytics.lutealHealth)).toHaveClass('is-abnormal');
  });

  it('shows a normal luteal phase and the average mucus score, without the numbers of the tiles', () => {
    renderWithProviders(<CycleAnalyticsView />, { observations: demo() });
    expect(summaryValue(en.analytics.lutealHealth)).toHaveTextContent(en.analytics.normalLuteal);
    expect(summaryValue(en.analytics.lutealHealth)).toHaveClass('is-normal');
    expect(summaryValue(en.analytics.avgMucusScore)?.textContent).toMatch(/^\d+\.\d$/);
    expect(screen.queryByText(en.labels.peakDay)).toBeNull();
    expect(screen.queryByText(en.stats.intercourseCount)).toBeNull();
  });

  it('shows every cycle and the averages in the combined view', () => {
    renderWithProviders(<CycleAnalyticsView />, { observations: demo(), selectedCycleId: 'all' });
    expect(screen.getByRole('heading', { name: en.analytics.stampsTitleAll })).toBeInTheDocument();
    expect(screen.getByText('Cycle 2 (Started 2026-09-03)')).toBeInTheDocument();
    expect(screen.getByText('Cycle 1 (Started 2026-08-06)')).toBeInTheDocument();
    expect([...phaseBar().children].map(part => part.textContent)).toEqual(['4', '9', '3', '12']);
    expect(summaryValue(en.analytics.lutealHealth)).toHaveTextContent(en.analytics.normalLuteal);
  });

  it('shows decimals and a pending peak when the combined averages need them', () => {
    renderWithProviders(<CycleAnalyticsView />, {
      // Two cycles of two and one days, neither with a Peak Day
      observations: [
        makeObservation({ date: '2026-08-01', bleeding: 'H' }),
        makeObservation({ date: '2026-08-02', stretch: '0' }),
        makeObservation({ date: '2026-08-03', bleeding: 'H' }),
      ],
      selectedCycleId: 'all',
    });
    expect([...phaseBar().children].map(part => part.textContent)).toEqual(['1', '0.5']);
    expect(summaryValue(en.analytics.lutealHealth)).toHaveTextContent(en.analytics.pendingPeak);
  });

  it('opens and closes the mucus score guide', () => {
    renderWithProviders(<CycleAnalyticsView />, { observations: shortCycle });
    const toggle = screen.getByRole('button', { name: en.analytics.mcsGuideTitle });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(en.analytics.mcsGuideText).closest('#mcs-guide-body')).not.toBeNull();
    fireEvent.click(toggle);
    expect(screen.queryByText(en.analytics.mcsGuideText)).toBeNull();
  });
});
