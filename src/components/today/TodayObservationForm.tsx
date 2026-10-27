import type React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type {
  BleedingCode,
  MucusStretch,
  MucusModifier,
  FrequencyCode,
  SymptomCode,
} from '../../types/crms';
import { ObservationCodeSelector } from '../observation/ObservationCodeSelector';
import { Heart, Flag, Zap, Sliders, ChevronDown, ChevronUp, Save, Trash2 } from 'lucide-react';

interface TodayObservationFormProps {
  entryMode: 'direct' | 'detailed';
  showDetailedOverride: boolean;
  onSetEntryMode: (mode: 'direct' | 'detailed') => void;
  onToggleDetailedOverride: () => void;
  directInputText: string;
  onDirectTextChange: (text: string) => void;
  intercourse: boolean;
  onIntercourseToggle: () => void;
  bleeding?: BleedingCode | undefined;
  onBleedingSelect: (b?: BleedingCode) => void;
  isCycleStart?: boolean | undefined;
  onToggleCycleStart: () => void;
  stretch?: MucusStretch | undefined;
  onStretchSelect: (s?: MucusStretch) => void;
  modifiers: MucusModifier[];
  onToggleModifier: (mod: MucusModifier) => void;
  frequency?: FrequencyCode | undefined;
  onFrequencySelect: (f?: FrequencyCode) => void;
  symptoms: SymptomCode[];
  onToggleSymptom: (sym: SymptomCode) => void;
  isManualPeak: boolean;
  onToggleManualPeak: () => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  hasUnsavedChanges: boolean;
  onSave: (e: React.FormEvent) => void;
  /** Deletes the saved observation. Leave it out for a day without one. */
  onDelete?: (() => void) | undefined;
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
          <label
            className={`mode-toggle-btn ${entryMode === 'direct' ? 'active' : ''}`}
            title="Direct Code Entry Only"
          >
            <input
              type="radio"
              name="entry-mode"
              className="sr-only"
              checked={entryMode === 'direct'}
              onChange={() => onSetEntryMode('direct')}
            />
            <Zap size={14} />
            <span>{t.todayView.modeDirect}</span>
          </label>
          <label
            className={`mode-toggle-btn ${entryMode === 'detailed' ? 'active' : ''}`}
            title="Detailed Form Button Selectors"
          >
            <input
              type="radio"
              name="entry-mode"
              className="sr-only"
              checked={entryMode === 'detailed'}
              onChange={() => onSetEntryMode('detailed')}
            />
            <Sliders size={14} />
            <span>{t.todayView.modeDetailed}</span>
          </label>
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
        <ObservationCodeSelector
          fields={{ bleeding, isCycleStart, stretch, modifiers, frequency, symptoms }}
          actions={{
            selectBleeding: onBleedingSelect,
            toggleCycleStart: onToggleCycleStart,
            selectStretch: onStretchSelect,
            toggleModifier: onToggleModifier,
            selectFrequency: onFrequencySelect,
            toggleSymptom: onToggleSymptom,
          }}
        />
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
        {onDelete ? (
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
          <span>{hasUnsavedChanges ? t.actions.save : onDelete ? 'Saved' : t.actions.save}</span>
        </button>
      </div>
    </form>
  );
};
