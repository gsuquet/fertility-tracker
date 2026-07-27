import React, { useState } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { StampBadge } from './StampBadge';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export const CalendarGrid: React.FC = () => {
  const { observations, setSelectedObservation, setIsDrawerOpen } = useCycle();
  const { t } = useLanguage();

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const now = new Date();
  const isCurrentOrFutureMonth = (
    year > now.getFullYear() ||
    (year === now.getFullYear() && month >= now.getMonth())
  );

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    if (!isCurrentOrFutureMonth) {
      setCurrentMonth(new Date(year, month + 1, 1));
    }
  };

  const obsMap = new Map(observations.map(o => [o.date, o]));

  const daysGrid: (number | null)[] = [];
  // Pad blank start days (Sunday = 0)
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysGrid.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    daysGrid.push(day);
  }

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button className="icon-button" onClick={handlePrevMonth} title="Previous month">
          <ChevronLeft size={20} />
        </button>
        <h2 className="calendar-month-title">
          {monthNames[month]} {year}
        </h2>
        <button
          className={`icon-button ${isCurrentOrFutureMonth ? 'disabled' : ''}`}
          onClick={handleNextMonth}
          disabled={isCurrentOrFutureMonth}
          title={isCurrentOrFutureMonth ? "Future months disabled" : "Next month"}
          style={{ opacity: isCurrentOrFutureMonth ? 0.4 : 1, cursor: isCurrentOrFutureMonth ? 'not-allowed' : 'pointer' }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="calendar-weekday-header">
            {d}
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

          return (
            <div
              key={dateStr}
              className={`calendar-day ${obs ? 'has-obs' : ''} ${isFutureDay ? 'future-day' : ''}`}
              onClick={() => {
                if (!isFutureDay) {
                  setSelectedObservation(obs || null);
                  setIsDrawerOpen(true);
                }
              }}
              style={{ opacity: isFutureDay ? 0.4 : 1, cursor: isFutureDay ? 'not-allowed' : 'pointer' }}
            >
              <div className="calendar-day-num">{dayNum}</div>
              {obs ? (
                <div className="calendar-day-content">
                  <StampBadge stamp={obs.stamp} isPeakDay={obs.isPeakDay} intercourse={obs.intercourse} size="sm" />
                  <span className="calendar-code">{obs.codeString}</span>
                </div>
              ) : !isFutureDay ? (
                <div className="calendar-add-icon">
                  <Plus size={14} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
