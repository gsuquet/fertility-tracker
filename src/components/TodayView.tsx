import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { getCycleDayOn } from '../domain/cycleBoundaryDetector';
import { copyableCode, hasFieldChanges, needsCycleStartChoice } from '../domain/observationForm';
import { hasObservationCode, showsEmptyStamp } from '../domain/stampCalculator';
import { useDaySwipe } from '../hooks/useDaySwipe';
import { useShortcut } from '../hooks/useKeyboardShortcuts';
import { useObservationForm } from '../hooks/useObservationForm';
import { CycleStartModal } from './CycleStartModal';
import { TodayDateNav } from './today/TodayDateNav';
import { TodayHistoryList } from './today/TodayHistoryList';
import { TodayFertilityGuidance } from './today/TodayFertilityGuidance';
import { getTodayStr, addDays } from '../utils/dateUtils';
import { haptic } from '../utils/haptics';
import { setDirectCodeOnly, useDirectCodeOnly } from '../hooks/useDirectCodeOnly';
import { useTopDialog } from './Modal';
import { ObservationActionsMenu } from './observation/ObservationActionsMenu';
import { ProgressiveObservationForm } from './observation/ProgressiveObservationForm';
import { useToast } from '../hooks/useToast';
import { Check, CheckCircle2 } from 'lucide-react';

export const TodayView: React.FC = () => {
  const {
    observations,
    cycles,
    saveObservation,
    deleteObservation,
    selectedObservation,
    setSelectedObservation,
  } = useCycle();
  const { t } = useLanguage();

  const directOnly = useDirectCodeOnly();
  // While the code field or the notes have the focus, the phone keyboard is open: the Save bar hides
  const [typing, setTyping] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const topDialog = useTopDialog();

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
  // A day after today has no cycle day yet
  const cycleDay = selectedDate <= getTodayStr() ? getCycleDayOn(cycles, selectedDate) : undefined;

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
  const yesterdayObs = observations.find(o => o.date === addDays(selectedDate, -1));

  // A saved day with no change shows its saved stamp, with the Peak Day and the count of three.
  // A change shows the stamp of the form.
  const shownObs = hasUnsavedChanges ? undefined : currentObs;
  const status = shownObs
    ? { stamp: shownObs.stamp, isPeak: !!shownObs.isPeakDay, isEmpty: showsEmptyStamp(shownObs) }
    : {
        stamp: form.calculatedStamp,
        isPeak: fields.isManualPeak,
        isEmpty: !hasObservationCode(fields),
      };

  // Ctrl+S or ⌘S saves, also in a field. A dialog on top keeps the keys.
  useEffect(() => {
    if (topDialog) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      if (hasUnsavedChanges) (formRef.current as HTMLFormElement).requestSubmit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [topDialog, hasUnsavedChanges]);

  const executeSave = (isCycleStart: boolean | undefined) => {
    saveObservation(form.toInput(selectedDate, currentObs?.id, isCycleStart));
    haptic('success');
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

  const actionsMenu = (variant: 'banner' | 'card') => (
    <ObservationActionsMenu
      key={variant}
      yesterdayCode={copyableCode(yesterdayObs)}
      onCopyYesterday={() => form.copyCodes(yesterdayObs as NonNullable<typeof yesterdayObs>)}
      directOnly={directOnly}
      onToggleDirectOnly={() => setDirectCodeOnly(!directOnly)}
      onDelete={currentObs ? () => handleDelete(currentObs.id) : undefined}
    />
  );

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
        cycleDay={cycleDay}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
        onGoToToday={handleGoToToday}
        onDateChange={setSelectedDate}
      />

      {/* Status card (phone): the stamp, the code, the fertility text and the actions menu */}
      <TodayFertilityGuidance
        stamp={status.stamp}
        currentCode={form.currentCode}
        isEmpty={status.isEmpty}
        isManualPeak={status.isPeak}
        intercourse={fields.intercourse}
        variant="banner"
        menu={actionsMenu('banner')}
      />

      {/* Main Grid: 3-column Layout */}
      <div className="today-main-grid" ref={swipeContentRef}>
        {/* Column 1: Recent 5-Day Observation History Card */}
        <TodayHistoryList
          selectedDate={selectedDate}
          observations={observations}
          onSelectDate={setSelectedDate}
        />

        {/* Column 2: the progressive observation form and the Save bar */}
        <form ref={formRef} onSubmit={handleSave} className="today-form-card">
          <h2 className="sr-only">{t.todayView.title}</h2>
          <ProgressiveObservationForm
            form={form}
            directOnly={directOnly}
            idPrefix="today"
            onTypingChange={setTyping}
          />
          <div className={`today-save-bar ${typing ? 'typing' : ''}`}>
            <button
              type="submit"
              className="btn btn-primary btn-lg submit-save-btn"
              disabled={!hasUnsavedChanges}
            >
              {!hasUnsavedChanges && currentObs ? (
                <>
                  <Check size={18} />
                  <span>{t.todayView.savedLabel}</span>
                </>
              ) : (
                <span>{t.actions.save}</span>
              )}
            </button>
          </div>
        </form>

        {/* Column 3: the status card (desktop) */}
        <TodayFertilityGuidance
          stamp={status.stamp}
          currentCode={form.currentCode}
          isEmpty={status.isEmpty}
          isManualPeak={status.isPeak}
          intercourse={fields.intercourse}
          variant="card"
          menu={actionsMenu('card')}
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
