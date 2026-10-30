import type React from 'react';
import type { TranslationSchema } from '../../i18n';
import { formatMessage } from '../../i18n';
import type { Observation } from '../../types/crms';
import { formatDateDisplay } from '../../utils/dateUtils';
import { hasObservationCode, showsEmptyStamp } from '../../domain/stampCalculator';
import { StampBadge } from '../StampBadge';
import { fertilityGuidance } from '../today/fertilityGuidance';

const DETAIL_DATE: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
};

interface DetailDay {
  date: string;
  /** The cycle and the cycle day. A date before the first cycle has none. */
  cycleNum: number | undefined;
  dayNum: number | undefined;
  /** The saved observation of the day, if any */
  obs: Observation | undefined;
}

interface ChartDayDetailProps {
  /** The selected day. With no day, only the empty live region stays in the page. */
  day: DetailDay | undefined;
  t: TranslationSchema;
  onEdit: () => void;
  onOpenInToday: () => void;
  /** The calendar adds Open in Chart. The chart has no such button. */
  onOpenInChart?: (() => void) | undefined;
  /** A bar under the chart rows, or a panel beside the calendar grid */
  variant?: 'bar' | 'panel' | undefined;
}

/**
 * The selected day of the desktop chart and calendar, with Edit and Open in Today. It replaces
 * the observation sheet that a click opens on a phone.
 */
export const ChartDayDetail: React.FC<ChartDayDetailProps> = ({
  day,
  t,
  onEdit,
  onOpenInToday,
  onOpenInChart,
  variant = 'bar',
}) => {
  const obs = day?.obs;
  const hasCode = !!obs && hasObservationCode(obs);
  // A saved day with no code, for example with notes only, is not a day with no observation
  const sentence = hasCode
    ? fertilityGuidance(obs.stamp, t)
    : obs
      ? t.chartStrip.dayNoCode
      : t.todayView.noObservation;
  const saved = obs ? t.todayView.loggedStatus : t.todayView.notLoggedStatus;

  // The live region keeps its place in the tree, so that it reads the first selection too
  return (
    <section
      className={`chart-day-detail is-${variant} ${day ? '' : 'is-empty'}`}
      aria-label={day ? t.chartStrip.detailLabel : undefined}
    >
      {day && (
        <StampBadge
          stamp={obs?.stamp ?? 'DARK_GREEN'}
          isPeakDay={obs?.isPeakDay}
          intercourse={obs?.intercourse}
          size="lg"
          isEmpty={!obs || showsEmptyStamp(obs)}
        />
      )}
      {/* Only the text is read again when the selection moves, not the buttons */}
      <div className="chart-day-detail-text" aria-live="polite">
        {day && (
          <>
            <p>
              <strong>
                {day.cycleNum === undefined || day.dayNum === undefined
                  ? formatDateDisplay(day.date, t.locale, DETAIL_DATE)
                  : formatMessage(t.chartStrip.detailDay, {
                      date: formatDateDisplay(day.date, t.locale, DETAIL_DATE),
                      cycle: day.cycleNum,
                      day: day.dayNum,
                    })}
              </strong>
              {hasCode && (
                <>
                  {' · '}
                  <span className="chart-day-detail-code">{obs.codeString}</span>
                </>
              )}
            </p>
            <p className="chart-day-detail-sentence">{sentence}</p>
            <p className="chart-day-detail-sentence">{saved}</p>
            {obs?.notes?.trim() && <p className="chart-day-detail-notes">{obs.notes}</p>}
          </>
        )}
      </div>
      {day && (
        <div className="chart-day-detail-actions">
          <button type="button" className="btn btn-secondary" onClick={onEdit}>
            {t.chartStrip.editDay}
          </button>
          {onOpenInChart && (
            <button type="button" className="btn btn-secondary" onClick={onOpenInChart}>
              {t.chartStrip.openInChart}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onOpenInToday}>
            {t.chartStrip.openInToday}
          </button>
        </div>
      )}
    </section>
  );
};
