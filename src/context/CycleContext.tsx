import type React from 'react';
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Cycle, Observation, ObservationInput } from '../types/crms';
import { calculateStamp } from '../domain/stampCalculator';
import { formatCodeString } from '../domain/codeParser';
import { groupObservationsIntoCycles } from '../domain/cycleBoundaryDetector';
import { getTodayStr } from '../utils/dateUtils';
import { readStorage, removeStorage, writeStorage } from '../utils/storage';
import { buildDemoObservations } from '../domain/demoData';
import { parseAndValidateObservationsJson } from '../domain/dataValidator';
import { mergeObservations } from '../domain/backupImport';
import {
  STORAGE_OBSERVATIONS_KEY as STORAGE_KEY,
  STORAGE_RECOVERY_KEY as RECOVERY_KEY,
  STORAGE_UNDO_KEY as UNDO_KEY,
} from '../utils/storageKeys';
import type { ImportMode } from '../domain/backupImport';

/** A change that replaced the observations and that the saved copy can undo. */
export type DataChange = 'demo' | 'import' | 'merge' | 'clear' | 'earlier';

export interface CycleDataContextType {
  observations: Observation[];
  cycles: Cycle[];
  selectedCycleId: string;
  setSelectedCycleId: (id: string) => void;
  saveObservation: (obsData: ObservationInput) => void;
  deleteObservation: (id: string) => void;
  exportDataJson: () => string;
  /** Replaces the observations with a backup, or merges the backup into them. */
  importDataJson: (jsonStr: string, mode?: ImportMode) => boolean;
  clearAllData: () => void;
  loadDemoData: () => void;
  /** The original text of stored data that could not be read, or null. */
  recoveryData: string | null;
  /** True when the recovery key holds a copy of `recoveryData`. */
  recoveryKept: boolean;
  /** Deletes the kept copy of the unreadable data, or only hides the notice when there is none. */
  dismissRecovery: () => void;
  /** The last change that the saved copy can undo, or null when there is no copy. */
  undoChange: DataChange | null;
  /** Restores the observations from before the last replacing change. */
  undoLastChange: () => void;
  /** Deletes the copy and keeps the change. */
  dismissUndo: () => void;
  /** False when the browser refused to store the undo copy: undo then works until a reload. */
  undoPersisted: boolean;
}

export interface CycleUiContextType {
  selectedObservation: Observation | null;
  setSelectedObservation: (obs: Observation | null) => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
}

export type CycleContextType = CycleDataContextType & CycleUiContextType;

const CycleDataContext = createContext<CycleDataContextType | undefined>(undefined);
const CycleUiContext = createContext<CycleUiContextType | undefined>(undefined);

const reprocessObservations = (rawObs: Observation[]): Observation[] => {
  const groupedCycles = groupObservationsIntoCycles(rawObs);
  return groupedCycles.flatMap(c => c.observations).sort((a, b) => a.date.localeCompare(b.date));
};

/** Clears the manual Peak Day on the other days of the cycle that contains `date`. */
const keepOneManualPeak = (list: Observation[], date: string): Observation[] => {
  const cycleDates = new Set(
    groupObservationsIntoCycles(list)
      .find(c => c.observations.some(o => o.date === date))
      ?.observations.map(o => o.date)
  );
  return list.map(obs =>
    obs.date !== date && cycleDates.has(obs.date) ? { ...obs, isManualPeak: false } : obs
  );
};

/**
 * Reads the stored observations. When the stored text cannot be read, copies it to the
 * recovery key if that key is empty, and returns it as `recoveryData`. `recoveryKept` is
 * false when no copy was written: the app must then not save over the original text.
 */
const loadStoredState = () => {
  const raw = readStorage(STORAGE_KEY) ?? '[]';
  const validated = parseAndValidateObservationsJson(raw);
  if (validated === null) {
    const recoveryKept = readStorage(RECOVERY_KEY) === null && writeStorage(RECOVERY_KEY, raw);
    return { observations: [], recoveryData: raw, recoveryKept };
  }
  return {
    observations: reprocessObservations(validated),
    recoveryData: readStorage(RECOVERY_KEY),
    recoveryKept: true,
  };
};

interface UndoState {
  change: DataChange;
  observations: Observation[];
  persisted: boolean;
}

/** Reads the copy that an earlier session kept before a replacing change. */
const loadStoredUndo = (): UndoState | null => {
  const saved = parseAndValidateObservationsJson(readStorage(UNDO_KEY) ?? 'null');
  return saved ? { change: 'earlier', observations: saved, persisted: true } : null;
};

export const CycleDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialState] = useState(loadStoredState);
  const [observations, setObservations] = useState<Observation[]>(initialState.observations);
  const [recoveryData, setRecoveryData] = useState<string | null>(initialState.recoveryData);
  const { recoveryKept } = initialState;
  const [undo, setUndo] = useState<UndoState | null>(loadStoredUndo);

  const cycles = useMemo(() => groupObservationsIntoCycles(observations), [observations]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>(() => cycles[0]?.id ?? 'all');

  // Fall back to the newest cycle (or 'all') when the selected cycle no longer exists.
  useEffect(() => {
    const isKnown = selectedCycleId === 'all' || cycles.some(c => c.id === selectedCycleId);
    if (!isKnown) {
      setSelectedCycleId(cycles[0]?.id ?? 'all');
    }
  }, [cycles, selectedCycleId]);

  useEffect(() => {
    // Without a recovery copy, keep the unreadable original until the observations change.
    if (!recoveryKept && observations === initialState.observations) return;
    writeStorage(STORAGE_KEY, JSON.stringify(observations));
  }, [observations, recoveryKept, initialState.observations]);

  const dismissUndo = useCallback(() => {
    removeStorage(UNDO_KEY);
    setUndo(null);
  }, []);

  const saveObservation = useCallback(
    (obsData: ObservationInput) => {
      // A day saved after a replacing change would be lost on undo, so the copy goes.
      dismissUndo();
      setObservations(prev => {
        const date = obsData.date || getTodayStr();
        const existingIdx = prev.findIndex(o => o.date === date);

        const stamp = calculateStamp(obsData.bleeding, obsData.stretch, obsData.modifiers || []);
        const codeString = obsData.codeString || formatCodeString(obsData);

        const newObs: Observation = {
          id: obsData.id || `obs_${date}_${Date.now()}`,
          date,
          cycleDay: obsData.cycleDay || 1,
          bleeding: obsData.bleeding,
          stretch: obsData.stretch,
          modifiers: obsData.modifiers || [],
          frequency: obsData.frequency,
          symptoms: obsData.symptoms || [],
          intercourse: obsData.intercourse || false,
          notes: obsData.notes || '',
          isManualPeak: obsData.isManualPeak || false,
          isCycleStart: obsData.isCycleStart,
          stamp,
          codeString,
        };

        const updatedList = [...prev];
        if (existingIdx !== -1) {
          updatedList[existingIdx] = newObs;
        } else {
          updatedList.push(newObs);
        }

        return reprocessObservations(
          newObs.isManualPeak ? keepOneManualPeak(updatedList, date) : updatedList
        );
      });
    },
    [dismissUndo]
  );

  const deleteObservation = useCallback(
    (id: string) => {
      dismissUndo();
      setObservations(prev => reprocessObservations(prev.filter(o => o.id !== id)));
    },
    [dismissUndo]
  );

  const exportDataJson = useCallback(() => {
    return JSON.stringify(observations, null, 2);
  }, [observations]);

  const applyObservations = useCallback((list: Observation[]) => {
    const processed = reprocessObservations(list);
    setObservations(processed);
    setSelectedCycleId(groupObservationsIntoCycles(processed)[0]?.id ?? 'all');
  }, []);

  /**
   * Keeps a copy of the current observations, then replaces them. An existing copy stays:
   * it holds the oldest data, which a second change must not overwrite.
   */
  const replaceObservations = useCallback(
    (change: DataChange, list: Observation[]) => {
      if (undo) {
        setUndo({ ...undo, change });
      } else {
        const persisted = writeStorage(UNDO_KEY, JSON.stringify(observations));
        setUndo({ change, observations, persisted });
      }
      applyObservations(list);
    },
    [undo, observations, applyObservations]
  );

  /** Deletes all observations and the copy of unreadable data. The undo copy stays. */
  const clearAllData = useCallback(() => {
    replaceObservations('clear', []);
    removeStorage(RECOVERY_KEY);
    setRecoveryData(null);
  }, [replaceObservations]);

  const importDataJson = useCallback(
    (jsonStr: string, mode: ImportMode = 'replace'): boolean => {
      const validated = parseAndValidateObservationsJson(jsonStr);
      if (!validated) return false;
      if (mode === 'merge') {
        replaceObservations('merge', mergeObservations(observations, validated));
      } else {
        replaceObservations('import', validated);
      }
      return true;
    },
    [observations, replaceObservations]
  );

  const loadDemoData = useCallback(() => {
    replaceObservations('demo', buildDemoObservations(getTodayStr()));
  }, [replaceObservations]);

  const undoLastChange = useCallback(() => {
    if (!undo) return;
    applyObservations(undo.observations);
    dismissUndo();
  }, [undo, applyObservations, dismissUndo]);

  const dismissRecovery = useCallback(() => {
    if (recoveryKept) removeStorage(RECOVERY_KEY);
    setRecoveryData(null);
  }, [recoveryKept]);

  const dataValue = useMemo(
    () => ({
      observations,
      cycles,
      selectedCycleId,
      setSelectedCycleId,
      saveObservation,
      deleteObservation,
      exportDataJson,
      importDataJson,
      clearAllData,
      loadDemoData,
      recoveryData,
      recoveryKept,
      dismissRecovery,
      undoChange: undo ? undo.change : null,
      undoLastChange,
      dismissUndo,
      undoPersisted: undo ? undo.persisted : true,
    }),
    [
      observations,
      cycles,
      selectedCycleId,
      saveObservation,
      deleteObservation,
      exportDataJson,
      importDataJson,
      clearAllData,
      loadDemoData,
      recoveryData,
      recoveryKept,
      dismissRecovery,
      undo,
      undoLastChange,
      dismissUndo,
    ]
  );

  return <CycleDataContext.Provider value={dataValue}>{children}</CycleDataContext.Provider>;
};

export const CycleUiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const uiValue = useMemo(
    () => ({
      selectedObservation,
      setSelectedObservation,
      isDrawerOpen,
      setIsDrawerOpen,
    }),
    [selectedObservation, isDrawerOpen]
  );

  return <CycleUiContext.Provider value={uiValue}>{children}</CycleUiContext.Provider>;
};

export const CycleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <CycleDataProvider>
      <CycleUiProvider>{children}</CycleUiProvider>
    </CycleDataProvider>
  );
};

export const useCycleData = () => {
  const context = useContext(CycleDataContext);
  if (!context) throw new Error('useCycleData must be used within CycleProvider');
  return context;
};

export const useCycleUi = () => {
  const context = useContext(CycleUiContext);
  if (!context) throw new Error('useCycleUi must be used within CycleProvider');
  return context;
};

export const useCycle = (): CycleContextType => {
  const data = useCycleData();
  const ui = useCycleUi();
  return { ...data, ...ui };
};
