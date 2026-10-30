import type React from 'react';
import type { Cycle, Observation } from '../../types/crms';
import type { TranslationSchema } from '../../i18n';
import { formatMessage } from '../../i18n';
import { addDays, formatDateDisplay } from '../../utils/dateUtils';
import { getCycleEndDate } from '../../domain/cycleBoundaryDetector';
import { ChartStampBar } from './ChartStampBar';
import { ChartEmptyCell, ChartFilledCell } from './ChartCell';
import type { ChartViewMode } from './ChartToolbar';

interface ChartCycleRowProps {
  cycle: Cycle;
  cycleNum: number;
  /** The number of day slots of each row, so that the rows align by cycle day */
  totalSlots: number;
  viewMode: ChartViewMode;
  showStampBar: boolean;
  /** Today, for the cycle that holds it only */
  todayStr: string | undefined;
  /** The jump and scroll buttons, on the first row only */
  controls?: React.ReactNode;
  /**
   * On a desktop, the date of the selected day, or null. Undefined on a phone, where a click
   * opens the observation sheet.
   */
  selectedDate?: string | null | undefined;
  /** A past cycle of a desktop chart with more than 4 cycles: true while it shows the stamps only */
  collapsed?: boolean | undefined;
  /** Opens or closes the full row of a past cycle. Only a row that can collapse has it. */
  onToggleCollapsed?: (() => void) | undefined;
  /** Moves the strips of the other rows with this one */
  onStripScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  t: TranslationSchema;
  onOpenObservation: (obs: Observation) => void;
  onOpenDay: (date: string, dayNum: number) => void;
}

/** The short date of the cycle line, for example "Sep 30" */
const shortDate = (date: string, locale: string) =>
  formatDateDisplay(date, locale, { month: 'short', day: 'numeric' });

/** One cycle of the paper chart: the cycle line, the stamp bar and one row of day cards */
export const ChartCycleRow: React.FC<ChartCycleRowProps> = ({
  cycle,
  cycleNum,
  totalSlots,
  viewMode,
  showStampBar,
  todayStr,
  controls,
  selectedDate,
  collapsed,
  onToggleCollapsed,
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
  // A collapsed row keeps the columns of its view, with the content of the Strip view
  const cellMode: ChartViewMode = collapsed ? 'compact' : viewMode;
  const isSelected = (date: string) =>
    selectedDate === undefined ? undefined : selectedDate === date;

  return (
    <section
      className={`chart-row-container view-${viewMode} ${collapsed ? 'is-collapsed' : ''}`}
      aria-label={title}
    >
      <div className="cycle-head">
        <div className="cycle-line">
          <h3 className="cycle-line-title">
            {onToggleCollapsed ? (
              <button
                type="button"
                className="cycle-line-toggle"
                aria-expanded={!collapsed}
                title={formatMessage(collapsed ? t.chartStrip.showRow : t.chartStrip.hideRow, {
                  number: cycleNum,
                })}
                onClick={onToggleCollapsed}
              >
                {title}
              </button>
            ) : (
              title
            )}
          </h3>
          <span className="cycle-line-dates">
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
      </div>

      <div className="chart-row-scroll" onScroll={onStripScroll}>
        {/* Phone: one bar over the card, which does not scroll. Desktop: one segment for each column. */}
        {showStampBar && !collapsed && (
          <ChartStampBar cycle={cycle} totalSlots={totalSlots} t={t} />
        )}
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
                viewMode={cellMode}
                selected={isSelected(dateStr)}
                onOpen={onOpenObservation}
              />
            ) : (
              <ChartEmptyCell
                key={dayNum}
                dayNum={dayNum}
                dateStr={dateStr}
                isToday={isToday}
                viewMode={cellMode}
                selected={isSelected(dateStr)}
                labelTemplate={
                  // On a desktop, a click selects the empty day and does not add an observation
                  selectedDate === undefined
                    ? t.chartStrip.emptyCellLabel
                    : t.chartStrip.blankCellLabel
                }
                onOpen={onOpenDay}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};
