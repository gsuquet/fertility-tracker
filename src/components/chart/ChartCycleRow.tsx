import type React from 'react';
import type { Cycle, Observation } from '../../types/crms';
import type { TranslationSchema } from '../../i18n';
import { formatMessage } from '../../i18n';
import { addDays, formatDateDisplay } from '../../utils/dateUtils';
import { getCycleEndDate } from '../../domain/cycleBoundaryDetector';
import { ChartPhaseTimeline } from './ChartPhaseTimeline';
import { ChartEmptyCell, ChartFilledCell } from './ChartCell';
import type { ChartViewMode } from './ChartToolbar';

interface ChartCycleRowProps {
  cycle: Cycle;
  cycleNum: number;
  /** The number of day slots of each row, so that the rows align by cycle day */
  totalSlots: number;
  viewMode: ChartViewMode;
  showPhaseBar: boolean;
  /** Today, for the cycle that holds it only */
  todayStr: string | undefined;
  /** The jump and scroll buttons, on the first row only */
  controls?: React.ReactNode;
  /** Moves the strips of the other rows with this one */
  onStripScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  t: TranslationSchema;
  onOpenObservation: (obs: Observation) => void;
  onOpenDay: (date: string, dayNum: number) => void;
}

/** The short date of the cycle line, for example "Sep 30" */
const shortDate = (date: string, locale: string) =>
  formatDateDisplay(date, locale, { month: 'short', day: 'numeric' });

/** One cycle of the paper chart: the cycle line, the phase bar and one row of day cards */
export const ChartCycleRow: React.FC<ChartCycleRowProps> = ({
  cycle,
  cycleNum,
  totalSlots,
  viewMode,
  showPhaseBar,
  todayStr,
  controls,
  onStripScroll,
  t,
  onOpenObservation,
  onOpenDay,
}) => {
  const byDay = new Map(cycle.observations.map(o => [o.cycleDay, o]));
  // A cycle always has an observation: the first day
  const lengthDays = (cycle.observations.at(-1) as Observation).cycleDay;
  const peakDayNum = cycle.observations.find(o => o.isPeakDay)?.cycleDay;
  const title = `${t.chartStrip.cycleBadge} ${cycleNum}`;

  return (
    <section className={`chart-row-container view-${viewMode}`} aria-label={title}>
      <div className="cycle-line">
        <h3 className="cycle-line-title">{title}</h3>
        <span>
          {shortDate(cycle.startDate, t.locale)} – {shortDate(getCycleEndDate(cycle), t.locale)}
        </span>
        <span aria-hidden="true">·</span>
        <span>{formatMessage(t.chartStrip.cycleDays, { count: lengthDays })}</span>
        {peakDayNum && (
          <>
            <span aria-hidden="true">·</span>
            <span className="cycle-line-peak">
              {formatMessage(t.chartStrip.peakShort, { day: peakDayNum })}
            </span>
          </>
        )}
      </div>

      {controls}

      {showPhaseBar && <ChartPhaseTimeline cycle={cycle} totalSlots={totalSlots} t={t} />}

      <div className="chart-row-scroll" onScroll={onStripScroll}>
        <div className="chart-row-strip">
          {Array.from({ length: totalSlots }, (_, idx) => {
            const dayNum = idx + 1;
            const obs = byDay.get(dayNum);
            const dateStr = obs?.date ?? addDays(cycle.startDate, idx);
            const isToday = dateStr === todayStr;
            return obs ? (
              <ChartFilledCell
                key={dayNum}
                obs={obs}
                isToday={isToday}
                viewMode={viewMode}
                onOpen={onOpenObservation}
              />
            ) : (
              <ChartEmptyCell
                key={dayNum}
                dayNum={dayNum}
                dateStr={dateStr}
                isToday={isToday}
                viewMode={viewMode}
                labelTemplate={t.chartStrip.emptyCellLabel}
                onOpen={onOpenDay}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};
