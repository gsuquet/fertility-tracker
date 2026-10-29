import type React from 'react';
import { useState } from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatMessage } from '../../i18n';
import type { Observation } from '../../types/crms';
import { formatDayOfWeek } from '../../utils/dateUtils';
import { StampBadge } from '../StampBadge';
import { ChartCellPopover } from './ChartCellPopover';
import { showsEmptyStamp } from '../../domain/stampCalculator';
import type { ChartViewMode } from './ChartToolbar';

const SYMPTOM_TOKENS = new Set(['AP', 'RAP', 'LAP']);

/**
 * The code tokens that the card shows, one on each line. The stamp shows the `I` mark and the tag
 * shows the symptoms, so the card does not repeat them.
 */
export const cardCodeTokens = (codeString: string) =>
  codeString
    .split(/\s+/)
    .filter(token => token !== '' && token !== 'I' && !SYMPTOM_TOKENS.has(token));

/** The cycle day, the weekday and the date at the top of a card */
const CellHeader: React.FC<{ dayNum: number; dateStr: string; compact: boolean }> = ({
  dayNum,
  dateStr,
  compact,
}) => {
  const { t } = useLanguage();
  return (
    <span className="cell-header">
      <span className="cell-day-num">{dayNum}</span>
      {!compact && (
        <>
          <span className="cell-day-name">{formatDayOfWeek(dateStr, t.locale)}</span>
          <span className="cell-date">{dateStr.slice(5)}</span>
        </>
      )}
    </span>
  );
};

interface ChartFilledCellProps {
  obs: Observation;
  isToday: boolean;
  viewMode: ChartViewMode;
  /** On a desktop, a click selects the day: true for the selected day. Undefined on a phone. */
  selected?: boolean | undefined;
  onOpen: (obs: Observation) => void;
}

/** A day with an observation. It keeps its own hover state, so a hover renders only this cell. */
export const ChartFilledCell: React.FC<ChartFilledCellProps> = ({
  obs,
  isToday,
  viewMode,
  selected,
  onOpen,
}) => {
  const { t } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);
  const compact = viewMode === 'compact';
  const tokens = cardCodeTokens(obs.codeString);
  const hasNotes = !!obs.notes && obs.notes.trim() !== '';

  return (
    <button
      type="button"
      className={`chart-cell filled-cell paper-cell ${obs.isPeakDay ? 'peak-cell' : ''} ${obs.stamp.toLowerCase()} ${isToday ? 'is-today' : ''} ${selected ? 'is-selected' : ''}`}
      aria-current={isToday ? 'date' : undefined}
      aria-pressed={selected}
      onClick={() => onOpen(obs)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      aria-label={formatMessage(t.chartStrip.filledCellLabel, {
        day: obs.cycleDay,
        date: obs.date,
        stamp: obs.stamp,
        code: obs.codeString || t.chartStrip.noCode,
        today: isToday ? t.chartStrip.todaySuffix : '',
      })}
    >
      <CellHeader dayNum={obs.cycleDay} dateStr={obs.date} compact={compact} />

      <StampBadge
        stamp={obs.stamp}
        isPeakDay={obs.isPeakDay}
        intercourse={obs.intercourse}
        size="sm"
        isEmpty={showsEmptyStamp(obs)}
      />

      {!compact && (
        <>
          <span className="cell-code">
            {tokens.map((token, index) => (
              <span key={`${token}-${index}`} className="cell-code-token">
                {token}
              </span>
            ))}
          </span>

          <span className="cell-footer-indicators">
            {obs.symptoms && obs.symptoms.length > 0 && (
              <span
                className="cell-symptom-tag"
                title={formatMessage(t.chartStrip.symptomsTitle, {
                  symptoms: obs.symptoms.join(', '),
                })}
              >
                {obs.symptoms.join(',')}
              </span>
            )}
            {hasNotes && (
              <span
                className="cell-notes-icon"
                title={`${t.chartStrip.notesTooltip}: ${obs.notes}`}
              >
                <MessageSquare size={11} />
              </span>
            )}
          </span>
        </>
      )}

      {isHovered && <ChartCellPopover obs={obs} />}
    </button>
  );
};

interface ChartEmptyCellProps {
  dayNum: number;
  dateStr: string;
  isToday: boolean;
  /** The 35-day view by default */
  viewMode?: ChartViewMode;
  /** On a desktop, a click selects the day: true for the selected day. Undefined on a phone. */
  selected?: boolean | undefined;
  /** The accessible name template: a day of a cycle, or a day of the blank grid */
  labelTemplate: string;
  onOpen: (date: string, dayNum: number) => void;
}

/** A day with no observation, in a cycle row or in the blank grid */
export const ChartEmptyCell: React.FC<ChartEmptyCellProps> = ({
  dayNum,
  dateStr,
  isToday,
  viewMode = '35-day',
  selected,
  labelTemplate,
  onOpen,
}) => {
  const { t } = useLanguage();
  const compact = viewMode === 'compact';
  return (
    <button
      type="button"
      className={`chart-cell empty-cell paper-cell ${isToday ? 'is-today' : ''} ${selected ? 'is-selected' : ''}`}
      aria-current={isToday ? 'date' : undefined}
      aria-pressed={selected}
      onClick={() => onOpen(dateStr, dayNum)}
      aria-label={formatMessage(labelTemplate, {
        day: dayNum,
        date: dateStr,
        today: isToday ? t.chartStrip.todaySuffix : '',
      })}
    >
      <CellHeader dayNum={dayNum} dateStr={dateStr} compact={compact} />
      <Plus size={16} className="add-icon" />
    </button>
  );
};
