import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  BleedingCode,
  MucusStretch,
  MucusModifier,
  FrequencyCode,
  SymptomCode,
} from '../../types/crms';
import {
  Heart,
  Flag,
  Calendar as CalendarIcon,
  Zap,
  Sliders,
  ChevronDown,
  ChevronUp,
  Save,
  Trash2,
} from 'lucide-react';

interface TodayObservationFormProps {
  entryMode: 'direct' | 'detailed';
  showDetailedOverride: boolean;
  onSetEntryMode: (mode: 'direct' | 'detailed') => void;
  onToggleDetailedOverride: () => void;
  directInputText: string;
  onDirectTextChange: (text: string) => void;
  intercourse: boolean;
  onIntercourseToggle: () => void;
  bleeding?: BleedingCode;
  onBleedingSelect: (b?: BleedingCode) => void;
  isCycleStart?: boolean;
  onToggleCycleStart: () => void;
  stretch?: MucusStretch;
  onStretchSelect: (s?: MucusStretch) => void;
  modifiers: MucusModifier[];
  onToggleModifier: (mod: MucusModifier) => void;
  frequency?: FrequencyCode;
  onFrequencySelect: (f?: FrequencyCode) => void;
  symptoms: SymptomCode[];
  onToggleSymptom: (sym: SymptomCode) => void;
  isManualPeak: boolean;
  onToggleManualPeak: () => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  hasUnsavedChanges: boolean;
  hasExistingObs: boolean;
  onSave: (e: React.FormEvent) => void;
  onDelete: () => void;
}

export const TodayObservationForm: React.FC<TodayObservationFormProps> = ({
  entryMode,
  showDetailedOverride,
  onSetEntryMode,
  onToggleDetailedOverride,
  directInputText,
  onDirectTextChange,
  intercourse,
  onIntercourseToggle,
  bleeding,
  onBleedingSelect,
  isCycleStart,
  onToggleCycleStart,
  stretch,
  onStretchSelect,
  modifiers,
  onToggleModifier,
  frequency,
  onFrequencySelect,
  symptoms,
  onToggleSymptom,
  isManualPeak,
  onToggleManualPeak,
  notes,
  onNotesChange,
  hasUnsavedChanges,
  hasExistingObs,
  onSave,
  onDelete,
}) => {
  const { t } = useLanguage();

  return (
    <form onSubmit={onSave} className="today-form-card">
      <div className="today-card-header">
        <div>
          <h2>{t.todayView.title}</h2>
          <span className="subtitle">{t.todayView.subtitle}</span>
        </div>

        {/* Entry Mode Toggle (Direct Code vs Detailed Form) */}
        <div className="entry-mode-toggle" role="radiogroup" aria-label={t.todayView.entryMode}>
          <button
            type="button"
            role="radio"
            className={`mode-toggle-btn ${entryMode === 'direct' ? 'active' : ''}`}
            onClick={() => onSetEntryMode('direct')}
            title="Direct Code Entry Only"
            aria-checked={entryMode === 'direct'}
          >
            <Zap size={14} />
            <span>{t.todayView.modeDirect}</span>
          </button>
          <button
            type="button"
            role="radio"
            className={`mode-toggle-btn ${entryMode === 'detailed' ? 'active' : ''}`}
            onClick={() => onSetEntryMode('detailed')}
            title="Detailed Form Button Selectors"
            aria-checked={entryMode === 'detailed'}
          >
            <Sliders size={14} />
            <span>{t.todayView.modeDetailed}</span>
          </button>
        </div>
      </div>

      {/* Direct Code Entry */}
      <div className="form-group">
        <label htmlFor="today-direct-code">{t.labels.directInput}</label>
        <input
          id="today-direct-code"
          type="text"
          className="form-input direct-code-input"
          placeholder={t.labels.directInputPlaceholder}
          value={directInputText}
          onChange={e => onDirectTextChange(e.target.value)}
        />
      </div>

      {/* Intercourse Toggle Button */}
      <div className="form-group">
        <button
          type="button"
          className={`intercourse-toggle-btn ${intercourse ? 'active' : ''}`}
          onClick={onIntercourseToggle}
          aria-pressed={intercourse}
        >
          <Heart size={20} fill={intercourse ? 'currentColor' : 'none'} />
          <span>{t.codes.intercourse.I}</span>
        </button>
      </div>

      {/* Optional Toggle to Expand Detailed Form when in Direct Mode */}
      {entryMode === 'direct' && (
        <div className="form-group direct-mode-expand-wrapper">
          <button
            type="button"
            className="btn btn-sm btn-outline toggle-detailed-btn"
            onClick={onToggleDetailedOverride}
          >
            {showDetailedOverride ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>
              {showDetailedOverride ? t.todayView.hideDetailed : t.todayView.showDetailed}
            </span>
          </button>
        </div>
      )}

      {/* Detailed Form Selectors (Visible in 'detailed' mode or when toggled) */}
      {(entryMode === 'detailed' || showDetailedOverride) && (
        <>
          {/* Bleeding Selection */}
          <div className="form-group">
            <label>{t.labels.bleeding}</label>
            <div className="button-grid" role="group" aria-label={t.labels.bleeding}>
              {(['H', 'M', 'L', 'VL', 'B'] as BleedingCode[]).map(code => (
                <button
                  type="button"
                  key={code}
                  className={`option-btn ${bleeding === code ? 'active bleeding' : ''}`}
                  onClick={() => onBleedingSelect(bleeding === code ? undefined : code)}
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
                onClick={onToggleCycleStart}
                aria-pressed={isCycleStart === true}
                style={{
                  borderColor: isCycleStart === true ? 'var(--stamp-red, #ef4444)' : undefined,
                  backgroundColor: isCycleStart === true ? 'rgba(239, 68, 68, 0.15)' : undefined,
                  color: isCycleStart === true ? 'var(--stamp-red, #ef4444)' : undefined,
                }}
              >
                <CalendarIcon size={18} />
                <span>
                  {t.cycleStartModal?.isCycleStartLabel || 'Start of New Cycle'}
                  {isCycleStart !== undefined ? (isCycleStart ? ' (Yes)' : ' (No)') : ''}
                </span>
              </button>
            </div>
          )}

          {/* Mucus Stretch Selection */}
          <div className="form-group">
            <label>{t.labels.stretch}</label>
            <div className="button-grid" role="group" aria-label={t.labels.stretch}>
              {(
                ['0', '2', '2W', '4', '6', '8', '10', '10DL', '10SL', '10WL'] as MucusStretch[]
              ).map(code => (
                <button
                  type="button"
                  key={code}
                  className={`option-btn ${stretch === code ? 'active stretch' : ''}`}
                  onClick={() => onStretchSelect(stretch === code ? undefined : code)}
                  aria-pressed={stretch === code}
                >
                  {t.codes.stretch[code]}
                </button>
              ))}
            </div>
          </div>

          {/* Appearance Modifiers */}
          <div className="form-group">
            <label>{t.labels.modifiers}</label>
            <div className="button-grid" role="group" aria-label={t.labels.modifiers}>
              {(['B', 'C', 'C/K', 'G', 'K', 'L', 'P', 'Y'] as MucusModifier[]).map(mod => (
                <button
                  type="button"
                  key={mod}
                  className={`option-btn ${modifiers.includes(mod) ? 'active modifier' : ''}`}
                  onClick={() => onToggleModifier(mod)}
                  aria-pressed={modifiers.includes(mod)}
                >
                  {t.codes.modifiers[mod]}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div className="form-group">
            <label>{t.labels.frequency}</label>
            <div className="button-grid" role="group" aria-label={t.labels.frequency}>
              {(['X1', 'X2', 'X3', 'AD'] as FrequencyCode[]).map(code => (
                <button
                  type="button"
                  key={code}
                  className={`option-btn ${frequency === code ? 'active frequency' : ''}`}
                  onClick={() => onFrequencySelect(frequency === code ? undefined : code)}
                  aria-pressed={frequency === code}
                >
                  {t.codes.frequency[code]}
                </button>
              ))}
            </div>
          </div>

          {/* Contextual Symptoms */}
          <div className="form-group">
            <label>{t.labels.symptoms}</label>
            <div className="button-grid" role="group" aria-label={t.labels.symptoms}>
              {(['AP', 'RAP', 'LAP'] as SymptomCode[]).map(sym => (
                <button
                  type="button"
                  key={sym}
                  className={`option-btn ${symptoms.includes(sym) ? 'active symptom' : ''}`}
                  onClick={() => onToggleSymptom(sym)}
                  aria-pressed={symptoms.includes(sym)}
                >
                  {t.codes.symptoms[sym]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Peak Day Flag */}
      <div className="form-group">
        <button
          type="button"
          className={`peak-toggle-btn ${isManualPeak ? 'active' : ''}`}
          onClick={onToggleManualPeak}
          aria-pressed={isManualPeak}
        >
          <Flag size={18} />
          <span>{isManualPeak ? t.actions.removePeak : t.actions.setPeak}</span>
        </button>
      </div>

      {/* Notes */}
      <div className="form-group">
        <label htmlFor="today-notes">{t.labels.notes}</label>
        <textarea
          id="today-notes"
          className="form-input form-textarea"
          rows={3}
          placeholder="Add relevant notes (e.g., stress, medication, travel)..."
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
        />
      </div>

      {/* Action Bar with Submit Button Grayed Out when Unchanged */}
      <div className="today-form-actions">
        {hasExistingObs ? (
          <button
            type="button"
            className="btn btn-danger"
            onClick={onDelete}
            aria-label={t.actions.delete}
          >
            <Trash2 size={16} />
            <span>{t.actions.delete}</span>
          </button>
        ) : (
          <div />
        )}

        <button
          type="submit"
          className={`btn btn-primary btn-lg submit-save-btn ${
            !hasUnsavedChanges ? 'disabled-submit' : ''
          }`}
          disabled={!hasUnsavedChanges}
          aria-disabled={!hasUnsavedChanges}
        >
          <Save size={18} />
          <span>
            {hasUnsavedChanges ? t.actions.save : hasExistingObs ? 'Saved' : t.actions.save}
          </span>
        </button>
      </div>
    </form>
  );
};
