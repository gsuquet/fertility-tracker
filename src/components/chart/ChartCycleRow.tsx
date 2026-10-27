import type React from 'react';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Target } from 'lucide-react';
import type { Cycle, Observation } from '../../types/crms';
import type { TranslationSchema } from '../../i18n';
import { addDays } from '../../utils/dateUtils';
import { getCycleEndDate } from '../../domain/cycleBoundaryDetector';
import { ChartPhaseTimeline } from './ChartPhaseTimeline';
import { ChartEmptyCell, ChartFilledCell } from './ChartCell';
import type { ChartViewMode } from './ChartToolbar';

interface ChartCycleRowProps {
  cycle: Cycle;
  cycleNum: number;
  viewMode: ChartViewMode;
  showPhaseBar: boolean;
  todayStr: string;
  t: TranslationSchema;
  onOpenObservation: (obs: Observation) => void;
  onOpenDay: (date: string, dayNum: number) => void;
}

interface Slot {
  dayNum: number;
  obs: Observation | undefined;
  dateStr: string;
}

/** Slots of a row: every day up to a whole week (35 at least) in the grid, or only the observations */
const buildSlots = (cycle: Cycle, viewMode: ChartViewMode) => {
  if (viewMode === 'compact') {
    const slots: Slot[] = cycle.observations.map(obs => ({
      dayNum: obs.cycleDay,
      obs,
      dateStr: obs.date,
    }));
    return { slots, totalSlots: cycle.observations.length };
  }
  const obsMap = new Map<number, Observation>();
  cycle.observations.forEach(o => obsMap.set(o.cycleDay, o));
  const maxObsDay = Math.max(...cycle.observations.map(o => o.cycleDay), 0);
  const totalSlots = Math.max(35, Math.ceil(maxObsDay / 7) * 7);
  const slots: Slot[] = Array.from({ length: totalSlots }, (_, i) => {
    const dayNum = i + 1;
    const obs = obsMap.get(dayNum);
    return { dayNum, obs, dateStr: obs?.date || addDays(cycle.startDate, dayNum - 1) };
  });
  return { slots, totalSlots };
};

/** One cycle of the paper chart: header, navigation, phase bar and cells */
export const ChartCycleRow: React.FC<ChartCycleRowProps> = ({
  cycle,
  cycleNum,
  viewMode,
  showPhaseBar,
  todayStr,
  t,
  onOpenObservation,
  onOpenDay,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const daysCount = cycle.observations.length;
  const peakDayNum = cycle.observations.find(o => o.isPeakDay)?.cycleDay;
  const { slots, totalSlots } = buildSlots(cycle, viewMode);

  // The controls render with their row, so the row element exists
  const scrollRow = (direction: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
  };
  const jumpToPeak = () => {
    scrollRef.current
      ?.querySelector('.peak-cell')
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };
  const jumpToStart = () => {
    scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  };
  const jumpToEnd = () => {
    const el = scrollRef.current;
    el?.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
  };

  return (
    <div className="chart-row-container paper-theme">
      <div className="chart-row-header flex-header">
        <div className="cycle-header-left">
          <span className="cycle-title-badge">
            {t.chartStrip.cycleBadge} {cycleNum}
          </span>
          <span className="cycle-date-range">
            {cycle.startDate} → {getCycleEndDate(cycle)}
          </span>
          <span className="cycle-length-pill">
            {daysCount} {t.stats.days}
          </span>

          {peakDayNum && (
            <span className="cycle-peak-pill" title={t.chartStrip.jumpToPeak}>
              <Target size={12} /> {t.chartStrip.phasePeak}: Day {peakDayNum}
            </span>
          )}
        </div>

        <div className="cycle-header-actions">
          <button className="nav-icon-btn" onClick={jumpToStart} title={t.chartStrip.jumpToStart}>
            {t.chartStrip.jumpToStart}
          </button>

          {peakDayNum && (
            <button
              className="nav-icon-btn peak-btn"
              onClick={jumpToPeak}
              title={t.chartStrip.jumpToPeak}
            >
              <Target size={13} /> P
            </button>
          )}

          <button className="nav-icon-btn" onClick={jumpToEnd} title={t.chartStrip.jumpToLatest}>
            {t.chartStrip.jumpToLatest}
          </button>

          <div className="scroll-arrows">
            <button
              className="scroll-btn"
              onClick={() => scrollRow('left')}
              aria-label="Scroll left"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="scroll-btn"
              onClick={() => scrollRow('right')}
              aria-label="Scroll right"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {showPhaseBar && <ChartPhaseTimeline cycle={cycle} totalSlots={totalSlots} t={t} />}

      <div className="chart-row-scroll" ref={scrollRef}>
        <div className="chart-row-strip paper-grid-strip">
          {slots.map(({ dayNum, obs, dateStr }) =>
            obs ? (
              <ChartFilledCell
                key={dayNum}
                obs={obs}
                isToday={dateStr === todayStr}
                onOpen={onOpenObservation}
              />
            ) : (
              <ChartEmptyCell
                key={`empty_${dayNum}`}
                dayNum={dayNum}
                dateStr={dateStr}
                isToday={dateStr === todayStr}
                onOpen={onOpenDay}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};
