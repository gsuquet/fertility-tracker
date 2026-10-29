import type React from 'react';
import type { TranslationSchema } from '../../i18n';
import { formatMessage } from '../../i18n';
import type { Observation } from '../../types/crms';
import { formatDateDisplay } from '../../utils/dateUtils';
import { hasObservationCode, showsEmptyStamp } from '../../domain/stampCalculator';
import { StampBadge } from '../StampBadge';
import { fertilityGuidance } from '../today/fertilityGuidance';

interface ChartDayDetailProps {
  date: string;
  cycleNum: number;
  dayNum: number;
  /** The saved observation of the day, if any */
  obs: Observation | undefined;
  t: TranslationSchema;
  onEdit: () => void;
  onOpenInToday: () => void;
}

/**
 * The bar under the rows of the desktop chart: the selected day, with Edit and Open in Today.
 * It replaces the observation sheet that a click opens on a phone.
 */
export const ChartDayDetail: React.FC<ChartDayDetailProps> = ({
  date,
  cycleNum,
  dayNum,
  obs,
  t,
  onEdit,
  onOpenInToday,
}) => {
  const hasCode = !!obs && hasObservationCode(obs);
  const sentence = hasCode ? fertilityGuidance(obs.stamp, t) : t.todayView.noObservation;
  const saved = obs ? t.todayView.loggedStatus : t.todayView.notLoggedStatus;

  return (
    <section className="chart-day-detail" aria-label={t.chartStrip.detailLabel}>
      <StampBadge
        stamp={obs?.stamp ?? 'DARK_GREEN'}
        isPeakDay={obs?.isPeakDay}
        intercourse={obs?.intercourse}
        size="lg"
        isEmpty={!obs || showsEmptyStamp(obs)}
      />
      {/* Only the text is read again when the selection moves, not the buttons */}
      <div className="chart-day-detail-text" aria-live="polite">
        <p>
          <strong>
            {formatMessage(t.chartStrip.detailDay, {
              date: formatDateDisplay(date, t.locale, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              }),
              cycle: cycleNum,
              day: dayNum,
            })}
          </strong>
          {hasCode && (
            <>
              {' · '}
              <span className="chart-day-detail-code">{obs.codeString}</span>
            </>
          )}
        </p>
        <p className="chart-day-detail-sentence">
          {sentence} {saved}.
        </p>
        {obs?.notes?.trim() && <p className="chart-day-detail-notes">{obs.notes}</p>}
      </div>
      <button type="button" className="btn btn-secondary" onClick={onEdit}>
        {t.chartStrip.editDay}
      </button>
      <button type="button" className="btn btn-secondary" onClick={onOpenInToday}>
        {t.chartStrip.openInToday}
      </button>
    </section>
  );
};
