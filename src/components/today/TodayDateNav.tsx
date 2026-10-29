import type React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useShortcutHint } from '../../hooks/useKeyboardShortcuts';
import type { Observation } from '../../types/crms';
import { formatMessage } from '../../i18n';
import { formatDateDisplay, getDaysDifference, getTodayStr } from '../../utils/dateUtils';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface TodayDateNavProps {
  selectedDate: string;
  isToday: boolean;
  currentObs?: Observation | undefined;
  /** The cycle day of a date with no observation. */
  cycleDay?: number | undefined;
  onPrevDay: () => void;
  onNextDay: () => void;
  onGoToToday: () => void;
  onDateChange: (dateStr: string) => void;
}

export const TodayDateNav: React.FC<TodayDateNavProps> = ({
  selectedDate,
  isToday,
  currentObs,
  cycleDay,
  onPrevDay,
  onNextDay,
  onGoToToday,
  onDateChange,
}) => {
  const { t } = useLanguage();
  const hint = useShortcutHint();

  // The wrapper is a label, so a click anywhere on it reaches the date input
  const handleOpenPicker = (inputEl: HTMLInputElement) => {
    if (typeof inputEl.showPicker === 'function') {
      try {
        inputEl.showPicker();
      } catch (_e) {
        inputEl.focus();
      }
    } else {
      inputEl.focus();
    }
  };

  const formattedDateTitle = formatDateDisplay(selectedDate, t.locale);
  const shownCycleDay = currentObs?.cycleDay ?? cycleDay;

  /** "Yesterday", "3 days ago", "Tomorrow" or "In 2 days" for a day that is not today. */
  const relativeDay = () => {
    const daysAgo = getDaysDifference(selectedDate, getTodayStr());
    if (daysAgo === 1) return t.todayView.yesterday;
    if (daysAgo === -1) return t.todayView.tomorrow;
    return daysAgo > 0
      ? formatMessage(t.todayView.daysAgo, { count: daysAgo })
      : formatMessage(t.todayView.daysAhead, { count: -daysAgo });
  };

  return (
    <div className="today-header-card compact-date-bar">
      <div className="compact-date-nav-controls">
        <button
          type="button"
          className="icon-button date-nav-btn compact-nav-btn"
          onClick={onPrevDay}
          {...hint(t.todayView.prevDay, 'prevDay')}
          aria-label={t.todayView.prevDay}
        >
          <ChevronLeft size={18} />
        </button>

        <label className="today-picker-wrapper compact-picker-inline">
          <CalendarIcon size={15} className="date-picker-icon" />
          <span className="today-formatted-date-text">{formattedDateTitle}</span>
          <input
            type="date"
            onClick={e => handleOpenPicker(e.currentTarget)}
            className="today-date-picker-input compact-picker-input"
            value={selectedDate}
            onChange={e => {
              if (e.target.value) {
                onDateChange(e.target.value);
              }
            }}
            aria-label={t.labels.date}
          />
        </label>

        <button
          type="button"
          className="icon-button date-nav-btn compact-nav-btn"
          onClick={onNextDay}
          {...hint(t.todayView.nextDay, 'nextDay')}
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
          <span className="badge badge-secondary badge-sm">{relativeDay()}</span>
        )}
        {!isToday && (
          <button
            type="button"
            className="btn btn-xs btn-outline jump-today-btn"
            onClick={onGoToToday}
            {...hint(t.todayView.goToToday, 'goToToday')}
          >
            <RotateCcw size={11} />
            {t.todayView.goToToday}
          </button>
        )}
        {shownCycleDay && (
          <span className="badge badge-secondary badge-sm">
            {formatMessage(t.common.dayNumber, { day: shownCycleDay })}
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
  );
};
