import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import {
  copyableCode,
  formStatus,
  hasFieldChanges,
  needsCycleStartChoice,
} from '../domain/observationForm';
import { getCycleDayOn } from '../domain/cycleBoundaryDetector';
import { useObservationForm } from '../hooks/useObservationForm';
import { useSheetDrag } from '../hooks/useSheetDrag';
import { CycleStartModal } from './CycleStartModal';
import { Modal, useTopDialog } from './Modal';
import { TodayFertilityGuidance } from './today/TodayFertilityGuidance';
import { ObservationActionsMenu } from './observation/ObservationActionsMenu';
import { ProgressiveObservationForm } from './observation/ProgressiveObservationForm';
import { setDirectCodeOnly, useDirectCodeOnly } from '../hooks/useDirectCodeOnly';
import { formatMessage } from '../i18n';
import { X } from 'lucide-react';
import { addDays, getTodayStr, notAfterToday } from '../utils/dateUtils';
import { haptic } from '../utils/haptics';
import type { Observation } from '../types/crms';

export const ObservationDrawer: React.FC = () => {
  const {
    observations,
    cycles,
    selectedObservation,
    setSelectedObservation,
    isDrawerOpen,
    setIsDrawerOpen,
    saveObservation,
    deleteObservation,
  } = useCycle();
  const { t } = useLanguage();

  const [date, setDate] = useState(() => getTodayStr());
  const form = useObservationForm();
  const { fields, load } = form;
  const { isCycleStart } = fields;
  const directOnly = useDirectCodeOnly();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [showCycleStartModal, setShowCycleStartModal] = useState(false);

  // The observation that the form loaded last, or undefined for an empty form
  const [loaded, setLoaded] = useState<Observation | undefined>();
  const show = useCallback(
    (obs: Observation | undefined) => {
      setLoaded(obs);
      load(obs);
    },
    [load]
  );

  const findSaved = (day: string) => observations.find(o => o.date === day);
  const saved = isDrawerOpen ? findSaved(date) : undefined;
  const isDraft = hasFieldChanges(fields, loaded);

  // When the saved data changes while the drawer is open (for example with Undo), a form with no
  // change shows the new saved values. Thus, a save with no change never writes old values.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a change of the saved data reloads the form, and a draft stays
  useEffect(() => {
    if (saved !== loaded && !isDraft) show(saved);
  }, [saved]);

  // The form shows the saved observation of its date, as the Today form does. Thus, a save with
  // no change never replaces a saved day with an empty observation. This effect runs after the
  // effect above, so the date of the drawer that opens wins.
  // biome-ignore lint/correctness/useExhaustiveDependencies: isDrawerOpen resets the form each time the drawer opens
  useEffect(() => {
    const day = selectedObservation?.date ?? getTodayStr();
    setDate(day);
    show(findSaved(day));
  }, [selectedObservation, isDrawerOpen, show]);

  // On a phone, a drag down closes the sheet as the close button does
  const { handlers: dragHandlers, bodyRef } = useSheetDrag(
    () => setIsDrawerOpen(false),
    isDrawerOpen
  );

  // Ctrl+S or ⌘S saves, as on the Today page, while the sheet is the dialog on top
  const topDialog = useTopDialog();
  // The sheet is on top when the top dialog holds its form, not a menu or a question over it
  const sheetOnTop = !!bodyRef.current && !!topDialog?.contains(bodyRef.current);
  useEffect(() => {
    if (!sheetOnTop) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      (bodyRef.current as HTMLFormElement).requestSubmit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sheetOnTop, bodyRef]);

  if (!isDrawerOpen) return null;

  const savedId = saved?.id;
  const yesterdayObs = findSaved(addDays(date, -1));
  const status = formStatus(fields, form.calculatedStamp, isDraft ? undefined : loaded);
  // A day after today has no cycle day yet
  const cycleDay =
    saved?.cycleDay ?? (date <= getTodayStr() ? getCycleDayOn(cycles, date) : undefined);

  /**
   * Loads the saved observation of the new date. A form with no change follows the date, so the
   * values of a saved day are not copied to another day. A draft stays on a date with no observation.
   */
  /** A later date becomes today: the sheet does not log a day after today */
  const changeDate = (picked: string) => {
    const day = notAfterToday(picked);
    const next = findSaved(day);
    if (next || !isDraft) show(next);
    setDate(day);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedObservation(null);
  };

  const executeSave = (cycleStart: boolean | undefined) => {
    saveObservation(form.toInput(date, savedId, cycleStart));
    haptic('success');
    closeDrawer();
    setShowCycleStartModal(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (needsCycleStartChoice(fields, date, observations)) {
      setShowCycleStartModal(true);
      return;
    }
    executeSave(isCycleStart);
  };

  const handleModalConfirm = (choice: boolean) => {
    form.setCycleStart(choice);
    executeSave(choice);
  };

  const handleDelete = (id: string) => {
    deleteObservation(id);
    closeDrawer();
  };

  return (
    <Modal
      labelledBy="drawer-title"
      onClose={() => setIsDrawerOpen(false)}
      className="drawer-overlay"
      panelClassName="drawer-container"
      // The focus starts on Close, not on the actions menu before it
      initialFocusRef={closeRef}
    >
      <div className="sheet-handle" aria-hidden="true" {...dragHandlers} />
      <div className="drawer-header" {...dragHandlers}>
        <div className="drawer-title-group">
          <h2 id="drawer-title">{savedId ? t.drawer.editTitle : t.actions.newEntry}</h2>
          <p className="drawer-day-status">
            {cycleDay !== undefined && (
              <span>{formatMessage(t.common.dayNumber, { day: cycleDay })} · </span>
            )}
            <span>{saved ? t.todayView.loggedStatus : t.todayView.notLoggedStatus}</span>
          </p>
        </div>
        <ObservationActionsMenu
          yesterdayCode={copyableCode(yesterdayObs)}
          onCopyYesterday={() => form.copyCodes(yesterdayObs as Observation)}
          directOnly={directOnly}
          onToggleDirectOnly={() => setDirectCodeOnly(!directOnly)}
          onDelete={savedId ? () => handleDelete(savedId) : undefined}
        />
        <button
          ref={closeRef}
          type="button"
          className="icon-button"
          onClick={() => setIsDrawerOpen(false)}
          aria-label={t.drawer.close}
        >
          <X size={20} />
        </button>
      </div>

      <form ref={bodyRef} onSubmit={handleSave} className="drawer-body">
        <TodayFertilityGuidance
          stamp={status.stamp}
          currentCode={form.currentCode}
          isEmpty={status.isEmpty}
          isManualPeak={status.isPeak}
          intercourse={fields.intercourse}
          variant="sheet"
          menu={null}
        />

        {/* Date Picker */}
        <div className="form-group">
          <label htmlFor="obs-date">{t.labels.date}</label>
          <input
            id="obs-date"
            type="date"
            className="form-input"
            value={date}
            max={getTodayStr()}
            onChange={e => changeDate(e.target.value)}
            required
          />
        </div>

        <ProgressiveObservationForm form={form} directOnly={directOnly} idPrefix="obs" />

        {/* Footer Actions */}
        <div className="drawer-footer">
          <div className="drawer-footer-right">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsDrawerOpen(false)}
            >
              {t.actions.cancel}
            </button>
            <button type="submit" className="btn btn-primary">
              {t.actions.save}
            </button>
          </div>
        </div>
      </form>

      <CycleStartModal
        isOpen={showCycleStartModal}
        date={date}
        onConfirm={handleModalConfirm}
        onCancel={() => setShowCycleStartModal(false)}
      />
    </Modal>
  );
};
