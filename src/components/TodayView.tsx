import type React from 'react';
import { useState, useEffect } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { hasFieldChanges, needsCycleStartChoice } from '../domain/observationForm';
import { useDaySwipe } from '../hooks/useDaySwipe';
import { useShortcut } from '../hooks/useKeyboardShortcuts';
import { useObservationForm } from '../hooks/useObservationForm';
import { CycleStartModal } from './CycleStartModal';
import { TodayDateNav } from './today/TodayDateNav';
import { TodayHistoryList } from './today/TodayHistoryList';
import { TodayObservationForm } from './today/TodayObservationForm';
import { TodayFertilityGuidance } from './today/TodayFertilityGuidance';
import { getTodayStr, addDays } from '../utils/dateUtils';
import { readStorage, writeStorage } from '../utils/storage';
import { STORAGE_ENTRY_MODE_KEY as ENTRY_MODE_STORAGE_KEY } from '../utils/storageKeys';
import { useToast } from '../hooks/useToast';
import { CheckCircle2 } from 'lucide-react';

type EntryMode = 'direct' | 'detailed';

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
  const [entryMode, setEntryMode] = useState<EntryMode>(() =>
    readStorage(ENTRY_MODE_STORAGE_KEY) === 'direct' ? 'direct' : 'detailed'
  );

  // Direct mode override toggle to show/hide detailed button grids on demand
  const [showDetailedOverride, setShowDetailedOverride] = useState(false);

  const handleSetEntryMode = (mode: EntryMode) => {
    setEntryMode(mode);
    setShowDetailedOverride(false);
    writeStorage(ENTRY_MODE_STORAGE_KEY, mode);
  };

  // Selected date state (defaults to Today, but user can navigate)
  const [selectedDate, setSelectedDate] = useState<string>(
    () => selectedObservation?.date ?? getTodayStr()
  );

  const form = useObservationForm();
  const { fields, load } = form;
  const [showCycleStartModal, setShowCycleStartModal] = useState(false);

  // Toast feedback state
  const [toastMessage, showToast] = useToast(3000);

  const currentObs = observations.find(o => o.date === selectedDate);

  // Load the saved observation of the selected date into the form
  useEffect(() => {
    load(currentObs);
  }, [currentObs, load]);

  // Handle selectedObservation external overrides
  useEffect(() => {
    if (selectedObservation) {
      setSelectedDate(selectedObservation.date);
    }
  }, [selectedObservation]);

  const isToday = selectedDate === getTodayStr();

  // Navigation handlers
  const handlePrevDay = () => setSelectedDate(prev => addDays(prev, -1));
  const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const handleGoToToday = () => setSelectedDate(getTodayStr());

  // The arrow keys and T call the same functions as the buttons
  useShortcut('prevDay', handlePrevDay);
  useShortcut('nextDay', handleNextDay);
  useShortcut('goToToday', handleGoToToday);

  // A swipe calls the same functions as the arrow buttons
  const {
    handlers: swipeHandlers,
    pageRef: swipePageRef,
    contentRef: swipeContentRef,
  } = useDaySwipe(direction => (direction === 'next' ? handleNextDay() : handlePrevDay()));

  const hasUnsavedChanges = hasFieldChanges(fields, currentObs);

  const executeSave = (isCycleStart: boolean | undefined) => {
    saveObservation(form.toInput(selectedDate, currentObs?.id, isCycleStart));
    showToast(t.todayView.savedNotice);
    setShowCycleStartModal(false);
  };

  // The save button is disabled while nothing changed
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (needsCycleStartChoice(fields, selectedDate, observations)) {
      setShowCycleStartModal(true);
      return;
    }
    executeSave(fields.isCycleStart);
  };

  const handleModalConfirm = (choice: boolean) => {
    form.setCycleStart(choice);
    executeSave(choice);
  };

  const handleDelete = (id: string) => {
    deleteObservation(id);
    setSelectedObservation(null);
    showToast(t.todayView.deletedNotice);
  };

  return (
    <div
      className="today-page-container"
      id="today-panel"
      role="tabpanel"
      aria-labelledby="tab-today"
      ref={swipePageRef}
      {...swipeHandlers}
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
        stamp={form.calculatedStamp}
        currentCode={form.currentCode}
        isManualPeak={fields.isManualPeak}
        intercourse={fields.intercourse}
        variant="banner"
      />

      {/* Main Grid: 3-column Layout */}
      <div className="today-main-grid" ref={swipeContentRef}>
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
          directInputText={form.directInputText}
          onDirectTextChange={form.setDirectText}
          intercourse={fields.intercourse}
          onIntercourseToggle={form.toggleIntercourse}
          bleeding={fields.bleeding}
          onBleedingSelect={form.selectBleeding}
          isCycleStart={fields.isCycleStart}
          onToggleCycleStart={form.toggleCycleStart}
          stretch={fields.stretch}
          onStretchSelect={form.selectStretch}
          modifiers={fields.modifiers}
          onToggleModifier={form.toggleModifier}
          frequency={fields.frequency}
          onFrequencySelect={form.selectFrequency}
          symptoms={fields.symptoms}
          onToggleSymptom={form.toggleSymptom}
          isManualPeak={fields.isManualPeak}
          onToggleManualPeak={form.toggleManualPeak}
          notes={fields.notes}
          onNotesChange={form.setNotes}
          hasUnsavedChanges={hasUnsavedChanges}
          onSave={handleSave}
          onDelete={currentObs ? () => handleDelete(currentObs.id) : undefined}
        />

        {/* Column 3: Real-time Stamp Preview & Guidance (Desktop Viewport) */}
        <TodayFertilityGuidance
          stamp={form.calculatedStamp}
          currentCode={form.currentCode}
          isManualPeak={fields.isManualPeak}
          intercourse={fields.intercourse}
          variant="card"
        />
      </div>

      <CycleStartModal
        isOpen={showCycleStartModal}
        date={selectedDate}
        onConfirm={handleModalConfirm}
        onCancel={() => setShowCycleStartModal(false)}
      />
    </div>
  );
};
