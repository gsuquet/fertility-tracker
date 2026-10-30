import type React from 'react';
import { ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatMessage } from '../../i18n';
import type { Cycle, Observation } from '../../types/crms';
import { getCycleDayOn } from '../../domain/cycleBoundaryDetector';
import { showsEmptyStamp } from '../../domain/stampCalculator';
import { addDays, formatDateDisplay, getTodayStr } from '../../utils/dateUtils';
import { StampBadge } from '../StampBadge';

interface TodayRecentDaysProps {
  selectedDate: string;
  /** 7 days from 1360 px, 5 days from 1024 px */
  count: number;
  observations: Observation[];
  cycles: Cycle[];
  onSelectDate: (date: string) => void;
}

/** Desktop: the days before the selected day, newest first. A click opens that day. */
export const TodayRecentDays: React.FC<TodayRecentDaysProps> = ({
  selectedDate,
  count,
  observations,
  cycles,
  onSelectDate,
}) => {
  const { t } = useLanguage();
  const days = Array.from({ length: count }, (_, idx) => addDays(selectedDate, -(idx + 1)));

  return (
    <section className="today-recent-days" aria-labelledby="today-recent-title">
      <h2 id="today-recent-title">{formatMessage(t.todayView.lastDays, { count })}</h2>
      <ul>
        {days.map(date => {
          const obs = observations.find(o => o.date === date);
          // A day after today has no cycle day
          const cycleDay = date <= getTodayStr() ? getCycleDayOn(cycles, date) : undefined;
          return (
            <li key={date}>
              <button type="button" className="recent-day-row" onClick={() => onSelectDate(date)}>
                {/* The code gives the same facts: the stamp is hidden from screen readers */}
                <span className="recent-day-stamp" aria-hidden="true">
                  <StampBadge
                    stamp={obs?.stamp ?? 'DARK_GREEN'}
                    isPeakDay={obs?.isPeakDay}
                    intercourse={obs?.intercourse}
                    size="sm"
                    isEmpty={!obs || showsEmptyStamp(obs)}
                  />
                </span>
                <span className="recent-day-date">
                  {formatDateDisplay(date, t.locale, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="recent-day-cycle">
                  {cycleDay !== undefined && formatMessage(t.common.dayNumber, { day: cycleDay })}
                </span>
                <span className={obs ? 'recent-day-code' : 'recent-day-empty'}>
                  {obs ? obs.codeString : t.todayView.noEntryShort}
                </span>
                <ChevronRight size={18} aria-hidden="true" className="recent-day-chevron" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
