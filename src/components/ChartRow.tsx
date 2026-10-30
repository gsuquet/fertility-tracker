import type React from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import type { Cycle, Observation } from '../types/crms';
import { getDaysDifference, getTodayStr } from '../utils/dateUtils';
import { DESKTOP_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { ChartToolbar } from './chart/ChartToolbar';
import type { ChartViewMode } from './chart/ChartToolbar';
import { ChartLegend } from './chart/ChartLegend';
import { ChartBlankGrid } from './chart/ChartBlankGrid';
import { ChartCycleRow } from './chart/ChartCycleRow';
import { ChartDayDetail } from './chart/ChartDayDetail';
import { PageTitle } from './shell/TopBar';

/** With more than this number of cycles, the past cycles of a desktop chart show their stamps only */
const MANY_CYCLES = 4;

/** The cycle of a date: the last cycle that starts on or before it. ISO dates sort as text. */
const cycleOf = (cycles: Cycle[], date: string) =>
  cycles
    .filter(c => c.startDate <= date)
    .reduce<Cycle | undefined>(
      (last, c) => (last && last.startDate > c.startDate ? last : c),
      undefined
    );

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

interface ChartRowProps {
  /** Opens the Today page. Today shows the date of the selected observation. */
  onOpenToday?: () => void;
  /** Opens Share chart: the print of the chart */
  onShare?: (() => void) | undefined;
}

export const ChartRow: React.FC<ChartRowProps> = ({ onOpenToday, onShare }) => {
  const { cycles, selectedCycleId, setSelectedObservation, setIsDrawerOpen } = useCycle();
  const { t } = useLanguage();
  // On a desktop, a click selects a day for the detail bar. On a phone, it opens the sheet.
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  // The date of the selected day. The cards of all the rows with this date show the selection.
  const [selection, setSelection] = useState<string | null>(null);
  // The past cycles that show all their days although the chart has many cycles
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

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
  const todayCycle = cycleOf(cycles, todayStr);
  const todayShown =
    !!todayCycle &&
    filteredCycles.includes(todayCycle) &&
    getDaysDifference(todayCycle.startDate, todayStr) < totalSlots;
  // A date has a card when it is in the slots of a row that shows
  const hasCard = (date: string) =>
    filteredCycles.some(c => {
      const index = getDaysDifference(c.startDate, date);
      return index >= 0 && index < totalSlots;
    });
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
  }, [viewMode, selectedCycleId, cycles.length, isDesktop]);

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

  // A draft observation for an empty day slot
  const draftDay = (date: string, dayNum: number): Observation => ({
    id: '',
    date,
    cycleDay: dayNum,
    stamp: 'DARK_GREEN',
    codeString: '0AD',
    intercourse: false,
    symptoms: [],
  });
  const openEmptyDay = (date: string, dayNum: number) => openObservation(draftDay(date, dayNum));

  // The selected day, else today. A selection with no card in the rows that show does not count.
  const shown = selection && hasCard(selection) ? selection : todayShown ? todayStr : null;
  // The saved observation of the date, in any cycle. A card after the end of a cycle can show a
  // date of the next cycle.
  const detailObs = shown
    ? cycles.flatMap(c => c.observations).find(o => o.date === shown)
    : undefined;
  // The cycle of the day: the cycle of its observation, else the cycle that holds the date
  const detailCycle = shown
    ? ((detailObs
        ? cycles.find(c => c.observations.includes(detailObs))
        : cycleOf(cycles, shown)) as Cycle)
    : undefined;
  // The saved observation of the day, else a draft for the sheet and for Today
  const detailDay = shown
    ? (detailObs ?? draftDay(shown, getDaysDifference((detailCycle as Cycle).startDate, shown) + 1))
    : undefined;
  // On a desktop, a click selects the day. A click or Enter on the selected day opens the sheet.
  // An arrow key only moves the selection: it does not open the day that it lands on
  const moving = useRef(false);
  const selectDay = (date: string) => {
    if (date === shown && detailDay && !moving.current) openObservation(detailDay);
    else setSelection(date);
  };

  // On a desktop, the arrow keys move the selection: left and right in the row, up and down to
  // the same cycle day of the next row. The focus moves with it, so the card scrolls into view.
  const moveSelection = (e: React.KeyboardEvent) => {
    const card = (e.target as HTMLElement).closest('.chart-row-scroll .chart-cell');
    const step = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[
      e.key
    ];
    if (!isDesktop || !card || !step || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const rows = strips().map(strip => [...strip.querySelectorAll<HTMLElement>('.chart-cell')]);
    const row = rows.findIndex(cards => cards.includes(card as HTMLElement));
    const col = (rows[row] as HTMLElement[]).indexOf(card as HTMLElement);
    const [dRow, dCol] = step as [number, number];
    const next = rows[row + dRow]?.[col + dCol];
    if (!next) return;
    e.preventDefault();
    next.focus();
    moving.current = true;
    next.click();
    moving.current = false;
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
        <PageTitle title={t.tabs.chart} />
        <ChartToolbar
          t={t}
          showLegend={showLegend}
          onToggleLegend={toggleLegend}
          onShare={onShare}
        />
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
      onKeyDown={moveSelection}
    >
      <PageTitle title={t.tabs.chart} />
      <ChartToolbar
        t={t}
        showLegend={showLegend}
        onToggleLegend={toggleLegend}
        onShare={onShare}
        controls={{
          viewMode,
          onViewModeChange: setViewMode,
          showPhaseBar,
          onTogglePhaseBar: () => setShowPhaseBar(!showPhaseBar),
        }}
      />

      {filteredCycles.map((cycle, index) => {
        // On a desktop with many cycles, each past cycle shows only its stamps until it opens
        const collapsible = isDesktop && filteredCycles.length > MANY_CYCLES && index > 0;
        const toggle = () => {
          const next = new Set(expanded);
          if (!next.delete(cycle.id)) next.add(cycle.id);
          setExpanded(next);
        };
        return (
          <ChartCycleRow
            key={cycle.id}
            cycle={cycle}
            cycleNum={cycles.length - cycles.indexOf(cycle)}
            totalSlots={totalSlots}
            viewMode={viewMode}
            showPhaseBar={showPhaseBar}
            todayStr={cycle === todayCycle ? todayStr : undefined}
            controls={index === 0 ? controls : undefined}
            selectedDate={isDesktop ? shown : undefined}
            collapsed={collapsible && !expanded.has(cycle.id)}
            onToggleCollapsed={collapsible ? toggle : undefined}
            onStripScroll={syncScroll}
            t={t}
            onOpenObservation={isDesktop ? obs => selectDay(obs.date) : openObservation}
            onOpenDay={isDesktop ? date => selectDay(date) : openEmptyDay}
          />
        );
      })}

      {/* The bar stays in the page with no day, so that its live region reads the first selection */}
      {isDesktop && (
        <ChartDayDetail
          day={
            detailDay && {
              date: detailDay.date,
              cycleNum: cycles.length - cycles.indexOf(detailCycle as Cycle),
              dayNum: detailDay.cycleDay,
              obs: detailObs,
            }
          }
          t={t}
          onEdit={() => openObservation(detailDay as Observation)}
          onOpenInToday={() => {
            setSelectedObservation(detailDay as Observation);
            onOpenToday?.();
          }}
        />
      )}

      {legend}
    </div>
  );
};
