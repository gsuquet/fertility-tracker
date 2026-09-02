import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Observation, Cycle } from '../types/crms';
import { calculateStamp } from '../domain/stampCalculator';
import { formatCodeString } from '../domain/codeParser';
import { groupObservationsIntoCycles } from '../domain/cycleBoundaryDetector';
import { getTodayStr, addDays } from '../utils/dateUtils';

export interface CycleDataContextType {
  observations: Observation[];
  cycles: Cycle[];
  selectedCycleId: string;
  setSelectedCycleId: (id: string) => void;
  saveObservation: (obsData: Partial<Observation>) => void;
  deleteObservation: (id: string) => void;
  toggleManualPeak: (date: string) => void;
  exportDataJson: () => string;
  importDataJson: (jsonStr: string) => boolean;
  clearAllData: () => void;
  loadDemoData: () => void;
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

const reprocessObservations = (rawObs: Observation[]): Observation[] => {
  const groupedCycles = groupObservationsIntoCycles(rawObs);
  return groupedCycles.flatMap(c => c.observations).sort((a, b) => a.date.localeCompare(b.date));
};

export const CycleDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [observations, setObservations] = useState<Observation[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return reprocessObservations(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to parse saved observations', e);
    }
    return [];
  });

  const cycles = useMemo(() => groupObservationsIntoCycles(observations), [observations]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>(() => cycles[0]?.id || 'all');

  useEffect(() => {
    if (cycles.length > 0) {
      if (selectedCycleId !== 'all' && !cycles.some(c => c.id === selectedCycleId)) {
        setSelectedCycleId(cycles[0].id);
      }
    } else {
      if (selectedCycleId !== 'all') {
        setSelectedCycleId('all');
      }
    }
  }, [cycles, selectedCycleId]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(observations));
      }
    } catch (_e) {}
  }, [observations]);

  const saveObservation = useCallback((obsData: Partial<Observation>) => {
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
        updatedList[existingIdx] = { ...updatedList[existingIdx], ...newObs };
      } else {
        updatedList.push(newObs);
      }

      return reprocessObservations(updatedList);
    });
  }, []);

  const deleteObservation = useCallback((id: string) => {
    setObservations(prev => {
      const filtered = prev.filter(o => o.id !== id);
      return reprocessObservations(filtered);
    });
  }, []);

  const toggleManualPeak = useCallback((date: string) => {
    setObservations(prev => {
      const updated = prev.map(obs => {
        if (obs.date === date) {
          return { ...obs, isManualPeak: !obs.isManualPeak };
        }
        return { ...obs, isManualPeak: false };
      });
      return reprocessObservations(updated);
    });
  }, []);

  const exportDataJson = useCallback(() => {
    return JSON.stringify(observations, null, 2);
  }, [observations]);

  const importDataJson = useCallback((jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        const processed = reprocessObservations(parsed);
        setObservations(processed);
        const newCycles = groupObservationsIntoCycles(processed);
        if (newCycles.length > 0) {
          setSelectedCycleId(newCycles[0].id);
        } else {
          setSelectedCycleId('all');
        }
        return true;
      }
    } catch (e) {
      console.error('Import failed', e);
    }
    return false;
  }, []);

  const clearAllData = useCallback(() => {
    setObservations([]);
    setSelectedCycleId('all');
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (_e) {}
  }, []);

  const loadDemoData = useCallback(() => {
    const todayStr = getTodayStr();
    const demoObs: Observation[] = [];

    // Generate 2 full 28-day past cycles + current cycle (56 days total history)
    for (let i = 55; i >= 0; i--) {
      const dateStr = addDays(todayStr, -i);
      const cd = ((55 - i) % 28) + 1;

      let bleeding: any;
      let stretch: any;
      let modifiers: any[] = [];
      let frequency: any;
      let intercourse = false;
      let symptoms: any[] = [];

      if (cd <= 3) {
        bleeding = cd === 1 ? 'H' : cd === 2 ? 'M' : 'L';
      } else if (cd === 4) {
        bleeding = 'VL';
      } else if (cd >= 5 && cd <= 8) {
        stretch = '0';
        frequency = 'AD';
      } else if (cd === 9 || cd === 10) {
        stretch = '2';
        modifiers = ['C'];
        frequency = 'X2';
      } else if (cd === 11) {
        stretch = '6';
        modifiers = ['C/K'];
        frequency = 'X3';
        intercourse = true;
      } else if (cd === 12) {
        stretch = '8';
        modifiers = ['K'];
        frequency = 'X3';
      } else if (cd === 13) {
        // PEAK DAY!
        stretch = '10';
        modifiers = ['K', 'L'];
        frequency = 'AD';
        symptoms = ['AP'];
      } else if (cd >= 14 && cd <= 16) {
        stretch = '0';
        frequency = 'AD';
        if (cd === 15) intercourse = true;
      } else {
        stretch = '0';
        frequency = 'AD';
        if (cd === 21) intercourse = true;
      }

      const stamp = calculateStamp(bleeding, stretch, modifiers);
      const codeString = formatCodeString({
        bleeding,
        stretch,
        modifiers,
        frequency,
        symptoms,
        intercourse,
      });

      demoObs.push({
        id: `demo_${dateStr}`,
        date: dateStr,
        cycleDay: cd,
        bleeding,
        stretch,
        modifiers,
        frequency,
        symptoms,
        intercourse,
        stamp,
        codeString,
      });
    }

    const processed = reprocessObservations(demoObs);
    setObservations(processed);
    const newCycles = groupObservationsIntoCycles(processed);
    if (newCycles.length > 0) {
      setSelectedCycleId(newCycles[0].id);
    }
  }, []);

  const dataValue = useMemo(
    () => ({
      observations,
      cycles,
      selectedCycleId,
      setSelectedCycleId,
      saveObservation,
      deleteObservation,
      toggleManualPeak,
      exportDataJson,
      importDataJson,
      clearAllData,
      loadDemoData,
    }),
    [
      observations,
      cycles,
      selectedCycleId,
      saveObservation,
      deleteObservation,
      toggleManualPeak,
      exportDataJson,
      importDataJson,
      clearAllData,
      loadDemoData,
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
