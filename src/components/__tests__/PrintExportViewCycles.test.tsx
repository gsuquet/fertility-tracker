import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PrintExportView } from '../PrintExportView';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { buildDemoObservations } from '../../domain/demoData';
import { en } from '../../i18n';

const demo = buildDemoObservations('2026-09-30');
const badges = () => screen.getAllByText(new RegExp(`^${en.chartStrip.cycleBadge} \\d$`));

describe('PrintExportView cycles', () => {
  it('prints an empty 35-day grid when there is no data', () => {
    const { container } = renderWithProviders(<PrintExportView selectedCycleIds={['all']} />);
    expect(badges().map(b => b.textContent)).toEqual([`${en.chartStrip.cycleBadge} 1`]);
    expect(container.querySelectorAll('.empty-cell')).toHaveLength(35);
    expect(container.querySelector('.print-peak-badge')).toBeNull();
  });

  it('prints every cycle from oldest to newest for all or no selection', () => {
    for (const ids of [['all'], []]) {
      const { unmount } = renderWithProviders(<PrintExportView selectedCycleIds={ids} />, {
        observations: demo,
      });
      expect(badges().map(b => b.textContent)).toEqual([
        `${en.chartStrip.cycleBadge} 1`,
        `${en.chartStrip.cycleBadge} 2`,
      ]);
      expect(
        screen.getAllByText(`${en.chartStrip.phasePeak}: Day 13`, { exact: false })
      ).toHaveLength(2);
      unmount();
    }
  });

  it('prints only the selected cycle', () => {
    renderWithProviders(<PrintExportView selectedCycleIds={['cycle_2026-08-06']} />, {
      observations: demo,
    });
    expect(badges().map(b => b.textContent)).toEqual([`${en.chartStrip.cycleBadge} 1`]);
    expect(screen.getByText('2026-08-06 → 2026-09-02')).toBeInTheDocument();
  });

  it('prints nothing for unknown cycles', () => {
    const { container } = renderWithProviders(<PrintExportView selectedCycleIds={['nope']} />, {
      observations: demo,
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('prints symptoms and notes but strips symptoms from the code', () => {
    renderWithProviders(<PrintExportView selectedCycleIds={['all']} />, {
      observations: [
        makeObservation({ date: '2026-09-01', bleeding: 'H', symptoms: ['AP'], notes: 'cramps' }),
        makeObservation({ date: '2026-09-02', bleeding: 'B', codeString: 'AP' }),
      ],
    });
    expect(screen.getByText('AP')).toHaveClass('print-symptoms');
    expect(screen.getByText('cramps')).toHaveAttribute('title', 'cramps');
    expect(screen.getByText('---')).toHaveClass('print-code');
  });

  it('adds a second grid row for a cycle longer than 35 days', () => {
    const longCycle = Array.from({ length: 40 }, (_, i) =>
      makeObservation({
        date: `2026-0${i < 30 ? 7 : 8}-${String((i % 30) + 1).padStart(2, '0')}`,
        ...(i === 0 ? { bleeding: 'H' as const } : { stretch: '0' as const }),
      })
    );
    const { container } = renderWithProviders(<PrintExportView selectedCycleIds={['all']} />, {
      observations: longCycle,
    });
    expect(container.querySelectorAll('.print-grid-row')).toHaveLength(2);
    expect(container.querySelectorAll('.filled-cell')).toHaveLength(40);
  });
});
