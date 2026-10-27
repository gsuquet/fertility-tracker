import type React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { CycleProvider, useCycleData } from '../CycleContext';
import { makeObservation } from '../../test/factories';

const STORAGE_KEY = 'fertility_care_observations';
const RECOVERY_KEY = 'fertility_care_observations_recovery';
const UNDO_KEY = 'fertility_care_observations_undo';
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

  it('copies unreadable stored data to the recovery key before it saves', () => {
    localStorage.setItem(STORAGE_KEY, '[{"date": "2026-06-01"');
    const { result } = renderData();
    expect(localStorage.getItem(RECOVERY_KEY)).toBe('[{"date": "2026-06-01"');
    expect(result.current.recoveryData).toBe('[{"date": "2026-06-01"');
    expect(result.current.recoveryKept).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]');
    act(() => result.current.saveObservation({ date: '2026-06-02', stretch: '0' }));
    expect(localStorage.getItem(RECOVERY_KEY)).toBe('[{"date": "2026-06-01"');
  });

  it('copies stored data that is not an array and deletes the copy on dismiss', () => {
    const raw = JSON.stringify({ date: '2026-06-01' });
    localStorage.setItem(STORAGE_KEY, raw);
    const { result } = renderData();
    expect(result.current.recoveryData).toBe(raw);
    act(() => result.current.dismissRecovery());
    expect(result.current.recoveryData).toBeNull();
    expect(localStorage.getItem(RECOVERY_KEY)).toBeNull();
  });

  it('keeps a pending recovery copy and the original data when the data is unreadable again', () => {
    localStorage.setItem(RECOVERY_KEY, 'old copy');
    localStorage.setItem(STORAGE_KEY, 'new unreadable');
    const { result } = renderData();
    expect(result.current.recoveryData).toBe('new unreadable');
    expect(result.current.recoveryKept).toBe(false);
    expect(localStorage.getItem(RECOVERY_KEY)).toBe('old copy');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('new unreadable');
    act(() => result.current.dismissRecovery());
    expect(result.current.recoveryData).toBeNull();
    expect(localStorage.getItem(RECOVERY_KEY)).toBe('old copy');
    act(() => result.current.saveObservation({ date: '2026-06-02', stretch: '0' }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '')).toHaveLength(1);
  });

  it('does not overwrite the original data when the recovery copy fails', () => {
    const setItem = localStorage.setItem.bind(localStorage);
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === RECOVERY_KEY) throw new Error('QuotaExceededError');
      setItem(key, value);
    });
    localStorage.setItem(STORAGE_KEY, '{corrupt');
    const { result } = renderData();
    expect(result.current.recoveryData).toBe('{corrupt');
    expect(result.current.recoveryKept).toBe(false);
    expect(localStorage.getItem(RECOVERY_KEY)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{corrupt');
    act(() => result.current.saveObservation({ date: '2026-06-02', stretch: '0' }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '')).toHaveLength(1);
    spy.mockRestore();
  });

  it('deletes the recovery copy when all data is cleared', () => {
    localStorage.setItem(STORAGE_KEY, '{corrupt');
    const { result } = renderData();
    act(() => result.current.clearAllData());
    expect(result.current.recoveryData).toBeNull();
    expect(localStorage.getItem(RECOVERY_KEY)).toBeNull();
  });

  it('keeps the recovery copy from an earlier session and has none for valid data', () => {
    localStorage.setItem(RECOVERY_KEY, 'old text');
    const earlier = renderData().result.current;
    expect(earlier.recoveryData).toBe('old text');
    expect(earlier.recoveryKept).toBe(true);
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, '[]');
    expect(renderData().result.current.recoveryData).toBeNull();
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

  it('keeps one manual Peak Day per cycle when a Peak Day is saved', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        makeObservation({ date: '2026-06-01', bleeding: 'H' }),
        makeObservation({
          date: '2026-06-10',
          stretch: '10',
          modifiers: ['K'],
          isManualPeak: true,
        }),
        makeObservation({ date: '2026-06-29', bleeding: 'H' }),
        makeObservation({ date: '2026-07-08', stretch: '10', modifiers: ['K'] }),
      ])
    );
    const { result } = renderData();
    const manualPeaks = () =>
      result.current.observations.filter(o => o.isManualPeak).map(o => o.date);
    const peakDays = () => result.current.observations.filter(o => o.isPeakDay).map(o => o.date);
    act(() =>
      result.current.saveObservation({
        date: '2026-07-08',
        stretch: '10',
        modifiers: ['K'],
        isManualPeak: true,
      })
    );
    expect(manualPeaks()).toEqual(['2026-06-10', '2026-07-08']);
    act(() =>
      result.current.saveObservation({
        date: '2026-07-10',
        stretch: '10',
        modifiers: ['K'],
        isManualPeak: true,
      })
    );
    expect(manualPeaks()).toEqual(['2026-06-10', '2026-07-10']);
    expect(peakDays()).toEqual(['2026-06-10', '2026-07-10']);
    act(() => result.current.saveObservation({ date: '2026-07-10', stretch: '0' }));
    expect(manualPeaks()).toEqual(['2026-06-10']);
  });

  it('clears the manual Peak Day of the cycle that a saved day joins', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        makeObservation({ date: '2026-06-01', bleeding: 'H' }),
        makeObservation({
          date: '2026-06-10',
          stretch: '10',
          modifiers: ['K'],
          isManualPeak: true,
        }),
        makeObservation({ date: '2026-06-29', bleeding: 'H' }),
      ])
    );
    const { result } = renderData();
    act(() =>
      result.current.saveObservation({
        date: '2026-06-12',
        stretch: '10',
        modifiers: ['K'],
        isManualPeak: true,
      })
    );
    const peaks = result.current.observations.filter(o => o.isManualPeak).map(o => o.date);
    expect(peaks).toEqual(['2026-06-12']);
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
  describe('undo of replaced data', () => {
    const saved = [
      makeObservation({ date: '2026-06-01', bleeding: 'H' }),
      makeObservation({ date: '2026-06-02', stretch: '0' }),
    ];
    const renderSaved = () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      return renderData();
    };
    const storedUndoDates = () =>
      (JSON.parse(localStorage.getItem(UNDO_KEY) as string) as { date: string }[]).map(o => o.date);

    it('has nothing to undo at the start', () => {
      const { result } = renderSaved();
      expect(result.current.undoChange).toBeNull();
      expect(localStorage.getItem(UNDO_KEY)).toBeNull();
    });

    it('keeps a copy before the demo data and restores it on undo', () => {
      const { result } = renderSaved();
      act(() => result.current.loadDemoData());
      expect(result.current.undoChange).toBe('demo');
      expect(storedUndoDates()).toEqual(['2026-06-01', '2026-06-02']);

      act(() => result.current.undoLastChange());
      expect(result.current.observations.map(o => o.date)).toEqual(['2026-06-01', '2026-06-02']);
      expect(result.current.selectedCycleId).toBe('cycle_2026-06-01');
      expect(result.current.undoChange).toBeNull();
      expect(localStorage.getItem(UNDO_KEY)).toBeNull();
    });

    it('keeps a copy before an import and before clearing', () => {
      const { result } = renderSaved();
      act(() => {
        result.current.importDataJson('[]');
      });
      expect(result.current.undoChange).toBe('import');
      expect(storedUndoDates()).toEqual(['2026-06-01', '2026-06-02']);

      act(() => result.current.undoLastChange());
      act(() => result.current.clearAllData());
      expect(result.current.undoChange).toBe('clear');
      expect(storedUndoDates()).toEqual(['2026-06-01', '2026-06-02']);
    });

    it('does not keep a copy when an import fails', () => {
      const { result } = renderSaved();
      act(() => {
        result.current.importDataJson('not json');
      });
      expect(result.current.undoChange).toBeNull();
      expect(localStorage.getItem(UNDO_KEY)).toBeNull();
    });

    it('keeps the change and deletes the copy on dismiss', () => {
      const { result } = renderSaved();
      act(() => result.current.clearAllData());
      act(() => result.current.dismissUndo());
      expect(result.current.observations).toEqual([]);
      expect(result.current.undoChange).toBeNull();
      expect(localStorage.getItem(UNDO_KEY)).toBeNull();
    });

    it('offers the copy that an earlier session kept', () => {
      localStorage.setItem(UNDO_KEY, JSON.stringify(saved));
      const { result } = renderData();
      expect(result.current.undoChange).toBe('earlier');
      act(() => result.current.undoLastChange());
      expect(result.current.observations).toHaveLength(2);
    });

    it('ignores a copy that it cannot read', () => {
      localStorage.setItem(UNDO_KEY, 'not json');
      const { result } = renderData();
      expect(result.current.undoChange).toBeNull();
    });

    it('does nothing on undo when there is no copy', () => {
      const { result } = renderSaved();
      act(() => result.current.undoLastChange());
      expect(result.current.observations).toHaveLength(2);
    });
  });
});
