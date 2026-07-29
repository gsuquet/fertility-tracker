import React from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { StampBadge } from './StampBadge';
import { Observation } from '../types/crms';
import { formatDayOfWeek, addDays } from '../utils/dateUtils';
import { Target } from 'lucide-react';

interface PrintExportViewProps {
  selectedCycleIds: string[];
}

export const PrintExportView: React.FC<PrintExportViewProps> = ({ selectedCycleIds }) => {
  const { cycles } = useCycle();
  const { t, language } = useLanguage();

  const displayCycles = cycles.length > 0 ? cycles : [{
    id: 'cycle_empty',
    startDate: new Date().toISOString().slice(0, 10),
    observations: [],
  }];

  // Filter cycles matching selectedCycleIds
  const filtered = (selectedCycleIds.includes('all') || selectedCycleIds.length === 0)
    ? displayCycles
    : displayCycles.filter(c => selectedCycleIds.includes(c.id));

  const finalCycles = filtered;

  if (finalCycles.length === 0) return null;

  // Sort selected cycles chronologically: oldest to newest
  const sortedCycles = [...finalCycles].sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <div className="print-export-container" id="printable-pdf-export">
      <div className="print-header">
        <div className="print-header-main">
          <h1>Creighton Model FertilityCare System Chart Report</h1>
          <p className="print-subtitle">Clinical Chart Export • Landscape 35-Day Grid View</p>
        </div>
        <div className="print-header-meta">
          <span>Export Date: {new Date().toLocaleDateString()}</span>
          <span>Cycles Included: {sortedCycles.length}</span>
        </div>
      </div>

      <div className="print-cycles-list">
        {sortedCycles.map(cycle => {
          // Find original 1-based cycle index in the full list (where Cycle 1 is oldest)
          const originalIndex = cycles.findIndex(c => c.id === cycle.id);
          const cycleNum = originalIndex !== -1 ? cycles.length - originalIndex : 1;
          const startDate = cycle.observations[0]?.date || cycle.startDate;
          const endDate = cycle.observations[cycle.observations.length - 1]?.date || startDate;
          const daysCount = cycle.observations.length;
          const peakObs = cycle.observations.find(o => o.isPeakDay);
          const peakDayNum = peakObs?.cycleDay;

          // Map observations by cycleDay
          const obsMap = new Map<number, Observation>();
          cycle.observations.forEach(o => obsMap.set(o.cycleDay, o));

          // Compute total grid slots (minimum 35, padded to multiple of 35)
          const maxObsDay = Math.max(...cycle.observations.map(o => o.cycleDay), 0);
          const totalGridSlots = Math.max(35, Math.ceil(maxObsDay / 35) * 35);

          const slots = Array.from({ length: totalGridSlots }, (_, i) => {
            const dayNum = i + 1;
            const obs = obsMap.get(dayNum);
            const computedDate = obs?.date || addDays(startDate, dayNum - 1);
            return { dayNum, obs, dateStr: computedDate };
          });

          // Split slots into 35-column row chunks
          const rowChunks: typeof slots[] = [];
          for (let i = 0; i < slots.length; i += 35) {
            rowChunks.push(slots.slice(i, i + 35));
          }

          return (
            <div key={cycle.id} className="print-cycle-card">
              {/* Cycle Card Header */}
              <div className="print-cycle-header">
                <div className="print-cycle-info">
                  <span className="print-cycle-badge">{t.chartStrip.cycleBadge} {cycleNum}</span>
                  <span className="print-cycle-dates">{startDate} → {endDate}</span>
                  <span className="print-cycle-length">({daysCount} {t.stats.days})</span>
                </div>
                {peakDayNum && (
                  <span className="print-peak-badge">
                    <Target size={12} /> {t.chartStrip.phasePeak}: Day {peakDayNum}
                  </span>
                )}
              </div>

              {/* 35-Day Grid Strip Rows */}
              <div className="print-grid-wrapper">
                {rowChunks.map((chunk, chunkIdx) => (
                  <div key={chunkIdx} className="print-grid-row">
                    {chunk.map(({ dayNum, obs, dateStr }) => {
                      const dayOfWeek = formatDayOfWeek(dateStr, language === 'fr' ? 'fr-FR' : 'en-US');
                      const isPeak = obs?.isPeakDay;

                      if (obs) {
                        return (
                          <div
                            key={obs.id || dayNum}
                            className={`print-cell filled-cell ${isPeak ? 'peak-cell' : ''} ${obs.stamp.toLowerCase()}`}
                          >
                            <div className="print-stamp-wrapper">
                              <StampBadge stamp={obs.stamp} isPeakDay={obs.isPeakDay} intercourse={obs.intercourse} size="sm" />
                            </div>

                            <div className="print-date">{obs.date.slice(5)}</div>

                            <div className="print-cell-header">
                              <span className="print-day-num">{obs.cycleDay}</span>
                              <span className="print-day-name">{dayOfWeek}</span>
                            </div>

                            <div className="print-code">
                              {obs.codeString || '---'}
                            </div>

                            {obs.symptoms && obs.symptoms.length > 0 && (
                              <div className="print-symptoms">
                                {obs.symptoms.join(',')}
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Empty day slot in 35-day grid
                      return (
                        <div key={`empty_${dayNum}`} className="print-cell empty-cell">
                          <div className="print-cell-placeholder" />
                          <div className="print-date">{dateStr.slice(5)}</div>
                          <div className="print-cell-header">
                            <span className="print-day-num">{dayNum}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Creighton Chart Stamp Legend Key */}
      <div className="print-legend">
        <div className="print-legend-title">Creighton Model Chart Stamp Key:</div>
        <div className="print-legend-items">
          <div className="print-legend-item">
            <span className="print-badge-sample stamp-red"></span>
            <span>{t.chartStrip.phaseMenses} (Bleeding)</span>
          </div>
          <div className="print-legend-item">
            <span className="print-badge-sample stamp-dark_green"></span>
            <span>Dry / Infertile</span>
          </div>
          <div className="print-legend-item">
            <span className="print-badge-sample stamp-white_baby">
              <svg className="baby-svg" viewBox="0 0 24 24" fill="currentColor" width="10" height="10">
                <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11c0 2.2-1.8 4-4 4s-4-1.8-4-4V9.5C4.8 8.8 4 7.5 4 6a4 4 0 0 1 4-4h4zm0 2a2 2 0 0 0-2 2v1h4V6a2 2 0 0 0-2-2zM8 17h8a1 1 0 0 1 1 1v1a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3v-1a1 1 0 0 1 1-1z" />
              </svg>
            </span>
            <span>{t.chartStrip.phaseFollicular} (Fertile Mucus)</span>
          </div>
          <div className="print-legend-item">
            <span className="print-badge-sample stamp-light_green_baby_1">
              <span className="num">1,2,3</span>
            </span>
            <span>{t.chartStrip.phasePostPeak} (Count 1, 2, 3)</span>
          </div>
          <div className="print-legend-item">
            <span className="print-badge-sample peak-legend">P</span>
            <span>{t.chartStrip.phasePeak} (Peak Day)</span>
          </div>
          <div className="print-legend-item">
            <span className="print-badge-sample intercourse-legend">I</span>
            <span>Intercourse (I)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
