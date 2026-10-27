import type React from 'react';
import { useState, useEffect } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { needsCycleStartChoice } from '../domain/observationForm';
import { useObservationForm } from '../hooks/useObservationForm';
import { CycleStartModal } from './CycleStartModal';
import { Modal } from './Modal';
import { StampBadge } from './StampBadge';
import { ObservationCodeSelector } from './observation/ObservationCodeSelector';
import { X, Save, Trash2, Heart, Flag } from 'lucide-react';
import { getTodayStr } from '../utils/dateUtils';

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: isDrawerOpen resets the form each time the drawer opens
  useEffect(() => {
    setDate(selectedObservation?.date ?? getTodayStr());
    load(selectedObservation ?? undefined);
  }, [selectedObservation, isDrawerOpen, load]);

  if (!isDrawerOpen) return null;

  // The calendar opens empty days with a blank id
  const savedId = selectedObservation?.id || undefined;

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
      <div className="drawer-header">
        <h2 id="drawer-title">{savedId ? 'Edit Observation' : t.actions.newEntry}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={() => setIsDrawerOpen(false)}
          aria-label="Close entry panel"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSave} className="drawer-body">
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
            onChange={e => setDate(e.target.value)}
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
