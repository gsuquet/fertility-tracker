import React, { createContext, useContext, useState, useEffect } from 'react';
import { Observation } from '../types/crms';
import { processCycleObservations } from '../domain/peakDetector';
import { calculateStamp } from '../domain/stampCalculator';
import { formatCodeString } from '../domain/codeParser';

interface CycleContextType {
  observations: Observation[];
  saveObservation: (obsData: Partial<Observation>) => void;
  deleteObservation: (id: string) => void;
  toggleManualPeak: (date: string) => void;
  exportDataJson: () => string;
  importDataJson: (jsonStr: string) => boolean;
  clearAllData: () => void;
  loadDemoData: () => void;
  selectedObservation: Observation | null;
  setSelectedObservation: (obs: Observation | null) => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
}

const CycleContext = createContext<CycleContextType | undefined>(undefined);

const STORAGE_KEY = 'fertility_care_observations';

export const CycleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [observations, setObservations] = useState<Observation[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return processCycleObservations(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to parse saved observations', e);
    }
    return [];
  });

  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(observations));
      }
    } catch (e) {}
  }, [observations]);

  const saveObservation = (obsData: Partial<Observation>) => {
    setObservations(prev => {
      const date = obsData.date || new Date().toISOString().split('T')[0];
      const existingIdx = prev.findIndex(o => o.date === date);

      const stamp = calculateStamp(obsData.bleeding, obsData.stretch, obsData.modifiers || []);
      const codeString = obsData.codeString || formatCodeString(obsData);

      const newObs: Observation = {
        id: obsData.id || `obs_${date}_${Date.now()}`,
        date,
        cycleDay: obsData.cycleDay || (prev.length + 1),
        bleeding: obsData.bleeding,
        stretch: obsData.stretch,
        modifiers: obsData.modifiers || [],
        frequency: obsData.frequency,
        symptoms: obsData.symptoms || [],
        intercourse: obsData.intercourse || false,
        notes: obsData.notes || '',
        isManualPeak: obsData.isManualPeak || false,
        stamp,
        codeString,
      };

      let updatedList = [...prev];
      if (existingIdx !== -1) {
        updatedList[existingIdx] = { ...updatedList[existingIdx], ...newObs };
      } else {
        updatedList.push(newObs);
      }

      // Re-sort by date and assign cycleDay 1..N
      updatedList.sort((a, b) => a.date.localeCompare(b.date));
      updatedList = updatedList.map((obs, idx) => ({ ...obs, cycleDay: idx + 1 }));

      return processCycleObservations(updatedList);
    });
  };

  const deleteObservation = (id: string) => {
    setObservations(prev => {
      const filtered = prev.filter(o => o.id !== id);
      const resorted = filtered.map((obs, idx) => ({ ...obs, cycleDay: idx + 1 }));
      return processCycleObservations(resorted);
    });
  };

  const toggleManualPeak = (date: string) => {
    setObservations(prev => {
      const updated = prev.map(obs => {
        if (obs.date === date) {
          return { ...obs, isManualPeak: !obs.isManualPeak };
        }
        return { ...obs, isManualPeak: false }; // Single peak day per cycle
      });
      return processCycleObservations(updated);
    });
  };

  const exportDataJson = () => {
    return JSON.stringify(observations, null, 2);
  };

  const importDataJson = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        const processed = processCycleObservations(parsed);
        setObservations(processed);
        return true;
      }
    } catch (e) {
      console.error('Import failed', e);
    }
    return false;
  };

  const clearAllData = () => {
    setObservations([]);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {}
  };

  const loadDemoData = () => {
    const today = new Date();
    const demoObs: Observation[] = [];

    // Generate 28-day realistic Creighton cycle starting 27 days ago
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const cd = 28 - i;

      let bleeding: any;
      let stretch: any;
      let modifiers: any[] = [];
      let frequency: any;
      let intercourse = false;
      let symptoms: any[] = [];

      if (cd <= 3) {
        bleeding = cd === 1 ? 'H' : cd === 2 ? 'M' : 'L';
        intercourse = false;
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
      const codeString = formatCodeString({ bleeding, stretch, modifiers, frequency, symptoms, intercourse });

      demoObs.push({
        id: `demo_${cd}`,
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

    const processed = processCycleObservations(demoObs);
    setObservations(processed);
  };

  return (
    <CycleContext.Provider value={{
      observations,
      saveObservation,
      deleteObservation,
      toggleManualPeak,
      exportDataJson,
      importDataJson,
      clearAllData,
      loadDemoData,
      selectedObservation,
      setSelectedObservation,
      isDrawerOpen,
      setIsDrawerOpen,
    }}>
      {children}
    </CycleContext.Provider>
  );
};

export const useCycle = () => {
  const context = useContext(CycleContext);
  if (!context) throw new Error('useCycle must be used within CycleProvider');
  return context;
};
