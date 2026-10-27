import type React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { CycleProvider, useCycleData } from '../CycleContext';
import { makeObservation } from '../../test/factories';
import { validateObservation } from '../../domain/dataValidator';

const STORAGE_KEY = 'fertility_care_observations';
const RECOVERY_KEY = 'fertility_care_observations_recovery';
const UNDO_KEY = 'fertility_care_observations_undo';
const LAST_BACKUP_KEY = 'fertility_care_last_backup';
const REMINDER_START_KEY = 'fertility_care_backup_reminder_start';
const SNOOZE_KEY = 'fertility_care_backup_snoozed_until';
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CycleProvider>{children}</CycleProvider>
);
const renderData = () => renderHook(() => useCycleData(), { wrapper });
/** The stored observations: a bare array, which 1.17 and older versions read. */
const storedList = (key = STORAGE_KEY): { date: string }[] =>
  JSON.parse(localStorage.getItem(key) ?? 'null');

/** The loader of version 1.17.x: it accepts only a JSON array of valid records. */
const legacyLoaderAccepts = (text: string): boolean => {
  const parsed: unknown = JSON.parse(text);
  return Array.isArray(parsed) && parsed.every(item => validateObservation(item) !== null);
};

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
    expect(storedList()).toHaveLength(1);
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
    expect(storedList()).toHaveLength(1);
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
    expect(storedList()).toHaveLength(1);
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
    const storedUndoDates = () => storedList(UNDO_KEY).map(o => o.date);

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

    it('merges an import into the current days and undoes the merge', () => {
      const { result } = renderSaved();
      const file = [
        makeObservation({ date: '2026-06-02', stretch: '10', modifiers: ['K'] }),
        makeObservation({ date: '2026-06-03', stretch: '0' }),
      ];
      act(() => {
        result.current.importDataJson(JSON.stringify(file), 'merge');
      });
      expect(result.current.observations.map(o => [o.date, o.stretch])).toEqual([
        ['2026-06-01', undefined],
        ['2026-06-02', '10'],
        ['2026-06-03', '0'],
      ]);
      expect(result.current.undoChange).toBe('merge');

      act(() => result.current.undoLastChange());
      expect(result.current.observations.map(o => [o.date, o.stretch])).toEqual([
        ['2026-06-01', undefined],
        ['2026-06-02', '0'],
      ]);
    });

    it('keeps the oldest copy when a second change follows, so undo restores the real data', () => {
      const { result } = renderSaved();
      act(() => result.current.loadDemoData());
      act(() => result.current.clearAllData());
      expect(result.current.undoChange).toBe('clear');
      expect(storedUndoDates()).toEqual(['2026-06-01', '2026-06-02']);
      act(() => result.current.undoLastChange());
      expect(result.current.observations.map(o => o.date)).toEqual(['2026-06-01', '2026-06-02']);
    });

    it('deletes the copy when an observation is saved or deleted after the change', () => {
      const { result } = renderSaved();
      act(() => result.current.clearAllData());
      act(() => result.current.saveObservation({ date: '2026-06-10', stretch: '0' }));
      expect(result.current.undoChange).toBeNull();
      expect(localStorage.getItem(UNDO_KEY)).toBeNull();

      act(() => result.current.loadDemoData());
      act(() => result.current.deleteObservation(result.current.observations[0]?.id as string));
      expect(result.current.undoChange).toBeNull();
      expect(localStorage.getItem(UNDO_KEY)).toBeNull();
    });

    it('says when the copy could not be saved and still undoes in memory', () => {
      const setItem = localStorage.setItem.bind(localStorage);
      const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
        if (key === UNDO_KEY) throw new Error('QuotaExceededError');
        setItem(key, value);
      });
      const { result } = renderSaved();
      expect(result.current.undoPersisted).toBe(true);
      act(() => result.current.clearAllData());
      expect(result.current.undoPersisted).toBe(false);
      act(() => result.current.undoLastChange());
      expect(result.current.observations).toHaveLength(2);
      expect(result.current.undoPersisted).toBe(true);
      spy.mockRestore();
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

    it('offers a copy in the versioned envelope', () => {
      localStorage.setItem(UNDO_KEY, JSON.stringify({ schemaVersion: 1, observations: saved }));
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

  describe('storage format', () => {
    const legacy = [
      makeObservation({ date: '2026-06-01', bleeding: 'H', codeString: 'H' }),
      makeObservation({ date: '2026-06-02', stretch: '10', modifiers: ['K'], notes: 'n' }),
    ];

    it('loads the bare array of an older version without loss and writes a bare array', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
      const { result } = renderData();
      expect(result.current.observations.map(o => [o.date, o.stretch, o.notes])).toEqual([
        ['2026-06-01', undefined, ''],
        ['2026-06-02', '10', 'n'],
      ]);
      expect(storedList().map(o => o.date)).toEqual(['2026-06-01', '2026-06-02']);
      expect(result.current.recoveryData).toBeNull();
      expect(result.current.droppedCount).toBe(0);
    });

    it('calculates the code string again on load', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
      const { result } = renderData();
      expect(result.current.observations.map(o => o.codeString)).toEqual(['H', '10K']);
    });

    it('treats a newer schema version as unreadable and keeps it', () => {
      const newer = JSON.stringify({ schemaVersion: 2, observations: legacy });
      localStorage.setItem(STORAGE_KEY, newer);
      const { result } = renderData();
      expect(result.current.observations).toEqual([]);
      expect(result.current.recoveryData).toBe(newer);
      expect(localStorage.getItem(RECOVERY_KEY)).toBe(newer);
    });

    it('loads the versioned envelope and writes it back as a bare array', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, observations: legacy }));
      const { result } = renderData();
      expect(result.current.observations).toHaveLength(2);
      expect(storedList()).toHaveLength(2);
    });

    it('writes the stored value, the undo copy and the backup in a format that 1.17 reads', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, observations: legacy }));
      const { result } = renderData();
      const backup = result.current.exportDataJson();
      expect(legacyLoaderAccepts(backup)).toBe(true);
      expect(JSON.parse(backup)).toHaveLength(2);
      act(() => result.current.loadDemoData());
      expect(legacyLoaderAccepts(localStorage.getItem(STORAGE_KEY) as string)).toBe(true);
      expect(legacyLoaderAccepts(localStorage.getItem(UNDO_KEY) as string)).toBe(true);
      expect(storedList(UNDO_KEY)).toHaveLength(2);
      expect(storedList()).toHaveLength(56);
    });

    it('imports a backup in the envelope and an old bare-array backup', () => {
      const { result } = renderData();
      act(() => {
        result.current.importDataJson(JSON.stringify({ schemaVersion: 1, observations: legacy }));
      });
      expect(result.current.observations).toHaveLength(2);
      act(() => {
        result.current.importDataJson(JSON.stringify([legacy[0]]));
      });
      expect(result.current.observations.map(o => o.date)).toEqual(['2026-06-01']);
    });
  });

  describe('dropped records', () => {
    const withInvalid = JSON.stringify([
      makeObservation({ date: '2026-06-01', bleeding: 'H' }),
      { date: 'broken' },
      makeObservation({ date: '2026-06-02', stretch: '0' }),
    ]);

    it('shows the valid records and keeps a copy of the original text', () => {
      localStorage.setItem(STORAGE_KEY, withInvalid);
      const { result } = renderData();
      expect(result.current.observations).toHaveLength(2);
      expect(result.current.droppedCount).toBe(1);
      expect(result.current.recoveryData).toBe(withInvalid);
      expect(result.current.recoveryKept).toBe(true);
      expect(localStorage.getItem(RECOVERY_KEY)).toBe(withInvalid);
      expect(storedList()).toHaveLength(2);
    });

    it('still gives the number of dropped records after a reload', () => {
      localStorage.setItem(STORAGE_KEY, withInvalid);
      renderData().unmount();
      const { result } = renderData();
      expect(result.current.recoveryData).toBe(withInvalid);
      expect(result.current.recoveryKept).toBe(true);
      expect(result.current.droppedCount).toBe(1);
    });

    it('gives no dropped records for a kept copy that is not readable', () => {
      localStorage.setItem(RECOVERY_KEY, '{corrupt');
      expect(renderData().result.current.droppedCount).toBe(0);
    });

    it('keeps the original text in its key when the copy cannot be kept', () => {
      localStorage.setItem(RECOVERY_KEY, 'old copy');
      localStorage.setItem(STORAGE_KEY, withInvalid);
      const { result } = renderData();
      expect(result.current.droppedCount).toBe(1);
      expect(result.current.recoveryKept).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(withInvalid);
      expect(localStorage.getItem(RECOVERY_KEY)).toBe('old copy');
      act(() => result.current.saveObservation({ date: '2026-06-03', stretch: '0' }));
      expect(storedList()).toHaveLength(3);
    });
  });

  describe('save failures', () => {
    it('reports a refused write and clears the report after a write that succeeds', () => {
      const setItem = localStorage.setItem.bind(localStorage);
      let refuse = true;
      const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
        if (key === STORAGE_KEY && refuse) throw new Error('QuotaExceededError');
        setItem(key, value);
      });
      const { result } = renderData();
      expect(result.current.saveFailed).toBe(true);
      act(() => result.current.saveObservation({ date: '2026-06-01', stretch: '0' }));
      expect(result.current.saveFailed).toBe(true);
      expect(result.current.observations).toHaveLength(1);
      refuse = false;
      act(() => result.current.saveObservation({ date: '2026-06-02', stretch: '0' }));
      expect(result.current.saveFailed).toBe(false);
      expect(storedList()).toHaveLength(2);
      spy.mockRestore();
    });

    it('has no failure when the writes succeed', () => {
      expect(renderData().result.current.saveFailed).toBe(false);
    });
  });

  describe('persistent storage', () => {
    afterEach(() => {
      Reflect.deleteProperty(navigator, 'storage');
    });

    it('asks the browser once to keep the data when observations exist', () => {
      const persist = vi.fn().mockResolvedValue(true);
      Object.defineProperty(navigator, 'storage', { value: { persist }, configurable: true });
      const { result } = renderData();
      expect(persist).not.toHaveBeenCalled();
      act(() => result.current.saveObservation({ date: '2026-06-01', stretch: '0' }));
      act(() => result.current.clearAllData());
      act(() => result.current.saveObservation({ date: '2026-06-02', stretch: '0' }));
      expect(persist).toHaveBeenCalledTimes(1);
    });
  });

  describe('last backup date', () => {
    it('reads the stored date and records a new backup with the date of today', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 9, 27, 12));
      localStorage.setItem(LAST_BACKUP_KEY, '2026-09-01');
      const { result } = renderData();
      expect(result.current.lastBackupDate).toBe('2026-09-01');
      act(() => result.current.markBackedUp());
      expect(result.current.lastBackupDate).toBe('2026-10-27');
      expect(localStorage.getItem(LAST_BACKUP_KEY)).toBe('2026-10-27');
    });

    it('has no date before the first backup', () => {
      expect(renderData().result.current.lastBackupDate).toBeNull();
    });

    it('starts the reminder period on the first load and keeps that date', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 9, 27, 12));
      expect(renderData().result.current.backupReminderStart).toBe('2026-10-27');
      expect(localStorage.getItem(REMINDER_START_KEY)).toBe('2026-10-27');
      vi.setSystemTime(new Date(2026, 11, 1, 12));
      expect(renderData().result.current.backupReminderStart).toBe('2026-10-27');
    });

    it('snoozes the reminder for 7 days', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 9, 27, 12));
      const { result } = renderData();
      expect(result.current.backupSnoozedUntil).toBeNull();
      act(() => result.current.snoozeBackupReminder());
      expect(result.current.backupSnoozedUntil).toBe('2026-11-03');
      expect(localStorage.getItem(SNOOZE_KEY)).toBe('2026-11-03');
      expect(renderData().result.current.backupSnoozedUntil).toBe('2026-11-03');
    });
  });
});
