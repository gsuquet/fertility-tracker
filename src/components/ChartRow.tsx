import React from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { Observation } from '../types/crms';
import { StampBadge } from './StampBadge';
import { Plus } from 'lucide-react';

export const ChartRow: React.FC = () => {
  const { observations, setSelectedObservation, setIsDrawerOpen } = useCycle();
  const { t } = useLanguage();

  const handleCellClick = (obs?: Observation) => {
    setSelectedObservation(obs || null);
    setIsDrawerOpen(true);
  };

  // Organize observations into 35-day paper chart rows
  const rowLength = 35;
  const totalDays = Math.max(observations.length, 35);
  const rowsCount = Math.ceil(totalDays / rowLength);

  const renderCell = (dayIndex: number) => {
    const obs = observations[dayIndex];
    const cycleDay = dayIndex + 1;

    if (!obs) {
      return (
        <div key={dayIndex} className="chart-cell empty-cell" onClick={() => handleCellClick()}>
          <div className="cell-day-num">{cycleDay}</div>
          <div className="cell-placeholder">
            <Plus size={16} className="add-icon" />
          </div>
        </div>
      );
    }

    return (
      <div
        key={obs.id || dayIndex}
        className={`chart-cell filled-cell ${obs.isPeakDay ? 'peak-cell' : ''}`}
        onClick={() => handleCellClick(obs)}
      >
        <div className="cell-header">
          <span className="cell-day-num">CD {obs.cycleDay}</span>
          <span className="cell-date">{obs.date.slice(5)}</span>
        </div>

        <div className="cell-stamp-wrapper">
          <StampBadge stamp={obs.stamp} isPeakDay={obs.isPeakDay} intercourse={obs.intercourse} size="md" />
        </div>

        <div className="cell-code">{obs.codeString || '---'}</div>

        {obs.symptoms && obs.symptoms.length > 0 && (
          <div className="cell-symptoms">
            {obs.symptoms.join(', ')}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="chart-strip-view">
      {Array.from({ length: rowsCount }).map((_, rowIndex) => (
        <div key={rowIndex} className="chart-row-container">
          <div className="chart-row-header">
            Row {rowIndex + 1} (Days {rowIndex * rowLength + 1} - {(rowIndex + 1) * rowLength})
          </div>
          <div className="chart-row-scroll">
            <div className="chart-row-strip">
              {Array.from({ length: rowLength }).map((_, colIndex) => {
                const dayIndex = rowIndex * rowLength + colIndex;
                return renderCell(dayIndex);
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
