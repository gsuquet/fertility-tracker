import type React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { Observation } from '../../types/crms';
import { StampBadge } from '../StampBadge';
import { addDays, formatDateDisplay } from '../../utils/dateUtils';
import { showsEmptyStamp } from '../../domain/stampCalculator';

interface TodayHistoryListProps {
  selectedDate: string;
  observations: Observation[];
  onSelectDate: (dateStr: string) => void;
}

export const TodayHistoryList: React.FC<TodayHistoryListProps> = ({
  selectedDate,
  observations,
  onSelectDate,
}) => {
  const { t } = useLanguage();

  const getRecentDays = () => {
    const list: { dateStr: string; obs?: Observation | undefined }[] = [];
    for (let i = 4; i >= 0; i--) {
      const dateStr = addDays(selectedDate, -i);
      const obs = observations.find(o => o.date === dateStr);
      list.push({ dateStr, obs });
    }
    return list;
  };

  return (
    <div className="today-recent-card">
      <h3>{t.todayView.recentHistory}</h3>
      <div className="recent-days-list">
        {getRecentDays().map(({ dateStr, obs }) => {
          const isSelected = dateStr === selectedDate;
          const dayLabel = formatDateDisplay(dateStr, t.locale, {
            weekday: 'short',
            month: 'numeric',
            day: 'numeric',
          });

          return (
            <button
              key={dateStr}
              type="button"
              className={`recent-day-item ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectDate(dateStr)}
            >
              <span className="recent-date-label">{dayLabel}</span>
              <div className="recent-stamp-slot">
                {obs ? (
                  <StampBadge
                    stamp={obs.stamp}
                    isPeakDay={obs.isPeakDay || obs.isManualPeak}
                    intercourse={obs.intercourse}
                    size="sm"
                    isEmpty={showsEmptyStamp(obs)}
                  />
                ) : (
                  <StampBadge stamp="DARK_GREEN" size="sm" isEmpty />
                )}
              </div>
              <span className={obs ? 'recent-code' : 'recent-empty'}>
                {obs ? obs.codeString : t.todayView.noEntryShort}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
