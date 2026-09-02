import React, { useState, useEffect } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import {
  BleedingCode,
  MucusStretch,
  MucusModifier,
  FrequencyCode,
  SymptomCode,
} from '../types/crms';
import { parseCodeString, formatCodeString } from '../domain/codeParser';
import { calculateStamp } from '../domain/stampCalculator';
import { isFirstBleedingDayOfSeries } from '../domain/cycleBoundaryDetector';
import { CycleStartModal } from './CycleStartModal';
import { TodayDateNav } from './today/TodayDateNav';
import { TodayHistoryList } from './today/TodayHistoryList';
import { TodayObservationForm } from './today/TodayObservationForm';
import { TodayFertilityGuidance } from './today/TodayFertilityGuidance';
import { getTodayStr, addDays } from '../utils/dateUtils';
import { CheckCircle2 } from 'lucide-react';

export const TodayView: React.FC = () => {
  const {
    observations,
    saveObservation,
    deleteObservation,
    selectedObservation,
    setSelectedObservation,
  } = useCycle();
  const { t } = useLanguage();

  // User preference for entry mode: 'direct' or 'detailed'
  const [entryMode, setEntryMode] = useState<'direct' | 'detailed'>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('fertility_care_entry_mode');
        if (saved === 'direct' || saved === 'detailed') return saved;
      }
    } catch (_e) {}
    return 'detailed';
  });

  // Direct mode override toggle to show/hide detailed button grids on demand
  const [showDetailedOverride, setShowDetailedOverride] = useState(false);

  const handleSetEntryMode = (mode: 'direct' | 'detailed') => {
    setEntryMode(mode);
    setShowDetailedOverride(false);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('fertility_care_entry_mode', mode);
      }
    } catch (_e) {}
  };

  // Selected date state (defaults to Today, but user can navigate)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return selectedObservation?.date || getTodayStr();
  });

  // Form states
  const [bleeding, setBleeding] = useState<BleedingCode | undefined>();
  const [stretch, setStretch] = useState<MucusStretch | undefined>();
  const [modifiers, setModifiers] = useState<MucusModifier[]>([]);
  const [frequency, setFrequency] = useState<FrequencyCode | undefined>();
  const [symptoms, setSymptoms] = useState<SymptomCode[]>([]);
  const [intercourse, setIntercourse] = useState(false);
  const [notes, setNotes] = useState('');
  const [isManualPeak, setIsManualPeak] = useState(false);
  const [isCycleStart, setIsCycleStart] = useState<boolean | undefined>(undefined);
  const [directInputText, setDirectInputText] = useState('');
  const [showCycleStartModal, setShowCycleStartModal] = useState(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync form when selectedDate or observations array changes
  useEffect(() => {
    const existingObs = observations.find(o => o.date === selectedDate);
    if (existingObs) {
      setBleeding(existingObs.bleeding);
      setStretch(existingObs.stretch);
      setModifiers(existingObs.modifiers || []);
      setFrequency(existingObs.frequency);
      setSymptoms(existingObs.symptoms || []);
      setIntercourse(existingObs.intercourse || false);
      setNotes(existingObs.notes || '');
      setIsManualPeak(existingObs.isManualPeak || false);
      setIsCycleStart(existingObs.isCycleStart);
      setDirectInputText(existingObs.codeString || '');
    } else {
      setBleeding(undefined);
      setStretch(undefined);
      setModifiers([]);
      setFrequency(undefined);
      setSymptoms([]);
      setIntercourse(false);
      setNotes('');
      setIsManualPeak(false);
      setIsCycleStart(undefined);
      setDirectInputText('');
    }
  }, [selectedDate, observations]);

  // Handle selectedObservation external overrides
  useEffect(() => {
    if (selectedObservation?.date) {
      setSelectedDate(selectedObservation.date);
    }
  }, [selectedObservation]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isToday = selectedDate === getTodayStr();

  // Navigation handlers
  const handlePrevDay = () => setSelectedDate(prev => addDays(prev, -1));
  const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const handleGoToToday = () => setSelectedDate(getTodayStr());

  const calculatedStamp = calculateStamp(bleeding, stretch, modifiers);
  const currentCode = formatCodeString({
    bleeding,
    stretch,
    modifiers,
    frequency,
    symptoms,
    intercourse,
  });

  const handleDirectTextChange = (text: string) => {
    setDirectInputText(text);
    const parsed = parseCodeString(text);
    setBleeding(parsed.bleeding);
    setStretch(parsed.stretch);
    setModifiers(parsed.modifiers);
    setFrequency(parsed.frequency);
    setSymptoms(parsed.symptoms);
    setIntercourse(parsed.intercourse);
  };

  const toggleModifier = (mod: MucusModifier) => {
    setModifiers(prev => {
      const next = prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod];
      const updatedCode = formatCodeString({
        bleeding,
        stretch,
        modifiers: next,
        frequency,
        symptoms,
        intercourse,
      });
      setDirectInputText(updatedCode);
      return next;
    });
  };

  const toggleSymptom = (sym: SymptomCode) => {
    setSymptoms(prev => {
      const next = prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym];
      const updatedCode = formatCodeString({
        bleeding,
        stretch,
        modifiers,
        frequency,
        symptoms: next,
        intercourse,
      });
      setDirectInputText(updatedCode);
      return next;
    });
  };

  const handleBleedingSelect = (b?: BleedingCode) => {
    setBleeding(b);
    const updatedCode = formatCodeString({
      bleeding: b,
      stretch,
      modifiers,
      frequency,
      symptoms,
      intercourse,
    });
    setDirectInputText(updatedCode);
  };

  const handleStretchSelect = (s?: MucusStretch) => {
    setStretch(s);
    const updatedCode = formatCodeString({
      bleeding,
      stretch: s,
      modifiers,
      frequency,
      symptoms,
      intercourse,
    });
    setDirectInputText(updatedCode);
  };

  const handleFrequencySelect = (f?: FrequencyCode) => {
    setFrequency(f);
    const updatedCode = formatCodeString({
      bleeding,
      stretch,
      modifiers,
      frequency: f,
      symptoms,
      intercourse,
    });
    setDirectInputText(updatedCode);
  };

  const handleIntercourseToggle = () => {
    const next = !intercourse;
    setIntercourse(next);
    const updatedCode = formatCodeString({
      bleeding,
      stretch,
      modifiers,
      frequency,
      symptoms,
      intercourse: next,
    });
    setDirectInputText(updatedCode);
  };

  const currentObs = observations.find(o => o.date === selectedDate);

  // Check if current form has unsaved changes relative to existing observation
  const hasUnsavedChanges = (() => {
    if (!currentObs) {
      return (
        bleeding !== undefined ||
        stretch !== undefined ||
        modifiers.length > 0 ||
        frequency !== undefined ||
        symptoms.length > 0 ||
        intercourse ||
        notes.trim() !== '' ||
        isManualPeak
      );
    }
    const sameBleeding = currentObs.bleeding === bleeding;
    const sameStretch = currentObs.stretch === stretch;
    const sameFrequency = currentObs.frequency === frequency;
    const sameIntercourse = (currentObs.intercourse || false) === intercourse;
    const samePeak = (currentObs.isManualPeak || false) === isManualPeak;
    const sameCycleStart = currentObs.isCycleStart === isCycleStart;
    const sameNotes = (currentObs.notes || '') === notes;

    const sameModifiers =
      (currentObs.modifiers || []).length === modifiers.length &&
      modifiers.every(m => (currentObs.modifiers || []).includes(m));

    const sameSymptoms =
      (currentObs.symptoms || []).length === symptoms.length &&
      symptoms.every(s => (currentObs.symptoms || []).includes(s));

    return !(
      sameBleeding &&
      sameStretch &&
      sameFrequency &&
      sameIntercourse &&
      samePeak &&
      sameCycleStart &&
      sameNotes &&
      sameModifiers &&
      sameSymptoms
    );
  })();

  const executeSave = (explicitCycleStart?: boolean) => {
    const finalCycleStart = explicitCycleStart !== undefined ? explicitCycleStart : isCycleStart;
    saveObservation({
      id: currentObs?.id,
      date: selectedDate,
      bleeding,
      stretch,
      modifiers,
      frequency,
      symptoms,
      intercourse,
      notes,
      isManualPeak,
      isCycleStart: finalCycleStart,
      codeString: currentCode,
    });
    showToast(t.todayView.savedNotice);
    setShowCycleStartModal(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasUnsavedChanges) return;

    if (
      bleeding &&
      isCycleStart === undefined &&
      isFirstBleedingDayOfSeries({ date: selectedDate, bleeding }, observations)
    ) {
      setShowCycleStartModal(true);
      return;
    }

    executeSave();
  };

  const handleModalConfirm = (choice: boolean) => {
    setIsCycleStart(choice);
    executeSave(choice);
  };

  const handleModalCancel = () => {
    setShowCycleStartModal(false);
  };

  const handleDelete = () => {
    if (currentObs?.id) {
      deleteObservation(currentObs.id);
      setSelectedObservation(null);
      showToast(t.todayView.deletedNotice);
    }
  };

  return (
    <div
      className="today-page-container"
      id="today-panel"
      role="tabpanel"
      aria-labelledby="tab-today"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="today-toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Date Navigation Bar */}
      <TodayDateNav
        selectedDate={selectedDate}
        isToday={isToday}
        currentObs={currentObs}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
        onGoToToday={handleGoToToday}
        onDateChange={setSelectedDate}
      />

      {/* Top Stamp & Status Banner (Mobile Viewport) */}
      <TodayFertilityGuidance
        stamp={calculatedStamp}
        currentCode={currentCode}
        isManualPeak={isManualPeak}
        intercourse={intercourse}
        variant="banner"
      />

      {/* Main Grid: 3-column Layout */}
      <div className="today-main-grid">
        {/* Column 1: Recent 5-Day History Card */}
        <TodayHistoryList
          selectedDate={selectedDate}
          observations={observations}
          onSelectDate={setSelectedDate}
        />

        {/* Column 2: Observation Logger Form */}
        <TodayObservationForm
          entryMode={entryMode}
          showDetailedOverride={showDetailedOverride}
          onSetEntryMode={handleSetEntryMode}
          onToggleDetailedOverride={() => setShowDetailedOverride(!showDetailedOverride)}
          directInputText={directInputText}
          onDirectTextChange={handleDirectTextChange}
          intercourse={intercourse}
          onIntercourseToggle={handleIntercourseToggle}
          bleeding={bleeding}
          onBleedingSelect={handleBleedingSelect}
          isCycleStart={isCycleStart}
          onToggleCycleStart={() => setIsCycleStart(prev => (prev === true ? false : true))}
          stretch={stretch}
          onStretchSelect={handleStretchSelect}
          modifiers={modifiers}
          onToggleModifier={toggleModifier}
          frequency={frequency}
          onFrequencySelect={handleFrequencySelect}
          symptoms={symptoms}
          onToggleSymptom={toggleSymptom}
          isManualPeak={isManualPeak}
          onToggleManualPeak={() => setIsManualPeak(!isManualPeak)}
          notes={notes}
          onNotesChange={setNotes}
          hasUnsavedChanges={hasUnsavedChanges}
          hasExistingObs={Boolean(currentObs?.id)}
          onSave={handleSave}
          onDelete={handleDelete}
        />

        {/* Column 3: Real-time Stamp Preview & Guidance (Desktop Viewport) */}
        <TodayFertilityGuidance
          stamp={calculatedStamp}
          currentCode={currentCode}
          isManualPeak={isManualPeak}
          intercourse={intercourse}
          variant="card"
        />
      </div>

      <CycleStartModal
        isOpen={showCycleStartModal}
        date={selectedDate}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
    </div>
  );
};
