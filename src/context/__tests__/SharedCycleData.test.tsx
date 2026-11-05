import type React from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ObservationInput } from '../../types/crms';
import {
  CycleDataOverride,
  CycleProvider,
  useCycleData,
  useSharedCycleData,
} from '../CycleContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CycleProvider>{children}</CycleProvider>
);

/** Two cycles: the second starts with heavy bleeding after a dry day. */
const shared: ObservationInput[] = [
  { date: '2026-09-01', bleeding: 'H' },
  { date: '2026-09-02', bleeding: 'H', notes: 'Note', isManualPeak: true },
  { date: '2026-09-29', bleeding: 'H', isCycleStart: true },
];

describe('useSharedCycleData', () => {
  it('gives null without a shared chart', () => {
    const { result } = renderHook(() => useSharedCycleData(null), { wrapper });
    expect(result.current).toBeNull();
  });

  it('gives the shared days read only, with the newest cycle until the user selects one', () => {
    localStorage.setItem(
      'fertility_care_observations',
      JSON.stringify([{ id: 'own', date: '2026-08-01', bleeding: 'L', cycleDay: 1 }])
    );
    const { result } = renderHook(
      () => ({ shared: useSharedCycleData(shared), own: useCycleData() }),
      { wrapper }
    );
    const data = result.current.shared;
    if (!data) throw new Error('No shared data');
    expect(data.readOnly).toBe(true);
    expect(result.current.own.readOnly).toBe(false);
    expect(data.observations.map(o => [o.id, o.date])).toEqual([
      ['shared_2026-09-01', '2026-09-01'],
      ['shared_2026-09-02', '2026-09-02'],
      ['shared_2026-09-29', '2026-09-29'],
    ]);
    expect(data.observations[1]).toMatchObject({ notes: 'Note', isManualPeak: true, cycleDay: 2 });
    expect(data.cycles).toHaveLength(2);
    expect(data.selectedCycleId).toBe(data.cycles[0]?.id);
    // The other fields are those of the device
    expect(data.lastBackupDate).toBe(result.current.own.lastBackupDate);

    act(() => data.setSelectedCycleId(data.cycles[1]?.id as string));
    expect(result.current.shared?.selectedCycleId).toBe(data.cycles[1]?.id);
    act(() => result.current.shared?.setSelectedCycleId('all'));
    expect(result.current.shared?.selectedCycleId).toBe('all');
    // An unknown cycle gives the newest cycle again
    act(() => result.current.shared?.setSelectedCycleId('gone'));
    expect(result.current.shared?.selectedCycleId).toBe(data.cycles[0]?.id);

    // Nothing changes the shared chart or the own days
    act(() => {
      result.current.shared?.saveObservation({ date: '2026-09-03', bleeding: 'M' });
      result.current.shared?.deleteObservation('shared_2026-09-01');
    });
    expect(result.current.shared?.observations).toHaveLength(3);
    expect(result.current.own.observations.map(o => o.id)).toEqual(['own']);
  });

  it('gives no cycle for an empty shared chart', () => {
    const { result } = renderHook(() => useSharedCycleData([]), { wrapper });
    expect(result.current?.cycles).toEqual([]);
    expect(result.current?.selectedCycleId).toBe('all');
  });
});

const Count = () => <span data-testid="count">{useCycleData().observations.length}</span>;
const Shared = ({ inputs }: { inputs: ObservationInput[] | null }) => (
  <CycleDataOverride value={useSharedCycleData(inputs)}>
    <Count />
  </CycleDataOverride>
);

describe('CycleDataOverride', () => {
  it('gives the shared data to its children, or keeps the own data', () => {
    const { rerender } = render(
      <CycleProvider>
        <Shared inputs={shared} />
      </CycleProvider>
    );
    expect(screen.getByTestId('count')).toHaveTextContent('3');
    rerender(
      <CycleProvider>
        <Shared inputs={null} />
      </CycleProvider>
    );
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });
});
