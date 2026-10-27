import type React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { CycleProvider, useCycleData } from '../CycleContext';
import { makeObservation } from '../../test/factories';

const STORAGE_KEY = 'fertility_care_observations';
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CycleProvider>{children}</CycleProvider>
);
const renderData = () => renderHook(() => useCycleData(), { wrapper });

describe('CycleDataProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads stored observations and selects the newest cycle', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        makeObservation({ date: '2026-06-01', bleeding: 'H' }),
        makeObservation({ date: '2026-06-02', stretch: '0' }),
        makeObservation({ date: '2026-06-29', bleeding: 'H' }),
      ])
    );
    const { result } = renderData();
    expect(result.current.observations).toHaveLength(3);
    expect(result.current.selectedCycleId).toBe('cycle_2026-06-29');
  });

  it('starts empty with "all" selected when stored data is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: '2026-06-01' }));
    const { result } = renderData();
    expect(result.current.observations).toEqual([]);
    expect(result.current.selectedCycleId).toBe('all');
  });

  it('saves today when no date is given and fills default fields', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 15, 12));
    const { result } = renderData();
    act(() => result.current.saveObservation({ stretch: '0' }));
    expect(result.current.observations[0]).toMatchObject({
      date: '2026-09-15',
      modifiers: [],
      symptoms: [],
      intercourse: false,
      notes: '',
      isManualPeak: false,
      codeString: '0',
      stamp: 'DARK_GREEN',
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toHaveLength(1);
  });

  it('replaces the observation for an existing date and keeps a given id and code string', () => {
    const { result } = renderData();
    act(() => result.current.saveObservation({ date: '2026-09-01', bleeding: 'H' }));
    act(() =>
      result.current.saveObservation({
        id: 'custom',
        date: '2026-09-01',
        stretch: '10',
        modifiers: ['K'],
        codeString: 'custom code',
        isManualPeak: true,
        cycleDay: 3,
      })
    );
    expect(result.current.observations).toHaveLength(1);
    expect(result.current.observations[0]).toMatchObject({
      id: 'custom',
      bleeding: undefined,
      codeString: 'custom code',
      stamp: 'WHITE_BABY',
      isPeakDay: true,
    });
  });

  it('moves the manual Peak Day to the toggled date and clears it on a second toggle', () => {
    const { result } = renderData();
    act(() =>
      result.current.saveObservation({ date: '2026-09-01', stretch: '10', modifiers: ['K'] })
    );
    act(() =>
      result.current.saveObservation({ date: '2026-09-02', stretch: '10', modifiers: ['K'] })
    );
    act(() => result.current.toggleManualPeak('2026-09-01'));
    expect(result.current.observations.map(o => o.isManualPeak)).toEqual([true, false]);
    act(() => result.current.toggleManualPeak('2026-09-01'));
    expect(result.current.observations.map(o => o.isManualPeak)).toEqual([false, false]);
  });

  it('deletes an observation by id', () => {
    const { result } = renderData();
    act(() =>
      result.current.saveObservation({ id: 'to-delete', date: '2026-09-01', bleeding: 'H' })
    );
    act(() => result.current.deleteObservation('to-delete'));
    expect(result.current.observations).toEqual([]);
  });

  it('falls back to the newest cycle when the selected cycle disappears', () => {
    const { result } = renderData();
    act(() => result.current.saveObservation({ date: '2026-09-01', bleeding: 'H' }));
    act(() => result.current.setSelectedCycleId('missing'));
    expect(result.current.selectedCycleId).toBe('cycle_2026-09-01');
  });

  it('falls back to "all" when the selected cycle disappears and there are no cycles', () => {
    const { result } = renderData();
    act(() => result.current.setSelectedCycleId('missing'));
    expect(result.current.selectedCycleId).toBe('all');
  });

  it('imports an empty list and selects "all"', () => {
    const { result } = renderData();
    act(() => result.current.loadDemoData());
    let imported = false;
    act(() => {
      imported = result.current.importDataJson('[]');
    });
    expect(imported).toBe(true);
    expect(result.current.observations).toEqual([]);
    expect(result.current.selectedCycleId).toBe('all');
  });

  it('rejects an import that is not valid JSON', () => {
    const { result } = renderData();
    expect(result.current.importDataJson('not json')).toBe(false);
  });

  it('loads demo data and selects its newest cycle', () => {
    const { result } = renderData();
    act(() => result.current.loadDemoData());
    expect(result.current.observations).toHaveLength(56);
    expect(result.current.selectedCycleId).toBe(result.current.cycles[0]?.id);
  });
});
