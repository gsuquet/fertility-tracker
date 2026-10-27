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

export interface CycleDataContextType {
  observations: Observation[];
  cycles: Cycle[];
  selectedCycleId: string;
  setSelectedCycleId: (id: string) => void;
  saveObservation: (obsData: ObservationInput) => void;
  deleteObservation: (id: string) => void;
  exportDataJson: () => string;
  importDataJson: (jsonStr: string) => boolean;
  clearAllData: () => void;
  loadDemoData: () => void;
  /** The original text of stored data that could not be read, or null. */
  recoveryData: string | null;
  /** Deletes the copy of the stored data that could not be read. */
  dismissRecovery: () => void;
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
 * recovery key before the app can save over it, and returns it as `recoveryData`.
 */
const loadStoredState = () => {
  const raw = readStorage(STORAGE_KEY) ?? '[]';
  const validated = parseAndValidateObservationsJson(raw);
  if (validated === null) {
    writeStorage(RECOVERY_KEY, raw);
    return { observations: [], recoveryData: raw };
  }
  return {
    observations: reprocessObservations(validated),
    recoveryData: readStorage(RECOVERY_KEY),
  };
};

export const CycleDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialState] = useState(loadStoredState);
  const [observations, setObservations] = useState<Observation[]>(initialState.observations);
  const [recoveryData, setRecoveryData] = useState<string | null>(initialState.recoveryData);

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
    writeStorage(STORAGE_KEY, JSON.stringify(observations));
  }, [observations]);

  const saveObservation = useCallback((obsData: ObservationInput) => {
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
  }, []);

  const deleteObservation = useCallback((idOrDate: string) => {
    setObservations(prev => {
      const filtered = prev.filter(o => o.id !== idOrDate && o.date !== idOrDate);
      return reprocessObservations(filtered);
    });
  }, []);

  const exportDataJson = useCallback(() => {
    return JSON.stringify(observations, null, 2);
  }, [observations]);

  const clearAllData = useCallback(() => {
    setObservations([]);
    setSelectedCycleId('all');
    removeStorage(STORAGE_KEY);
  }, []);

  const applyObservations = useCallback((list: Observation[]) => {
    const processed = reprocessObservations(list);
    setObservations(processed);
    setSelectedCycleId(groupObservationsIntoCycles(processed)[0]?.id ?? 'all');
  }, []);

  const importDataJson = useCallback(
    (jsonStr: string): boolean => {
      const validated = parseAndValidateObservationsJson(jsonStr);
      if (!validated) return false;
      applyObservations(validated);
      return true;
    },
    [applyObservations]
  );

  const loadDemoData = useCallback(() => {
    applyObservations(buildDemoObservations(getTodayStr()));
  }, [applyObservations]);

  const dismissRecovery = useCallback(() => {
    removeStorage(RECOVERY_KEY);
    setRecoveryData(null);
  }, []);

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
      dismissRecovery,
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
      dismissRecovery,
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
