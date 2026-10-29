import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { formatMessage } from '../../i18n';
import {
  BLEEDING_CODES,
  FREQUENCY_CODES,
  MODIFIER_CODES,
  STRETCH_CODES,
  SYMPTOM_CODES,
} from '../../types/crms';
import type { ObservationForm } from '../../hooks/useObservationForm';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';

type GroupId = 'bleeding' | 'stretch' | 'modifiers' | 'frequency' | 'symptoms';

/** The groups of the form, in the order of the paper chart code. */
const GROUP_IDS: readonly GroupId[] = ['bleeding', 'stretch', 'modifiers', 'frequency', 'symptoms'];

const CODES: Record<GroupId, readonly string[]> = {
  bleeding: BLEEDING_CODES,
  stretch: STRETCH_CODES,
  modifiers: MODIFIER_CODES,
  frequency: FREQUENCY_CODES,
  symptoms: SYMPTOM_CODES,
};

/** A group with more values is a set of toggle buttons. The others are a radio group. */
const MULTI: Record<GroupId, boolean> = {
  bleeding: false,
  stretch: false,
  modifiers: true,
  frequency: false,
  symptoms: true,
};

interface ProgressiveObservationFormProps {
  /** The state of `useObservationForm()`. */
  form: ObservationForm;
  /** Direct Code Only: no group rows. The code field, the switches and the notes stay. */
  directOnly: boolean;
  /** The start of the ids of the fields, so that Today and the sheet do not share an id. */
  idPrefix: string;
  /** Called with true while the code field or the notes have the focus. */
  onTypingChange?: ((typing: boolean) => void) | undefined;
}

/**
 * The progressive observation form of Today and of the observation sheet: the code field, one
 * row for each code group, the I and Peak Day switches and the notes. A tap on a row opens the
 * chips of that group and closes the other groups.
 */
export const ProgressiveObservationForm: React.FC<ProgressiveObservationFormProps> = ({
  form,
  directOnly,
  idPrefix,
  onTypingChange,
}) => {
  const { t } = useLanguage();
  const { fields } = form;
  const [open, setOpen] = useState<GroupId | 'notes' | null>(null);
  const [codeFocused, setCodeFocused] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const selected = (group: GroupId): string[] => {
    const value = fields[group];
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
  };

  const choose = (group: GroupId, code: string) => {
    const isOn = selected(group).includes(code);
    switch (group) {
      case 'bleeding':
        return form.selectBleeding(isOn ? undefined : (code as (typeof BLEEDING_CODES)[number]));
      case 'stretch':
        return form.selectStretch(isOn ? undefined : (code as (typeof STRETCH_CODES)[number]));
      case 'frequency':
        return form.selectFrequency(isOn ? undefined : (code as (typeof FREQUENCY_CODES)[number]));
      case 'modifiers':
        return form.toggleModifier(code as (typeof MODIFIER_CODES)[number]);
      case 'symptoms':
        return form.toggleSymptom(code as (typeof SYMPTOM_CODES)[number]);
    }
  };

  const fullName = (group: GroupId, code: string) =>
    (t.codes[group] as Record<string, string>)[code] as string;
  const shortName = (group: GroupId, code: string) =>
    (t.observationForm.shortNames[group] as Record<string, string>)[code] as string;

  /** The value of a closed row, for example "10 - Very stretchy". */
  const rowValue = (group: GroupId) => {
    const codes = selected(group);
    if (codes.length === 0) return null;
    return `${codes.join(', ')} - ${codes.map(code => shortName(group, code)).join(', ')}`;
  };

  // When a group opens, the focus goes to its selected chip, else to its first chip. The notes
  // give the focus to their text area.
  useEffect(() => {
    if (open === 'notes') (notesRef.current as HTMLTextAreaElement).focus();
    else if (open) {
      const chips = chipsRef.current as HTMLDivElement;
      const target =
        chips.querySelector<HTMLElement>('[aria-checked="true"], [aria-pressed="true"]') ??
        (chips.querySelector('.obs-chip') as HTMLElement);
      target.focus();
    }
  }, [open]);

  const toggleGroup = (group: GroupId | 'notes') => setOpen(open === group ? null : group);

  /** In a radio group, the arrow keys move to the next or previous chip and select it. */
  const handleRadioKey = (group: GroupId, index: number) => (e: React.KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const codes = CODES[group];
    const next = (index + step + codes.length) % codes.length;
    // The next chip is never the selected one, so choose() selects it
    choose(group, codes[next] as string);
    const chips = (chipsRef.current as HTMLDivElement).querySelectorAll<HTMLElement>('.obs-chip');
    (chips[next] as HTMLElement).focus();
  };

  const setTyping = (typing: boolean) => onTypingChange?.(typing);

  const parsed = GROUP_IDS.flatMap(group =>
    selected(group).map(code => ({ group, code, name: shortName(group, code) }))
  );
  const showParse = (directOnly || codeFocused) && parsed.length > 0;

  const renderChips = (group: GroupId) => {
    const codes = CODES[group];
    const chosen = selected(group);
    const multi = MULTI[group];
    const label = t.observationForm.groups[group];
    // A radio group has one tab stop: the selected chip, else the first chip
    const tabStop = chosen.length > 0 ? codes.indexOf(chosen[0] as string) : 0;
    return (
      // biome-ignore lint/a11y/useAriaPropsSupportedByRole: group and radiogroup both take a label
      <div
        ref={chipsRef}
        id={`${idPrefix}-group-${group}`}
        className="obs-chips"
        role={multi ? 'group' : 'radiogroup'}
        aria-label={label}
        // A swipe that starts on a chip does not change the day
        data-own-gesture=""
      >
        {codes.map((code, index) => {
          const isOn = chosen.includes(code);
          return (
            <button
              key={code}
              type="button"
              className="obs-chip"
              aria-label={fullName(group, code)}
              {...(multi
                ? { 'aria-pressed': isOn }
                : {
                    role: 'radio',
                    'aria-checked': isOn,
                    tabIndex: index === tabStop ? 0 : -1,
                    onKeyDown: handleRadioKey(group, index),
                  })}
              onClick={() => choose(group, code)}
            >
              <span className="obs-chip-code">{code}</span>
              <small>{shortName(group, code)}</small>
            </button>
          );
        })}
        {chosen.length > 0 && (
          <span className="obs-chip-name">
            {chosen.map(code => fullName(group, code)).join(' · ')}
          </span>
        )}
        {group === 'bleeding' && fields.bleeding && (
          <button
            type="button"
            className={`peak-toggle-btn cycle-start-toggle-btn ${fields.isCycleStart === true ? 'active' : ''}`}
            onClick={form.toggleCycleStart}
            aria-pressed={fields.isCycleStart === true}
          >
            <Calendar size={18} />
            <span>
              {fields.isCycleStart === undefined
                ? t.cycleStartModal.isCycleStartLabel
                : formatMessage(
                    fields.isCycleStart
                      ? t.cycleStartModal.isCycleStartYes
                      : t.cycleStartModal.isCycleStartNo,
                    { label: t.cycleStartModal.isCycleStartLabel }
                  )}
            </span>
          </button>
        )}
      </div>
    );
  };

  const switchRow = (label: string, on: boolean, onToggle: () => void) => (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className="obs-row obs-switch-row"
      onClick={onToggle}
    >
      <span className="obs-row-key">{label}</span>
      <span className="obs-switch" aria-hidden="true" />
    </button>
  );

  const notesOpen = open === 'notes';
  const notesId = `${idPrefix}-notes`;

  return (
    <div className="obs-form">
      <div className="obs-code-wrap">
        <div className={`obs-code-field ${codeFocused ? 'focused' : ''}`}>
          <label htmlFor={`${idPrefix}-direct-code`}>{t.labels.directInput}</label>
          <input
            ref={codeRef}
            id={`${idPrefix}-direct-code`}
            type="text"
            className="direct-code-input"
            placeholder={t.labels.directInputPlaceholder}
            value={form.directInputText}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            onChange={e => form.setDirectText(e.target.value)}
            onFocus={() => {
              setCodeFocused(true);
              setTyping(true);
            }}
            onBlur={() => {
              setCodeFocused(false);
              setTyping(false);
            }}
          />
          {codeFocused && (
            <button
              type="button"
              className="btn btn-sm btn-ghost obs-done-btn"
              // The button keeps the focus in the field until the click blurs it
              onPointerDown={e => e.preventDefault()}
              onClick={() => codeRef.current?.blur()}
            >
              {t.observationForm.done}
            </button>
          )}
        </div>

        {showParse && (
          // Over the rows while the field has the focus, so that a blur does not move the Save button
          <ul
            className={`obs-parse ${directOnly ? '' : 'floating'}`}
            aria-label={t.observationForm.readAs}
            aria-live="polite"
          >
            {parsed.map(({ group, code, name }) => (
              <li key={`${group}-${code}`}>
                <b>{code}</b> {name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="obs-rows">
        {!directOnly &&
          GROUP_IDS.map(group => {
            const isOpen = open === group;
            const value = rowValue(group);
            return (
              <div key={group} className="obs-group">
                <button
                  type="button"
                  className={`obs-row ${isOpen ? 'open' : ''}`}
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? `${idPrefix}-group-${group}` : undefined}
                  onClick={() => toggleGroup(group)}
                >
                  <span className="obs-row-key">{t.observationForm.groups[group]}</span>
                  <span className={`obs-row-value ${value ? 'set' : ''}`}>
                    {value ?? t.observationForm.none}
                  </span>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {isOpen && renderChips(group)}
              </div>
            );
          })}

        {switchRow(t.codes.intercourse.I, fields.intercourse, form.toggleIntercourse)}
        {switchRow(t.actions.setPeak, fields.isManualPeak, form.toggleManualPeak)}

        <div className="obs-group">
          <button
            type="button"
            className={`obs-row ${notesOpen ? 'open' : ''}`}
            aria-expanded={notesOpen}
            aria-controls={notesOpen ? notesId : undefined}
            onClick={() => toggleGroup('notes')}
          >
            <span className="obs-row-key">{t.observationForm.notes}</span>
            <span className={`obs-row-value ${fields.notes.trim() ? 'set' : ''}`}>
              {fields.notes.trim() || t.observationForm.none}
            </span>
            {notesOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {notesOpen && (
            <div className="obs-notes">
              <textarea
                ref={notesRef}
                id={notesId}
                className="form-input form-textarea"
                rows={3}
                aria-label={t.labels.notes}
                placeholder={t.todayView.notesPlaceholder}
                value={fields.notes}
                onChange={e => form.setNotes(e.target.value)}
                onFocus={() => setTyping(true)}
                onBlur={() => setTyping(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
