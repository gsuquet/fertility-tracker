import type React from 'react';
import { useState, useEffect } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import {
  BLEEDING_CODES,
  FREQUENCY_CODES,
  MODIFIER_CODES,
  STRETCH_CODES,
  SYMPTOM_CODES,
} from '../types/crms';
import { needsCycleStartChoice } from '../domain/observationForm';
import { useObservationForm } from '../hooks/useObservationForm';
import { CycleStartModal } from './CycleStartModal';
import { StampBadge } from './StampBadge';
import { X, Save, Trash2, Heart, Flag, Calendar } from 'lucide-react';
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
  const { bleeding, stretch, modifiers, frequency, symptoms, intercourse, isCycleStart } = fields;
  const [showCycleStartModal, setShowCycleStartModal] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: isDrawerOpen resets the form each time the drawer opens
  useEffect(() => {
    setDate(selectedObservation?.date ?? getTodayStr());
    load(selectedObservation ?? undefined);
  }, [selectedObservation, isDrawerOpen, load]);

  useEffect(() => {
    if (!isDrawerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDrawerOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, setIsDrawerOpen]);

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
    <div
      className="drawer-overlay"
      onClick={() => setIsDrawerOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <div className="drawer-container" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <h2 id="drawer-title">{savedId ? 'Edit Observation' : t.actions.newEntry}</h2>
          <button
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

          {/* Bleeding Selector */}
          <div className="form-group">
            <label>{t.labels.bleeding}</label>
            <div className="button-grid" role="group" aria-label={t.labels.bleeding}>
              {BLEEDING_CODES.map(code => (
                <button
                  type="button"
                  key={code}
                  className={`option-btn ${bleeding === code ? 'active bleeding' : ''}`}
                  onClick={() => form.selectBleeding(bleeding === code ? undefined : code)}
                  aria-pressed={bleeding === code}
                >
                  {t.codes.bleeding[code]}
                </button>
              ))}
            </div>
          </div>

          {/* Start of New Cycle Toggle (Visible when Bleeding is active) */}
          {bleeding && (
            <div className="form-group">
              <button
                type="button"
                className={`peak-toggle-btn ${isCycleStart === true ? 'active' : ''}`}
                onClick={form.toggleCycleStart}
                aria-pressed={isCycleStart === true}
                style={{
                  borderColor: isCycleStart === true ? 'var(--stamp-red, #ef4444)' : undefined,
                  backgroundColor: isCycleStart === true ? 'rgba(239, 68, 68, 0.15)' : undefined,
                  color: isCycleStart === true ? 'var(--stamp-red, #ef4444)' : undefined,
                }}
              >
                <Calendar size={18} />
                <span>
                  {t.cycleStartModal.isCycleStartLabel}
                  {isCycleStart !== undefined ? (isCycleStart ? ' (Yes)' : ' (No)') : ''}
                </span>
              </button>
            </div>
          )}

          {/* Mucus Stretch Selector */}
          <div className="form-group">
            <label>{t.labels.stretch}</label>
            <div className="button-grid" role="group" aria-label={t.labels.stretch}>
              {STRETCH_CODES.map(code => (
                <button
                  type="button"
                  key={code}
                  className={`option-btn ${stretch === code ? 'active stretch' : ''}`}
                  onClick={() => form.selectStretch(stretch === code ? undefined : code)}
                  aria-pressed={stretch === code}
                >
                  {t.codes.stretch[code]}
                </button>
              ))}
            </div>
          </div>

          {/* Modifiers Multi-Select */}
          <div className="form-group">
            <label>{t.labels.modifiers}</label>
            <div className="button-grid" role="group" aria-label={t.labels.modifiers}>
              {MODIFIER_CODES.map(mod => (
                <button
                  type="button"
                  key={mod}
                  className={`option-btn ${modifiers.includes(mod) ? 'active modifier' : ''}`}
                  onClick={() => form.toggleModifier(mod)}
                  aria-pressed={modifiers.includes(mod)}
                >
                  {t.codes.modifiers[mod]}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency Selector */}
          <div className="form-group">
            <label>{t.labels.frequency}</label>
            <div className="button-grid" role="group" aria-label={t.labels.frequency}>
              {FREQUENCY_CODES.map(code => (
                <button
                  type="button"
                  key={code}
                  className={`option-btn ${frequency === code ? 'active frequency' : ''}`}
                  onClick={() => form.selectFrequency(frequency === code ? undefined : code)}
                  aria-pressed={frequency === code}
                >
                  {t.codes.frequency[code]}
                </button>
              ))}
            </div>
          </div>

          {/* Symptoms Multi-Select */}
          <div className="form-group">
            <label>{t.labels.symptoms}</label>
            <div className="button-grid" role="group" aria-label={t.labels.symptoms}>
              {SYMPTOM_CODES.map(sym => (
                <button
                  type="button"
                  key={sym}
                  className={`option-btn ${symptoms.includes(sym) ? 'active symptom' : ''}`}
                  onClick={() => form.toggleSymptom(sym)}
                  aria-pressed={symptoms.includes(sym)}
                >
                  {t.codes.symptoms[sym]}
                </button>
              ))}
            </div>
          </div>

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
      </div>

      <CycleStartModal
        isOpen={showCycleStartModal}
        date={date}
        onConfirm={handleModalConfirm}
        onCancel={() => setShowCycleStartModal(false)}
      />
    </div>
  );
};
