import type React from 'react';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import type { Cycle, Observation, ObservationInput } from '../types/crms';
import { calculateStamp } from '../domain/stampCalculator';
import { formatCodeString } from '../domain/codeParser';
import { groupObservationsIntoCycles } from '../domain/cycleBoundaryDetector';
import { addDays, getTodayStr } from '../utils/dateUtils';
import { BACKUP_SNOOZE_DAYS } from '../domain/backupReminder';
import {
  readStorage,
  removeStorage,
  requestPersistentStorage,
  writeStorage,
} from '../utils/storage';
import { buildDemoObservations } from '../domain/demoData';
import { parseObservationData, serializeObservations } from '../domain/storageFormat';
import { mergeObservations } from '../domain/backupImport';
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
  /** The number of stored records that failed validation at load, or 0. */
  droppedCount: number;
  /** True when the browser refused the last write of the observations. */
  saveFailed: boolean;
  /** The date (`YYYY-MM-DD`) of the last JSON backup, or null. */
  lastBackupDate: string | null;
  /** Records today as the date of the last JSON backup. */
  markBackedUp: () => void;
  /** The date of the first load with the backup reminder: the start of the first period. */
  backupReminderStart: string | null;
  /** The backup reminder stays hidden before this date, or null. */
  backupSnoozedUntil: string | null;
  /** Hides the backup reminder for `BACKUP_SNOOZE_DAYS` days. */
  snoozeBackupReminder: () => void;
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

const STORAGE_KEY = 'fertility_care_observations';
const RECOVERY_KEY = 'fertility_care_observations_recovery';
const UNDO_KEY = 'fertility_care_observations_undo';
const LAST_BACKUP_KEY = 'fertility_care_last_backup';
const REMINDER_START_KEY = 'fertility_care_backup_reminder_start';
const SNOOZE_KEY = 'fertility_care_backup_snoozed_until';

/** Reads the start of the reminder period, and stores today on the first load. */
const loadReminderStart = (): string => {
  const stored = readStorage(REMINDER_START_KEY);
  if (stored !== null) return stored;
  const today = getTodayStr();
  writeStorage(REMINDER_START_KEY, today);
  return today;
};

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
 * Reads the stored observations in either storage format. When the stored text cannot be
 * read, or some of its records fail validation, copies the text to the recovery key if that
 * key is empty, and returns it as `recoveryData`. `recoveryKept` is false when no copy was
 * written: the app must then not save over the original text.
 */
const loadStoredState = () => {
  const raw = readStorage(STORAGE_KEY) ?? '[]';
  const parsed = parseObservationData(raw);
  const keepCopy = () => readStorage(RECOVERY_KEY) === null && writeStorage(RECOVERY_KEY, raw);
  if (parsed === null) {
    return { observations: [], droppedCount: 0, recoveryData: raw, recoveryKept: keepCopy() };
  }
  const observations = reprocessObservations(parsed.observations);
  const { droppedCount } = parsed;
  if (droppedCount > 0) {
    return { observations, droppedCount, recoveryData: raw, recoveryKept: keepCopy() };
  }
  // A copy kept in an earlier session: its records give the number of dropped records again.
  const recoveryData = readStorage(RECOVERY_KEY);
  const keptDropped =
    recoveryData === null ? 0 : (parseObservationData(recoveryData)?.droppedCount ?? 0);
  return { observations, droppedCount: keptDropped, recoveryData, recoveryKept: true };
};

interface UndoState {
  change: DataChange;
  observations: Observation[];
  persisted: boolean;
}

/** Reads the copy that an earlier session kept before a replacing change. */
const loadStoredUndo = (): UndoState | null => {
  const saved = parseObservationData(readStorage(UNDO_KEY) ?? 'null');
  return saved ? { change: 'earlier', observations: saved.observations, persisted: true } : null;
};

export const CycleDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialState] = useState(loadStoredState);
  const [observations, setObservations] = useState<Observation[]>(initialState.observations);
  const [recoveryData, setRecoveryData] = useState<string | null>(initialState.recoveryData);
  const { recoveryKept, droppedCount } = initialState;
  const [undo, setUndo] = useState<UndoState | null>(loadStoredUndo);
  const [saveFailed, setSaveFailed] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState(() => readStorage(LAST_BACKUP_KEY));
  const [backupReminderStart] = useState(loadReminderStart);
  const [backupSnoozedUntil, setBackupSnoozedUntil] = useState(() => readStorage(SNOOZE_KEY));
  const persistRequested = useRef(false);
  const hasData = observations.length > 0;

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
    setSaveFailed(!writeStorage(STORAGE_KEY, serializeObservations(observations)));
  }, [observations, recoveryKept, initialState.observations]);

  // Ask once, when there is data to keep, so that the browser does not evict it.
  useEffect(() => {
    if (!hasData || persistRequested.current) return;
    persistRequested.current = true;
    void requestPersistentStorage();
  }, [hasData]);

  const markBackedUp = useCallback(() => {
    const today = getTodayStr();
    writeStorage(LAST_BACKUP_KEY, today);
    setLastBackupDate(today);
  }, []);

  const snoozeBackupReminder = useCallback(() => {
    const until = addDays(getTodayStr(), BACKUP_SNOOZE_DAYS);
    writeStorage(SNOOZE_KEY, until);
    setBackupSnoozedUntil(until);
  }, []);

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
    (idOrDate: string) => {
      dismissUndo();
      setObservations(prev => {
        const filtered = prev.filter(o => o.id !== idOrDate && o.date !== idOrDate);
        return reprocessObservations(filtered);
      });
    },
    [dismissUndo]
  );

  const exportDataJson = useCallback(() => {
    return serializeObservations(observations, 2);
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
        const persisted = writeStorage(UNDO_KEY, serializeObservations(observations));
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
      const parsed = parseObservationData(jsonStr);
      if (!parsed) return false;
      const validated = parsed.observations;
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
      droppedCount,
      saveFailed,
      lastBackupDate,
      markBackedUp,
      backupReminderStart,
      backupSnoozedUntil,
      snoozeBackupReminder,
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
      droppedCount,
      saveFailed,
      lastBackupDate,
      markBackedUp,
      backupReminderStart,
      backupSnoozedUntil,
      snoozeBackupReminder,
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
