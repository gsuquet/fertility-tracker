import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { hasFieldChanges, needsCycleStartChoice } from '../domain/observationForm';
import { useObservationForm } from '../hooks/useObservationForm';
import { useSheetDrag } from '../hooks/useSheetDrag';
import { CycleStartModal } from './CycleStartModal';
import { Modal } from './Modal';
import { StampBadge } from './StampBadge';
import { ObservationCodeSelector } from './observation/ObservationCodeSelector';
import { X, Save, Trash2, Heart, Flag } from 'lucide-react';
import { getTodayStr } from '../utils/dateUtils';
import type { Observation } from '../types/crms';

export const ObservationDrawer: React.FC = () => {
  const {
    observations,
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
  const { intercourse, isCycleStart } = fields;
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

  if (!isDrawerOpen) return null;

  const savedId = saved?.id;

  /**
   * Loads the saved observation of the new date. A form with no change follows the date, so the
   * values of a saved day are not copied to another day. A draft stays on a date with no observation.
   */
  const changeDate = (day: string) => {
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
    >
      <div className="sheet-handle" aria-hidden="true" {...dragHandlers} />
      <div className="drawer-header" {...dragHandlers}>
        <h2 id="drawer-title">{savedId ? t.drawer.editTitle : t.actions.newEntry}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={() => setIsDrawerOpen(false)}
          aria-label={t.drawer.close}
        >
          <X size={20} />
        </button>
      </div>

      <form ref={bodyRef} onSubmit={handleSave} className="drawer-body">
        {/* Live Stamp & Code Preview */}
        <div className="preview-card" aria-live="polite">
          <div className="preview-stamp">
            <StampBadge
              stamp={form.calculatedStamp}
              isPeakDay={fields.isManualPeak}
              intercourse={intercourse}
              size="lg"
            />
          </div>
          <div className="preview-details">
            <span className="preview-label">{t.labels.stampPreview}</span>
            <div className="preview-code-display">{form.currentCode || '---'}</div>
          </div>
        </div>

        {/* Date Picker */}
        <div className="form-group">
          <label htmlFor="obs-date">{t.labels.date}</label>
          <input
            id="obs-date"
            type="date"
            className="form-input"
            value={date}
            onChange={e => changeDate(e.target.value)}
            required
          />
        </div>

        {/* Direct Code Entry Text Box */}
        <div className="form-group">
          <label htmlFor="direct-code-input">{t.labels.directInput}</label>
          <input
            id="direct-code-input"
            type="text"
            className="form-input direct-code-input"
            placeholder={t.labels.directInputPlaceholder}
            value={form.directInputText}
            onChange={e => form.setDirectText(e.target.value)}
          />
        </div>

        {/* Intercourse 'I' Marker Quick Toggle */}
        <div className="form-group">
          <button
            type="button"
            className={`intercourse-toggle-btn ${intercourse ? 'active' : ''}`}
            onClick={form.toggleIntercourse}
            aria-pressed={intercourse}
          >
            <Heart size={18} fill={intercourse ? 'currentColor' : 'none'} />
            <span>{t.codes.intercourse.I}</span>
          </button>
        </div>

        <ObservationCodeSelector fields={fields} actions={form} />

        {/* Manual Peak Day Flag */}
        <div className="form-group">
          <button
            type="button"
            className={`peak-toggle-btn ${fields.isManualPeak ? 'active' : ''}`}
            onClick={form.toggleManualPeak}
            aria-pressed={fields.isManualPeak}
          >
            <Flag size={18} />
            <span>{fields.isManualPeak ? t.actions.removePeak : t.actions.setPeak}</span>
          </button>
        </div>

        {/* Notes */}
        <div className="form-group">
          <label htmlFor="obs-notes">{t.labels.notes}</label>
          <textarea
            id="obs-notes"
            className="form-input form-textarea"
            rows={3}
            value={fields.notes}
            onChange={e => form.setNotes(e.target.value)}
          />
        </div>

        {/* Footer Actions */}
        <div className="drawer-footer">
          {savedId ? (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => handleDelete(savedId)}
              aria-label={t.actions.delete}
            >
              <Trash2 size={16} />
              <span>{t.actions.delete}</span>
            </button>
          ) : (
            <div />
          )}
          <div className="drawer-footer-right">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsDrawerOpen(false)}
            >
              {t.actions.cancel}
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              <span>{t.actions.save}</span>
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
