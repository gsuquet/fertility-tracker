import type React from 'react';
import { useState } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { formatMessage } from '../i18n';
import { StampBadge } from './StampBadge';
import { getTodayStr } from '../utils/dateUtils';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export const CalendarGrid: React.FC = () => {
  const { observations, setSelectedObservation, setIsDrawerOpen } = useCycle();
  const { t } = useLanguage();

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const now = new Date();
  const isCurrentOrFutureMonth =
    year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth());

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = t.calendar.months;

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  // The next button is disabled from the current month onward
  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const obsMap = new Map(observations.map(o => [o.date, o]));

  const daysGrid: (number | null)[] = [];
  // Pad blank start days (Monday = 0)
  const startPadding = (firstDayOfMonth + 6) % 7;
  for (let i = 0; i < startPadding; i++) {
    daysGrid.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    daysGrid.push(day);
  }

  const todayStr = getTodayStr();

  return (
    <div
      className="calendar-view"
      id="calendar-panel"
      role="tabpanel"
      aria-labelledby="tab-calendar"
    >
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
          className={`icon-button ${isCurrentOrFutureMonth ? 'disabled' : ''}`}
          onClick={handleNextMonth}
          disabled={isCurrentOrFutureMonth}
          title={isCurrentOrFutureMonth ? t.calendar.futureDisabled : t.calendar.nextMonth}
          aria-label={isCurrentOrFutureMonth ? t.calendar.futureDisabled : t.calendar.nextMonth}
          style={{
            opacity: isCurrentOrFutureMonth ? 0.4 : 1,
            cursor: isCurrentOrFutureMonth ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="calendar-grid">
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

          // Check if future day
          const dayDate = new Date(year, month, dayNum);
          const isFutureDay = dayDate > now;
          const isToday = dateStr === todayStr;

          return (
            <button
              key={dateStr}
              type="button"
              className={`calendar-day ${obs ? 'has-obs' : ''} ${isFutureDay ? 'future-day' : ''} ${isToday ? 'is-today' : ''}`}
              aria-current={isToday ? 'date' : undefined}
              disabled={isFutureDay}
              onClick={() => {
                // Future days are disabled, so a click is always on a past day or today
                setSelectedObservation(
                  obs || {
                    id: '',
                    date: dateStr,
                    cycleDay: 1,
                    stamp: 'DARK_GREEN',
                    codeString: '',
                    intercourse: false,
                    symptoms: [],
                  }
                );
                setIsDrawerOpen(true);
              }}
              aria-label={formatMessage(t.calendar.dayLabel, {
                date: dateStr,
                status: obs
                  ? formatMessage(t.calendar.observationStatus, { code: obs.codeString })
                  : t.calendar.noObservation,
              })}
            >
              <div className="calendar-day-num">{dayNum}</div>
              {obs ? (
                <div className="calendar-day-content">
                  <div className="calendar-stamp-wrapper">
                    <StampBadge
                      stamp={obs.stamp}
                      isPeakDay={obs.isPeakDay}
                      intercourse={obs.intercourse}
                      size="sm"
                    />
                  </div>
                  <span className="calendar-code">{obs.codeString}</span>
                </div>
              ) : !isFutureDay ? (
                <div className="calendar-add-slot">
                  <div className="calendar-add-pill" title={t.calendar.clickToAdd}>
                    <Plus size={12} className="add-icon" />
                    <span className="add-text">{t.calendar.add}</span>
                  </div>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};
