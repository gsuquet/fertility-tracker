import type React from 'react';
import { PageTitle } from './shell/TopBar';
import { useState } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { formatMessage } from '../i18n';
import { StampBadge } from './StampBadge';
import { ChartDayDetail } from './chart/ChartDayDetail';
import { cardCodeTokens } from './chart/ChartCell';
import { useDaySwipe } from '../hooks/useDaySwipe';
import { DESKTOP_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { getTodayStr } from '../utils/dateUtils';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { showsEmptyStamp } from '../domain/stampCalculator';
import { getCycleDayOn } from '../domain/cycleBoundaryDetector';
import type { Cycle, Observation } from '../types/crms';

interface CalendarGridProps {
  /** Opens the Today page on the selected day */
  onOpenToday?: (() => void) | undefined;
  /** Opens the chart on the cycle of the selected day */
  onOpenChart?: (() => void) | undefined;
}

/** The first day of the month of a date */
const monthOf = (date: string) => {
  const [year, month] = date.split('-').map(Number) as [number, number];
  return new Date(year, month - 1, 1);
};

/** The Post-Peak count of a stamp: 1, 2 or 3, or none */
const countOf = (obs: Observation) => obs.stamp.match(/^LIGHT_GREEN_BABY_([123])$/)?.[1];

/** A new observation of a date with no observation */
const emptyDay = (date: string): Observation => ({
  id: '',
  date,
  cycleDay: 1,
  stamp: 'DARK_GREEN',
  codeString: '',
  intercourse: false,
  symptoms: [],
});

export const CalendarGrid: React.FC<CalendarGridProps> = ({ onOpenToday, onOpenChart }) => {
  const { observations, cycles, selectedCycleId, setSelectedObservation, setIsDrawerOpen } =
    useCycle();
  const { t } = useLanguage();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const todayStr = getTodayStr();

  // A past cycle opens on its first month. The current cycle and all cycles open on today.
  const selectedCycle = cycles.find(c => c.id === selectedCycleId);
  const monthForSelection = () =>
    selectedCycle && selectedCycle !== cycles[0] ? monthOf(selectedCycle.startDate) : new Date();
  const [currentMonth, setCurrentMonth] = useState(monthForSelection);
  // The calendar follows the cycle picker: a new selection opens the month of that cycle
  const [shownCycleId, setShownCycleId] = useState(selectedCycleId);
  if (shownCycleId !== selectedCycleId) {
    setShownCycleId(selectedCycleId);
    setCurrentMonth(monthForSelection());
  }
  // On a desktop, a click selects a day and the panel shows it. Today is selected first.
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const now = new Date();
  const isCurrentOrFutureMonth =
    year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth());

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = t.calendar.months;

  // The functions read the month of the state, so two fast swipes move two months
  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  // The next button is disabled from the current month onward. A swipe never goes past it.
  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      return next > new Date() ? prev : next;
    });
  };

  // A swipe calls the same functions as the arrow buttons. In the current month, the grid goes back.
  const {
    handlers: swipeHandlers,
    pageRef: swipePageRef,
    contentRef: swipeContentRef,
  } = useDaySwipe(
    direction => (direction === 'next' ? handleNextMonth() : handlePrevMonth()),
    direction => direction === 'prev' || !isCurrentOrFutureMonth
  );

  const obsMap = new Map(observations.map(o => [o.date, o]));
  // Cycles are ordered newest first, so cycle number N is at index length - N
  const cycleNumber = (cycle: Cycle) => cycles.length - cycles.indexOf(cycle);
  const cycleStarts = new Map(cycles.map(c => [c.startDate, cycleNumber(c)]));
  /** The cycle of a date: the newest cycle that starts on or before it. ISO dates sort as text. */
  const cycleOn = (date: string) => cycles.find(c => c.startDate <= date);
  const isInSelectedCycle = (date: string) =>
    !!selectedCycle && date <= todayStr && cycleOn(date) === selectedCycle;

  const daysGrid: (number | null)[] = [];
  // Pad blank start days (Monday = 0)
  const startPadding = (firstDayOfMonth + 6) % 7;
  for (let i = 0; i < startPadding; i++) {
    daysGrid.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    daysGrid.push(day);
  }

  const openDrawer = (date: string) => {
    setSelectedObservation(obsMap.get(date) ?? emptyDay(date));
    setIsDrawerOpen(true);
  };

  const detailCycle = cycleOn(selectedDate);
  const detail = (
    <ChartDayDetail
      variant="panel"
      day={{
        date: selectedDate,
        cycleNum: detailCycle && cycleNumber(detailCycle),
        dayNum: getCycleDayOn(cycles, selectedDate),
        obs: obsMap.get(selectedDate),
      }}
      t={t}
      onEdit={() => openDrawer(selectedDate)}
      onOpenInChart={
        onOpenChart &&
        (() => {
          setSelectedObservation(obsMap.get(selectedDate) ?? emptyDay(selectedDate));
          onOpenChart();
        })
      }
      onOpenInToday={() => {
        setSelectedObservation(obsMap.get(selectedDate) ?? emptyDay(selectedDate));
        onOpenToday?.();
      }}
    />
  );

  return (
    <div
      className="calendar-view"
      id="calendar-panel"
      role="tabpanel"
      aria-labelledby="tab-calendar"
      ref={swipePageRef}
      {...swipeHandlers}
    >
      <PageTitle title={t.tabs.calendar} phoneTitle={t.mobileTabs.calendar} />
      <div className="calendar-month">
        <div className="calendar-header">
          <button
            type="button"
            className="icon-button"
            onClick={handlePrevMonth}
            title={t.calendar.prevMonth}
            aria-label={t.calendar.prevMonth}
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="calendar-month-title">
            {monthNames[month]} {year}
          </h2>
          <button
            type="button"
            className="icon-button"
            onClick={handleNextMonth}
            disabled={isCurrentOrFutureMonth}
            title={isCurrentOrFutureMonth ? t.calendar.futureDisabled : t.calendar.nextMonth}
            aria-label={isCurrentOrFutureMonth ? t.calendar.futureDisabled : t.calendar.nextMonth}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="calendar-grid" ref={swipeContentRef}>
          {t.calendar.weekdays.map(d => (
            <div key={d.full} className="calendar-weekday-header">
              <span className="weekday-full">{d.full}</span>
              <span className="weekday-short">{d.short}</span>
            </div>
          ))}

          {daysGrid.map((dayNum, idx) => {
            if (dayNum === null) {
              return <div key={`empty_${idx}`} className="calendar-day empty" />;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const obs = obsMap.get(dateStr);
            const isFutureDay = dateStr > todayStr;
            const isToday = dateStr === todayStr;
            const startOf = cycleStarts.get(dateStr);
            const count = obs && countOf(obs);

            // The marks under the code, and the same facts in the accessible name
            const facts = [
              obs
                ? formatMessage(t.calendar.observationStatus, { code: obs.codeString })
                : t.calendar.noObservation,
              startOf !== undefined && formatMessage(t.calendar.cycleStart, { number: startOf }),
              obs?.isPeakDay && t.calendar.peakDay,
              count && formatMessage(t.calendar.countDay, { number: count }),
              obs?.intercourse && t.calendar.intercourse,
            ].filter(Boolean);

            const classes = [
              'calendar-day',
              obs && 'has-obs',
              isFutureDay && 'future-day',
              isToday && 'is-today',
              startOf !== undefined && 'is-cycle-start',
              isInSelectedCycle(dateStr) && 'in-cycle',
              isDesktop && dateStr === selectedDate && 'is-selected',
            ].filter(Boolean);

            return (
              <button
                key={dateStr}
                type="button"
                className={classes.join(' ')}
                aria-current={isToday ? 'date' : undefined}
                aria-pressed={isDesktop && !isFutureDay ? dateStr === selectedDate : undefined}
                disabled={isFutureDay}
                onClick={() => (isDesktop ? setSelectedDate(dateStr) : openDrawer(dateStr))}
                aria-label={formatMessage(t.calendar.dayLabel, {
                  date: dateStr,
                  status: facts.join(', '),
                })}
              >
                <span className="calendar-day-num">{dayNum}</span>
                {obs ? (
                  <span className="calendar-day-content">
                    <StampBadge
                      stamp={obs.stamp}
                      size="sm"
                      isEmpty={showsEmptyStamp(obs)}
                      showCount={false}
                    />
                    {/* The marks show I, so the code does not repeat it. The symptoms are in the drawer. */}
                    <span className="calendar-code">
                      {cardCodeTokens(obs.codeString).join(' ')}
                    </span>
                  </span>
                ) : (
                  !isFutureDay && (
                    <span className="calendar-add-slot" title={t.calendar.clickToAdd}>
                      <Plus size={14} className="add-icon" />
                    </span>
                  )
                )}
                <span className="calendar-marks" aria-hidden="true">
                  {obs?.intercourse && <span className="mark-intercourse">I</span>}
                  {obs?.isPeakDay && <span className="mark-peak">P</span>}
                  {count && <span className="mark-count">{count}</span>}
                  {startOf !== undefined && (
                    <span className="mark-cycle-start">
                      {formatMessage(t.calendar.cycleStartMark, { number: startOf })}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <p className="calendar-legend">
          {selectedCycle
            ? formatMessage(t.calendar.legendCycle, { number: cycleNumber(selectedCycle) })
            : t.calendar.legendAll}
        </p>
      </div>

      {isDesktop && detail}
    </div>
  );
};
