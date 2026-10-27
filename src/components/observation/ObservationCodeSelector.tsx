import type React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { formatMessage } from '../../i18n';
import {
  BLEEDING_CODES,
  FREQUENCY_CODES,
  MODIFIER_CODES,
  STRETCH_CODES,
  SYMPTOM_CODES,
} from '../../types/crms';
import type { ObservationFields } from '../../domain/observationForm';
import type { ObservationForm } from '../../hooks/useObservationForm';
import { Calendar } from 'lucide-react';

interface ObservationCodeSelectorProps {
  /** The code values of `useObservationForm().fields`. */
  fields: Pick<
    ObservationFields,
    'bleeding' | 'isCycleStart' | 'stretch' | 'modifiers' | 'frequency' | 'symptoms'
  >;
  /** The code callbacks of `useObservationForm()`. */
  actions: Pick<
    ObservationForm,
    | 'selectBleeding'
    | 'toggleCycleStart'
    | 'selectStretch'
    | 'toggleModifier'
    | 'selectFrequency'
    | 'toggleSymptom'
  >;
}

/**
 * The code buttons of an observation form: bleeding, the cycle start toggle,
 * stretch, modifiers, frequency and symptoms. The Today form and the drawer use it.
 */
export const ObservationCodeSelector: React.FC<ObservationCodeSelectorProps> = ({
  fields,
  actions,
}) => {
  const { t } = useLanguage();
  const { bleeding, isCycleStart, stretch, modifiers, frequency, symptoms } = fields;

  return (
    <>
      {/* Bleeding Selector */}
      <div className="form-group">
        <label>{t.labels.bleeding}</label>
        <div className="button-grid" role="group" aria-label={t.labels.bleeding}>
          {BLEEDING_CODES.map(code => (
            <button
              type="button"
              key={code}
              className={`option-btn ${bleeding === code ? 'active bleeding' : ''}`}
              onClick={() => actions.selectBleeding(bleeding === code ? undefined : code)}
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
            className={`peak-toggle-btn cycle-start-toggle-btn ${isCycleStart === true ? 'active' : ''}`}
            onClick={actions.toggleCycleStart}
            aria-pressed={isCycleStart === true}
          >
            <Calendar size={18} />
            <span>
              {isCycleStart === undefined
                ? t.cycleStartModal.isCycleStartLabel
                : formatMessage(
                    isCycleStart
                      ? t.cycleStartModal.isCycleStartYes
                      : t.cycleStartModal.isCycleStartNo,
                    { label: t.cycleStartModal.isCycleStartLabel }
                  )}
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
              onClick={() => actions.selectStretch(stretch === code ? undefined : code)}
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
              onClick={() => actions.toggleModifier(mod)}
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
              onClick={() => actions.selectFrequency(frequency === code ? undefined : code)}
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
              onClick={() => actions.toggleSymptom(sym)}
              aria-pressed={symptoms.includes(sym)}
            >
              {t.codes.symptoms[sym]}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
