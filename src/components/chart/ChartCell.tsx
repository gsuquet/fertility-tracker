import type React from 'react';
import { useState } from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatMessage } from '../../i18n';
import type { Observation } from '../../types/crms';
import { formatDayOfWeek } from '../../utils/dateUtils';
import { StampBadge } from '../StampBadge';
import { ChartCellPopover } from './ChartCellPopover';

/** Opens a cell with the keyboard like a button */
const onActivateKey = (open: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    open();
  }
};

/** Removes the symptom codes, which the cell shows in its own tag */
const cleanCode = (codeString: string) =>
  codeString
    .replace(/\b(AP|RAP|LAP)\b/g, '')
    .trim()
    .replace(/\s+/g, ' ');

const TodayPill: React.FC = () => {
  const { t } = useLanguage();
  return (
    <span className="cell-today-pill" title={t.todayView.todayLabel}>
      {t.todayView.todayLabel}
    </span>
  );
};

interface ChartFilledCellProps {
  obs: Observation;
  isToday: boolean;
  onOpen: (obs: Observation) => void;
}

/** A day with an observation. It keeps its own hover state, so a hover renders only this cell. */
export const ChartFilledCell: React.FC<ChartFilledCellProps> = ({ obs, isToday, onOpen }) => {
  const { t } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);
  const open = () => onOpen(obs);
  const code = cleanCode(obs.codeString);

  return (
    <div
      className={`chart-cell filled-cell paper-cell ${obs.isPeakDay ? 'peak-cell' : ''} ${obs.stamp.toLowerCase()} ${isToday ? 'is-today' : ''}`}
      aria-current={isToday ? 'date' : undefined}
      onClick={open}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      tabIndex={0}
      role="button"
      aria-label={formatMessage(t.chartStrip.filledCellLabel, {
        day: obs.cycleDay,
        date: obs.date,
        stamp: obs.stamp,
        code: obs.codeString || t.chartStrip.noCode,
        today: isToday ? t.chartStrip.todaySuffix : '',
      })}
      onKeyDown={onActivateKey(open)}
    >
      <div className="cell-header">
        {isToday && <TodayPill />}
        <span className="cell-day-num">{obs.cycleDay}</span>
        <span className="cell-day-name">{formatDayOfWeek(obs.date, t.locale)}</span>
        <span className="cell-date">{obs.date.slice(5)}</span>
      </div>

      <div className="cell-stamp-wrapper">
        <StampBadge
          stamp={obs.stamp}
          isPeakDay={obs.isPeakDay}
          intercourse={obs.intercourse}
          size="sm"
        />
      </div>

      <div className="cell-code" title={code}>
        {code || '---'}
      </div>

      <div className="cell-footer-indicators">
        {obs.symptoms && obs.symptoms.length > 0 && (
          <span
            className="cell-symptom-tag"
            title={formatMessage(t.chartStrip.symptomsTitle, { symptoms: obs.symptoms.join(', ') })}
          >
            {obs.symptoms.join(',')}
          </span>
        )}
        {obs.notes && obs.notes.trim() !== '' && (
          <span className="cell-notes-icon" title={`${t.chartStrip.notesTooltip}: ${obs.notes}`}>
            <MessageSquare size={10} />
          </span>
        )}
      </div>

      {isHovered && <ChartCellPopover obs={obs} />}
    </div>
  );
};

interface ChartEmptyCellProps {
  dayNum: number;
  dateStr: string;
  isToday: boolean;
  onOpen: (date: string, dayNum: number) => void;
}

/** A day without an observation inside a cycle row */
export const ChartEmptyCell: React.FC<ChartEmptyCellProps> = ({
  dayNum,
  dateStr,
  isToday,
  onOpen,
}) => {
  const { t } = useLanguage();
  const open = () => onOpen(dateStr, dayNum);
  return (
    <div
      className={`chart-cell empty-cell paper-cell ${isToday ? 'is-today' : ''}`}
      aria-current={isToday ? 'date' : undefined}
      onClick={open}
      tabIndex={0}
      role="button"
      aria-label={formatMessage(t.chartStrip.emptyCellLabel, {
        day: dayNum,
        date: dateStr,
        today: isToday ? t.chartStrip.todaySuffix : '',
      })}
      onKeyDown={onActivateKey(open)}
    >
      <div className="cell-header">
        {isToday && <TodayPill />}
        <span className="cell-day-num">{dayNum}</span>
        <span className="cell-date">{dateStr.slice(5)}</span>
      </div>

      <div className="cell-placeholder">
        <Plus size={14} className="add-icon" />
      </div>
    </div>
  );
};

interface ChartBlankCellProps {
  dayNum: number;
  dateStr: string;
  isToday: boolean;
  addLabel: string;
  onOpen: (date: string, dayNum: number) => void;
}

/** A day of the blank grid that shows before the first observation */
export const ChartBlankCell: React.FC<ChartBlankCellProps> = ({
  dayNum,
  dateStr,
  isToday,
  addLabel,
  onOpen,
}) => {
  const { t } = useLanguage();
  const open = () => onOpen(dateStr, dayNum);
  return (
    <div
      className={`chart-cell empty-cell paper-cell ${isToday ? 'is-today' : ''}`}
      onClick={open}
      tabIndex={0}
      role="button"
      aria-label={formatMessage(t.chartStrip.blankCellLabel, {
        day: dayNum,
        date: dateStr,
        today: isToday ? t.chartStrip.todaySuffix : '',
      })}
      onKeyDown={onActivateKey(open)}
    >
      <div className="cell-header">
        {isToday && <TodayPill />}
        <span className="cell-day-num">{dayNum}</span>
        <span className="cell-date">{dateStr.slice(5)}</span>
      </div>
      <div className="cell-placeholder">
        <Plus size={16} className="add-icon" />
        <span className="add-label">{addLabel}</span>
      </div>
    </div>
  );
};
