import type React from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import type { Cycle, Observation } from '../types/crms';
import { getDaysDifference, getTodayStr } from '../utils/dateUtils';
import { ChartToolbar } from './chart/ChartToolbar';
import type { ChartViewMode } from './chart/ChartToolbar';
import { ChartLegend } from './chart/ChartLegend';
import { ChartBlankGrid } from './chart/ChartBlankGrid';
import { ChartCycleRow } from './chart/ChartCycleRow';

/** The slots of each row: every day up to a whole week, and 35 at least */
const slotCount = (cycles: Cycle[]) => {
  const maxDay = Math.max(0, ...cycles.flatMap(c => c.observations.map(o => o.cycleDay)));
  return Math.max(35, Math.ceil(maxDay / 7) * 7);
};

/** The scroll position that puts a cell in the middle of its strip */
const centerLeft = (strip: HTMLElement, cell: Element) => {
  const box = cell.getBoundingClientRect();
  const offset = box.left - strip.getBoundingClientRect().left + strip.scrollLeft;
  return offset - (strip.clientWidth - box.width) / 2;
};

export const ChartRow: React.FC = () => {
  const { cycles, selectedCycleId, setSelectedObservation, setIsDrawerOpen } = useCycle();
  const { t } = useLanguage();

  // View preferences
  const [viewMode, setViewMode] = useState<ChartViewMode>('35-day');
  const [showPhaseBar, setShowPhaseBar] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const toggleLegend = () => setShowLegend(!showLegend);

  const viewRef = useRef<HTMLDivElement>(null);
  // The position that the sync gave to each strip. The scroll event of that move is not a new
  // move, so it does not move the other strips back.
  const synced = useRef(new WeakMap<HTMLElement, number>());

  const strips = () => [
    ...(viewRef.current?.querySelectorAll<HTMLDivElement>('.chart-row-scroll') ?? []),
  ];
  const setLeft = (strip: HTMLElement, left: number) => {
    const before = strip.scrollLeft;
    strip.scrollLeft = left;
    if (strip.scrollLeft !== before) synced.current.set(strip, strip.scrollLeft);
  };

  // All the rows share one scroll position, so the same cycle day is in the same column
  const syncScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const source = e.currentTarget;
    const left = source.scrollLeft;
    const expected = synced.current.get(source);
    synced.current.delete(source);
    if (expected !== undefined && Math.abs(expected - left) < 1) return;
    for (const strip of strips()) {
      if (strip !== source && Math.abs(strip.scrollLeft - left) >= 1) setLeft(strip, left);
    }
  };

  const todayStr = getTodayStr();
  const filteredCycles =
    selectedCycleId === 'all' ? cycles : cycles.filter(c => c.id === selectedCycleId);
  const totalSlots = slotCount(filteredCycles);
  // Today belongs to the last cycle that starts on or before it. ISO dates sort as text.
  const todayCycle = cycles
    .filter(c => c.startDate <= todayStr)
    .reduce<Cycle | undefined>(
      (last, c) => (last && last.startDate > c.startDate ? last : c),
      undefined
    );
  const todayShown =
    !!todayCycle &&
    filteredCycles.includes(todayCycle) &&
    getDaysDifference(todayCycle.startDate, todayStr) < totalSlots;
  const peakCycleId = filteredCycles.find(c => c.observations.some(o => o.isPeakDay))?.id;

  // The chart opens with today in the middle of the rows, or at the end of the rows when the
  // current cycle has no cell for today. A past cycle opens at day 1. scrollLeft moves at once,
  // with no smooth scroll, and moves only the strips, so the page does not move.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the rows scroll again only when the view or the cycle changes
  useLayoutEffect(() => {
    const all = strips();
    const today = viewRef.current?.querySelector('.chart-row-scroll .is-today');
    let left = 0;
    if (today) left = centerLeft(today.closest('.chart-row-scroll') as HTMLElement, today);
    else if (todayCycle && filteredCycles.includes(todayCycle)) {
      left = (all[0] as HTMLElement).scrollWidth;
    }
    for (const strip of all) setLeft(strip, left);
  }, [viewMode, selectedCycleId, cycles.length]);

  // The jumps scroll the strip that holds the target, and the sync moves the other strips. A jump
  // button shows only when its cell exists.
  const scrollToCell = (selector: string) => {
    const cell = (viewRef.current as HTMLElement).querySelector(
      `.chart-row-scroll ${selector}`
    ) as Element;
    const strip = cell.closest('.chart-row-scroll') as HTMLElement;
    strip.scrollTo({ left: centerLeft(strip, cell), behavior: 'smooth' });
  };
  // The controls render with the first row, so its strip exists
  const scrollFirst = (options: ScrollToOptions, by = false) => {
    const strip = strips()[0] as HTMLElement;
    if (by) strip.scrollBy(options);
    else strip.scrollTo(options);
  };

  const openObservation = (obs: Observation) => {
    setSelectedObservation(obs);
    setIsDrawerOpen(true);
  };

  // Opens a draft observation for an empty day slot
  const openEmptyDay = (date: string, dayNum: number) => {
    openObservation({
      id: '',
      date,
      cycleDay: dayNum,
      stamp: 'DARK_GREEN',
      codeString: '0AD',
      intercourse: false,
      symptoms: [],
    });
  };

  const legend = (
    <>
      {showLegend && <ChartLegend t={t} />}
      <div className="chart-footer-actions">
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={showLegend}
          onClick={toggleLegend}
        >
          {showLegend ? t.chartStrip.hideLegend : t.chartStrip.showLegend}
        </button>
      </div>
    </>
  );

  if (cycles.length === 0) {
    return (
      <div
        className="chart-strip-view"
        id="chart-panel"
        role="tabpanel"
        aria-labelledby="tab-chart"
      >
        <ChartToolbar t={t} showLegend={showLegend} onToggleLegend={toggleLegend} />
        <ChartBlankGrid t={t} onOpenDay={openEmptyDay} />
        {legend}
      </div>
    );
  }

  const controls = (
    <div className="cycle-controls">
      <button
        type="button"
        className="chart-jump-btn"
        onClick={() => scrollFirst({ left: 0, behavior: 'smooth' })}
        aria-label={t.chartStrip.jumpToStart}
        title={t.chartStrip.jumpToStart}
      >
        1
      </button>
      {peakCycleId && (
        <button
          type="button"
          className="chart-jump-btn peak-btn"
          onClick={() => scrollToCell('.peak-cell')}
          aria-label={t.chartStrip.jumpToPeak}
          title={t.chartStrip.jumpToPeak}
        >
          P
        </button>
      )}
      {todayShown && (
        <button
          type="button"
          className="chart-jump-btn"
          onClick={() => scrollToCell('.is-today')}
          title={t.chartStrip.jumpToToday}
        >
          <CalendarDays size={16} aria-hidden="true" />
          <span className="sr-only">{t.chartStrip.jumpToToday}</span>
        </button>
      )}
      <span className="chart-toolbar-spacer" />
      <button
        type="button"
        className="chart-jump-btn"
        onClick={() => scrollFirst({ left: -320, behavior: 'smooth' }, true)}
        aria-label={t.chartStrip.scrollLeft}
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        className="chart-jump-btn"
        onClick={() => scrollFirst({ left: 320, behavior: 'smooth' }, true)}
        aria-label={t.chartStrip.scrollRight}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );

  return (
    <div
      className="chart-strip-view"
      id="chart-panel"
      role="tabpanel"
      aria-labelledby="tab-chart"
      ref={viewRef}
    >
      <ChartToolbar
        t={t}
        showLegend={showLegend}
        onToggleLegend={toggleLegend}
        controls={{
          viewMode,
          onViewModeChange: setViewMode,
          showPhaseBar,
          onTogglePhaseBar: () => setShowPhaseBar(!showPhaseBar),
        }}
      />

      {filteredCycles.map((cycle, index) => (
        <ChartCycleRow
          key={cycle.id}
          cycle={cycle}
          cycleNum={cycles.length - cycles.indexOf(cycle)}
          totalSlots={totalSlots}
          viewMode={viewMode}
          showPhaseBar={showPhaseBar}
          todayStr={cycle === todayCycle ? todayStr : undefined}
          controls={index === 0 ? controls : undefined}
          onStripScroll={syncScroll}
          t={t}
          onOpenObservation={openObservation}
          onOpenDay={openEmptyDay}
        />
      ))}

      {legend}
    </div>
  );
};
