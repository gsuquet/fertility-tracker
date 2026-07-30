import React, { useState, useEffect } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { BleedingCode, MucusStretch, MucusModifier, FrequencyCode, SymptomCode } from '../types/crms';
import { parseCodeString, formatCodeString } from '../domain/codeParser';
import { calculateStamp } from '../domain/stampCalculator';
import { StampBadge } from './StampBadge';
import { X, Save, Trash2, Heart, Flag } from 'lucide-react';
import { getTodayStr } from '../utils/dateUtils';

export const ObservationDrawer: React.FC = () => {
  const { selectedObservation, setSelectedObservation, isDrawerOpen, setIsDrawerOpen, saveObservation, deleteObservation } = useCycle();
  const { t } = useLanguage();

  const [date, setDate] = useState(() => getTodayStr());
  const [bleeding, setBleeding] = useState<BleedingCode | undefined>();
  const [stretch, setStretch] = useState<MucusStretch | undefined>();
  const [modifiers, setModifiers] = useState<MucusModifier[]>([]);
  const [frequency, setFrequency] = useState<FrequencyCode | undefined>();
  const [symptoms, setSymptoms] = useState<SymptomCode[]>([]);
  const [intercourse, setIntercourse] = useState(false);
  const [notes, setNotes] = useState('');
  const [isManualPeak, setIsManualPeak] = useState(false);
  const [directInputText, setDirectInputText] = useState('');

  useEffect(() => {
    if (selectedObservation) {
      setDate(selectedObservation.date);
      setBleeding(selectedObservation.bleeding);
      setStretch(selectedObservation.stretch);
      setModifiers(selectedObservation.modifiers || []);
      setFrequency(selectedObservation.frequency);
      setSymptoms(selectedObservation.symptoms || []);
      setIntercourse(selectedObservation.intercourse || false);
      setNotes(selectedObservation.notes || '');
      setIsManualPeak(selectedObservation.isManualPeak || false);
      setDirectInputText(selectedObservation.codeString || '');
    } else {
      setDate(getTodayStr());
      setBleeding(undefined);
      setStretch(undefined);
      setModifiers([]);
      setFrequency(undefined);
      setSymptoms([]);
      setIntercourse(false);
      setNotes('');
      setIsManualPeak(false);
      setDirectInputText('');
    }
  }, [selectedObservation, isDrawerOpen]);

  const drawerRef = React.useRef<HTMLDivElement>(null);

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

  const calculatedStamp = calculateStamp(bleeding, stretch, modifiers);
  const currentCode = formatCodeString({ bleeding, stretch, modifiers, frequency, symptoms, intercourse });

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
      const updatedCode = formatCodeString({ bleeding, stretch, modifiers: next, frequency, symptoms, intercourse });
      setDirectInputText(updatedCode);
      return next;
    });
  };

  const toggleSymptom = (sym: SymptomCode) => {
    setSymptoms(prev => {
      const next = prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym];
      const updatedCode = formatCodeString({ bleeding, stretch, modifiers, frequency, symptoms: next, intercourse });
      setDirectInputText(updatedCode);
      return next;
    });
  };

  const handleBleedingSelect = (b?: BleedingCode) => {
    setBleeding(b);
    const updatedCode = formatCodeString({ bleeding: b, stretch, modifiers, frequency, symptoms, intercourse });
    setDirectInputText(updatedCode);
  };

  const handleStretchSelect = (s?: MucusStretch) => {
    setStretch(s);
    const updatedCode = formatCodeString({ bleeding, stretch: s, modifiers, frequency, symptoms, intercourse });
    setDirectInputText(updatedCode);
  };

  const handleFrequencySelect = (f?: FrequencyCode) => {
    setFrequency(f);
    const updatedCode = formatCodeString({ bleeding, stretch, modifiers, frequency: f, symptoms, intercourse });
    setDirectInputText(updatedCode);
  };

  const handleIntercourseToggle = () => {
    const next = !intercourse;
    setIntercourse(next);
    const updatedCode = formatCodeString({ bleeding, stretch, modifiers, frequency, symptoms, intercourse: next });
    setDirectInputText(updatedCode);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveObservation({
      id: selectedObservation?.id,
      date,
      bleeding,
      stretch,
      modifiers,
      frequency,
      symptoms,
      intercourse,
      notes,
      isManualPeak,
      codeString: currentCode,
    });
    setIsDrawerOpen(false);
    setSelectedObservation(null);
  };

  const handleDelete = () => {
    if (selectedObservation?.id) {
      deleteObservation(selectedObservation.id);
      setIsDrawerOpen(false);
      setSelectedObservation(null);
    }
  };

  return (
    <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)} role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div className="drawer-container" ref={drawerRef} onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <h2 id="drawer-title">{selectedObservation?.id ? 'Edit Observation' : t.actions.newEntry}</h2>
          <button className="icon-button" onClick={() => setIsDrawerOpen(false)} aria-label="Close entry panel">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="drawer-body">
          {/* Live Stamp & Code Preview */}
          <div className="preview-card" aria-live="polite">
            <div className="preview-stamp">
              <StampBadge stamp={calculatedStamp} isPeakDay={isManualPeak} intercourse={intercourse} size="lg" />
            </div>
            <div className="preview-details">
              <span className="preview-label">{t.labels.stampPreview}</span>
              <div className="preview-code-display">{currentCode || '---'}</div>
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
              value={directInputText}
              onChange={e => handleDirectTextChange(e.target.value)}
            />
          </div>

          {/* Intercourse 'I' Marker Quick Toggle */}
          <div className="form-group">
            <button
              type="button"
              className={`intercourse-toggle-btn ${intercourse ? 'active' : ''}`}
              onClick={handleIntercourseToggle}
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
              {(['H', 'M', 'L', 'VL', 'B'] as BleedingCode[]).map(code => (
                <button
                  type="button"
                  key={code}
                  className={`option-btn ${bleeding === code ? 'active bleeding' : ''}`}
                  onClick={() => handleBleedingSelect(bleeding === code ? undefined : code)}
                  aria-pressed={bleeding === code}
                >
                  {t.codes.bleeding[code]}
                </button>
              ))}
            </div>
          </div>

          {/* Mucus Stretch Selector */}
          <div className="form-group">
            <label>{t.labels.stretch}</label>
            <div className="button-grid" role="group" aria-label={t.labels.stretch}>
              {(['0', '2', '2W', '4', '6', '8', '10', '10DL', '10SL', '10WL'] as MucusStretch[]).map(code => (
                <button
                  type="button"
                  key={code}
                  className={`option-btn ${stretch === code ? 'active stretch' : ''}`}
                  onClick={() => handleStretchSelect(stretch === code ? undefined : code)}
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
              {(['B', 'C', 'C/K', 'G', 'K', 'L', 'P', 'Y'] as MucusModifier[]).map(mod => (
                <button
                  type="button"
                  key={mod}
                  className={`option-btn ${modifiers.includes(mod) ? 'active modifier' : ''}`}
                  onClick={() => toggleModifier(mod)}
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
              {(['X1', 'X2', 'X3', 'AD'] as FrequencyCode[]).map(code => (
                <button
                  type="button"
                  key={code}
                  className={`option-btn ${frequency === code ? 'active frequency' : ''}`}
                  onClick={() => handleFrequencySelect(frequency === code ? undefined : code)}
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
              {(['AP', 'RAP', 'LAP'] as SymptomCode[]).map(sym => (
                <button
                  type="button"
                  key={sym}
                  className={`option-btn ${symptoms.includes(sym) ? 'active symptom' : ''}`}
                  onClick={() => toggleSymptom(sym)}
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
              className={`peak-toggle-btn ${isManualPeak ? 'active' : ''}`}
              onClick={() => setIsManualPeak(!isManualPeak)}
              aria-pressed={isManualPeak}
            >
              <Flag size={18} />
              <span>{isManualPeak ? t.actions.removePeak : t.actions.setPeak}</span>
            </button>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label htmlFor="obs-notes">{t.labels.notes}</label>
            <textarea
              id="obs-notes"
              className="form-input form-textarea"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Footer Actions */}
          <div className="drawer-footer">
            {selectedObservation?.id ? (
              <button type="button" className="btn btn-danger" onClick={handleDelete} aria-label={t.actions.delete}>
                <Trash2 size={16} />
                <span>{t.actions.delete}</span>
              </button>
            ) : <div />}
            <div className="drawer-footer-right">
              <button type="button" className="btn btn-secondary" onClick={() => setIsDrawerOpen(false)}>
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
    </div>
  );
};
