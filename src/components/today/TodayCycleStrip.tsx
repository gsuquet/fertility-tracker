import type React from 'react';
import { ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatMessage } from '../../i18n';
import type { Cycle } from '../../types/crms';
import { getCyclePhases } from '../../domain/cyclePhases';
import { showsEmptyStamp } from '../../domain/stampCalculator';
import { getDaysDifference } from '../../utils/dateUtils';
import { StampBadge } from '../StampBadge';

interface TodayCycleStripProps {
  /** The cycle of the selected day */
  cycle: Cycle;
  selectedDate: string;
  onOpenChart?: (() => void) | undefined;
}

/**
 * Desktop from 1360 px: the cycle of the selected day in one row of 35 columns or more, with the
 * cycle day under each stamp. It is a picture: the chart is the place to open a day.
 */
export const TodayCycleStrip: React.FC<TodayCycleStripProps> = ({
  cycle,
  selectedDate,
  onOpenChart,
}) => {
  const { t } = useLanguage();
  const { lengthDays, peak } = getCyclePhases(cycle);
  const selectedDay = getDaysDifference(cycle.startDate, selectedDate) + 1;
  const length = Math.max(lengthDays, selectedDay);
  const byDay = new Map(cycle.observations.map(o => [o.cycleDay, o]));

  const summary = [
    formatMessage(t.todayView.cycleDayOf, { day: selectedDay, length }),
    peak && formatMessage(t.todayView.peakOnDay, { day: peak.cycleDay }),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="today-cycle-card" aria-labelledby="today-cycle-title">
      <div className="today-cycle-head">
        <h2 id="today-cycle-title">{t.todayView.thisCycle}</h2>
        <span className="today-cycle-summary">{summary}</span>
        {onOpenChart && (
          <button type="button" className="btn btn-ghost today-cycle-open" onClick={onOpenChart}>
            {t.todayView.openChart}
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <div
        className="today-cycle-strip"
        role="img"
        aria-label={`${t.todayView.thisCycle}: ${summary}`}
      >
        {/* The picture has its name: the columns are hidden from screen readers */}
        {Array.from({ length: Math.max(35, length) }, (_, idx) => {
          const day = idx + 1;
          const obs = byDay.get(day);
          return (
            <span
              key={day}
              className={`strip-day ${day === selectedDay ? 'is-selected' : ''}`}
              aria-hidden="true"
            >
              {obs ? (
                <StampBadge
                  stamp={obs.stamp}
                  size="sm"
                  isEmpty={showsEmptyStamp(obs)}
                  showCount={false}
                />
              ) : (
                <span className="strip-day-empty" />
              )}
              <span className="strip-day-num">{day}</span>
            </span>
          );
        })}
      </div>
    </section>
  );
};
