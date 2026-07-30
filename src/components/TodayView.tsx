import React, { useState, useEffect, useRef } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { BleedingCode, MucusStretch, MucusModifier, FrequencyCode, SymptomCode, Observation } from '../types/crms';
import { parseCodeString, formatCodeString } from '../domain/codeParser';
import { calculateStamp } from '../domain/stampCalculator';
import { StampBadge } from './StampBadge';
import { getTodayStr, addDays, formatDateDisplay } from '../utils/dateUtils';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Save, 
  Trash2, 
  Heart, 
  Flag, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles,
  Info,
  Zap,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const TodayView: React.FC = () => {
  const { observations, saveObservation, deleteObservation, selectedObservation, setSelectedObservation } = useCycle();
  const { t, language } = useLanguage();

  // User preference for entry mode: 'direct' (direct code input only) or 'detailed' (button selectors)
  const [entryMode, setEntryMode] = useState<'direct' | 'detailed'>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('fertility_care_entry_mode');
        if (saved === 'direct' || saved === 'detailed') return saved;
      }
    } catch (e) {}
    return 'detailed';
  });

  // Direct mode override toggle to show/hide detailed button grids on demand
  const [showDetailedOverride, setShowDetailedOverride] = useState(false);

  const handleSetEntryMode = (mode: 'direct' | 'detailed') => {
    setEntryMode(mode);
    setShowDetailedOverride(false);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('fertility_care_entry_mode', mode);
      }
    } catch (e) {}
  };

  // Selected date state (defaults to Today, but user can navigate)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return selectedObservation?.date || getTodayStr();
  });

  const datePickerRef = useRef<HTMLInputElement>(null);

  const handleOpenPicker = () => {
    const inputEl = datePickerRef.current;
    if (inputEl) {
      if ('showPicker' in inputEl && typeof (inputEl as any).showPicker === 'function') {
        try {
          inputEl.showPicker();
        } catch (e) {
          inputEl.focus();
        }
      } else {
        inputEl.focus();
      }
    }
  };

  // Form states
  const [bleeding, setBleeding] = useState<BleedingCode | undefined>();
  const [stretch, setStretch] = useState<MucusStretch | undefined>();
  const [modifiers, setModifiers] = useState<MucusModifier[]>([]);
  const [frequency, setFrequency] = useState<FrequencyCode | undefined>();
  const [symptoms, setSymptoms] = useState<SymptomCode[]>([]);
  const [intercourse, setIntercourse] = useState(false);
  const [notes, setNotes] = useState('');
  const [isManualPeak, setIsManualPeak] = useState(false);
  const [directInputText, setDirectInputText] = useState('');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync form when selectedDate or observations array changes
  useEffect(() => {
    const existingObs = observations.find(o => o.date === selectedDate);
    if (existingObs) {
      setBleeding(existingObs.bleeding);
      setStretch(existingObs.stretch);
      setModifiers(existingObs.modifiers || []);
      setFrequency(existingObs.frequency);
      setSymptoms(existingObs.symptoms || []);
      setIntercourse(existingObs.intercourse || false);
      setNotes(existingObs.notes || '');
      setIsManualPeak(existingObs.isManualPeak || false);
      setDirectInputText(existingObs.codeString || '');
    } else {
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
  }, [selectedDate, observations]);

  // Handle selectedObservation external overrides
  useEffect(() => {
    if (selectedObservation?.date) {
      setSelectedDate(selectedObservation.date);
    }
  }, [selectedObservation]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isToday = selectedDate === getTodayStr();

  // Navigation handlers
  const handlePrevDay = () => {
    setSelectedDate(prev => addDays(prev, -1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const handleGoToToday = () => {
    setSelectedDate(getTodayStr());
  };

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

  const currentObs = observations.find(o => o.date === selectedDate);

  // Check if current form has unsaved changes relative to existing observation
  const hasUnsavedChanges = (() => {
    if (!currentObs) {
      // For a new entry, enable save if at least one parameter or note is entered
      return bleeding !== undefined || stretch !== undefined || modifiers.length > 0 || frequency !== undefined || symptoms.length > 0 || intercourse || notes.trim() !== '' || isManualPeak;
    }
    const sameBleeding = currentObs.bleeding === bleeding;
    const sameStretch = currentObs.stretch === stretch;
    const sameFrequency = currentObs.frequency === frequency;
    const sameIntercourse = (currentObs.intercourse || false) === intercourse;
    const samePeak = (currentObs.isManualPeak || false) === isManualPeak;
    const sameNotes = (currentObs.notes || '') === notes;
    
    const sameModifiers = (currentObs.modifiers || []).length === modifiers.length &&
      modifiers.every(m => (currentObs.modifiers || []).includes(m));
      
    const sameSymptoms = (currentObs.symptoms || []).length === symptoms.length &&
      symptoms.every(s => (currentObs.symptoms || []).includes(s));

    return !(sameBleeding && sameStretch && sameFrequency && sameIntercourse && samePeak && sameNotes && sameModifiers && sameSymptoms);
  })();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasUnsavedChanges) return;

    saveObservation({
      id: currentObs?.id,
      date: selectedDate,
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
    showToast(t.todayView.savedNotice);
  };

  const handleDelete = () => {
    if (currentObs?.id) {
      deleteObservation(currentObs.id);
      setSelectedObservation(null);
      showToast(t.todayView.deletedNotice);
    }
  };

  // Format date display
  const formatDateTitle = (dateStr: string) => {
    return formatDateDisplay(dateStr, language === 'fr' ? 'fr-FR' : 'en-US');
  };

  // Recent 5 days preview
  const getRecentDays = () => {
    const list: { dateStr: string; obs?: Observation }[] = [];
    for (let i = 4; i >= 0; i--) {
      const dateStr = addDays(selectedDate, -i);
      const obs = observations.find(o => o.date === dateStr);
      list.push({ dateStr, obs });
    }
    return list;
  };

  // Fertility guidance message based on stamp
  const getFertilityGuidance = () => {
    switch (calculatedStamp) {
      case 'RED':
        return language === 'fr'
          ? 'Phase de règles. Considérez les jours de saignement comme potentiellement fertiles.'
          : 'Menses phase. Bleeding days are considered potentially fertile per Creighton protocols.';
      case 'WHITE_BABY':
        return language === 'fr'
          ? 'Glaire fertile (Symbole Bébé). Journée fertile. Suivez vos objectifs de fertilité.'
          : 'Fertile cervical mucus present (Baby Symbol). Fertile day. Follow your family planning intentions.';
      case 'LIGHT_GREEN_BABY_1':
      case 'LIGHT_GREEN_BABY_2':
      case 'LIGHT_GREEN_BABY_3':
        return language === 'fr'
          ? 'Compte Post-Sommet (+1, +2, +3). Fenêtre d hyper-fertilité post-ovulatoire.'
          : 'Post-Peak count (+1, +2, +3). High fertility transition window following Peak Day.';
      case 'DARK_GREEN':
      default:
        return language === 'fr'
          ? 'Journée sèche / infertile. Continuez l observation quotidienne.'
          : 'Dry / Infertile day based on observations. Continue standard daily monitoring.';
    }
  };

  return (
    <div className="today-page-container" id="today-panel" role="tabpanel" aria-labelledby="tab-today">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="today-toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Compact Date Navigation Bar (Minimal Vertical Height with Arrows & Picker) */}
      <div className="today-header-card compact-date-bar">
        <div className="compact-date-nav-controls">
          <button 
            type="button" 
            className="icon-button date-nav-btn compact-nav-btn" 
            onClick={handlePrevDay}
            title={t.todayView.prevDay}
            aria-label={t.todayView.prevDay}
          >
            <ChevronLeft size={18} />
          </button>

          <div className="today-picker-wrapper compact-picker-inline" onClick={handleOpenPicker}>
            <CalendarIcon size={15} className="date-picker-icon" />
            <span className="today-formatted-date-text">{formatDateTitle(selectedDate)}</span>
            <input
              ref={datePickerRef}
              type="date"
              className="today-date-picker-input compact-picker-input"
              value={selectedDate}
              onChange={e => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                }
              }}
              aria-label={t.labels.date}
            />
          </div>

          <button 
            type="button" 
            className="icon-button date-nav-btn compact-nav-btn" 
            onClick={handleNextDay}
            title={t.todayView.nextDay}
            aria-label={t.todayView.nextDay}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="compact-badge-group">
          {isToday ? (
            <span className="badge badge-primary badge-sm">
              <Clock size={11} />
              {t.todayView.todayLabel}
            </span>
          ) : (
            <button type="button" className="btn btn-xs btn-outline" onClick={handleGoToToday}>
              <RotateCcw size={11} />
              {t.todayView.goToToday}
            </button>
          )}
          {currentObs?.cycleDay && (
            <span className="badge badge-secondary badge-sm">
              Day {currentObs.cycleDay}
            </span>
          )}
          {currentObs ? (
            <span className="badge badge-success badge-sm">
              <CheckCircle2 size={11} />
              {t.todayView.loggedStatus}
            </span>
          ) : (
            <span className="badge badge-warning badge-sm">
              <AlertCircle size={11} />
              {t.todayView.notLoggedStatus}
            </span>
          )}
        </div>
      </div>

      {/* TOP STAMP & STATUS BANNER (Mobile display at top) */}
      <div className="today-top-status-banner mobile-only-stamp-banner">
        <div className="status-stamp-hero">
          <StampBadge stamp={calculatedStamp} isPeakDay={isManualPeak} intercourse={intercourse} size="lg" />
          <div className="status-hero-info">
            <div className="status-code-display">{currentCode || '---'}</div>
            <div className="status-hero-guidance">
              <Info size={15} className="guidance-icon" />
              <span>{getFertilityGuidance()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Option 2 Layout (History -> Form -> Stamp Preview) */}
      <div className="today-main-grid">
        {/* Column 1: Recent 5-day History Card */}
        <div className="today-recent-card">
          <h3>{t.todayView.recentHistory}</h3>
          <div className="recent-days-list">
            {getRecentDays().map(({ dateStr, obs }) => {
              const isSelected = dateStr === selectedDate;
              const dayLabel = formatDateDisplay(dateStr, language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

              return (
                <button
                  key={dateStr}
                  type="button"
                  className={`recent-day-item ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedDate(dateStr)}
                >
                  <span className="recent-date-label">{dayLabel}</span>
                  {obs ? (
                    <div className="recent-badge-wrapper">
                      <StampBadge stamp={obs.stamp} isPeakDay={obs.isPeakDay || obs.isManualPeak} intercourse={obs.intercourse} size="sm" />
                      <span className="recent-code">{obs.codeString}</span>
                    </div>
                  ) : (
                    <span className="recent-empty">{t.todayView.noEntryShort}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 2: Logger Form */}
        <form onSubmit={handleSave} className="today-form-card">
          <div className="today-card-header">
            <div>
              <h2>{t.todayView.title}</h2>
              <span className="subtitle">{t.todayView.subtitle}</span>
            </div>

            {/* Entry Mode Toggle (Direct Code vs Detailed Form) */}
            <div className="entry-mode-toggle" role="radiogroup" aria-label={t.todayView.entryMode}>
              <button
                type="button"
                className={`mode-toggle-btn ${entryMode === 'direct' ? 'active' : ''}`}
                onClick={() => handleSetEntryMode('direct')}
                title="Direct Code Entry Only"
                aria-checked={entryMode === 'direct'}
              >
                <Zap size={14} />
                <span>{t.todayView.modeDirect}</span>
              </button>
              <button
                type="button"
                className={`mode-toggle-btn ${entryMode === 'detailed' ? 'active' : ''}`}
                onClick={() => handleSetEntryMode('detailed')}
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
              onChange={e => handleDirectTextChange(e.target.value)}
            />
          </div>

          {/* Intercourse Toggle Button */}
          <div className="form-group">
            <button
              type="button"
              className={`intercourse-toggle-btn ${intercourse ? 'active' : ''}`}
              onClick={handleIntercourseToggle}
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
                onClick={() => setShowDetailedOverride(!showDetailedOverride)}
              >
                {showDetailedOverride ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                <span>{showDetailedOverride ? t.todayView.hideDetailed : t.todayView.showDetailed}</span>
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
                      onClick={() => handleBleedingSelect(bleeding === code ? undefined : code)}
                      aria-pressed={bleeding === code}
                    >
                      {t.codes.bleeding[code]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mucus Stretch Selection */}
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

              {/* Appearance Modifiers */}
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

              {/* Frequency */}
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

              {/* Contextual Symptoms */}
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
            </>
          )}

          {/* Peak Day Flag */}
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
            <label htmlFor="today-notes">{t.labels.notes}</label>
            <textarea
              id="today-notes"
              className="form-input form-textarea"
              rows={3}
              placeholder="Add relevant notes (e.g., stress, medication, travel)..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Action Bar with Submit Button Grayed Out when Unchanged */}
          <div className="today-form-actions">
            {currentObs?.id ? (
              <button type="button" className="btn btn-danger" onClick={handleDelete} aria-label={t.actions.delete}>
                <Trash2 size={16} />
                <span>{t.actions.delete}</span>
              </button>
            ) : <div />}

            <button 
              type="submit" 
              className={`btn btn-primary btn-lg submit-save-btn ${!hasUnsavedChanges ? 'disabled-submit' : ''}`}
              disabled={!hasUnsavedChanges}
              aria-disabled={!hasUnsavedChanges}
            >
              <Save size={18} />
              <span>{hasUnsavedChanges ? t.actions.save : (currentObs ? 'Saved' : t.actions.save)}</span>
            </button>
          </div>
        </form>

        {/* Column 3: Real-time Stamp Preview Card */}
        <div className="today-status-card desktop-only-stamp-card">
          <div className="status-card-header">
            <Sparkles size={18} className="status-header-icon" />
            <h3>{t.labels.stampPreview}</h3>
          </div>

          <div className="status-stamp-wrapper">
            <StampBadge stamp={calculatedStamp} isPeakDay={isManualPeak} intercourse={intercourse} size="lg" />
            <div className="status-code-text">{currentCode || '---'}</div>
          </div>

          <div className="status-guidance-box">
            <Info size={16} className="guidance-icon" />
            <p>{getFertilityGuidance()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
