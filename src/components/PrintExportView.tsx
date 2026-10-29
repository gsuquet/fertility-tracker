import type React from 'react';
import { hasObservationCode } from '../domain/stampCalculator';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { StampBadge } from './StampBadge';
import type { Observation } from '../types/crms';
import { addDays, getTodayStr } from '../utils/dateUtils';
import { formatMessage } from '../i18n';
import { Target } from 'lucide-react';
import { BabyIcon } from './icons/BabyIcon';

interface PrintExportViewProps {
  selectedCycleIds: string[];
}

export const PrintExportView: React.FC<PrintExportViewProps> = ({ selectedCycleIds }) => {
  const { cycles } = useCycle();
  const { t } = useLanguage();
  /** The month and day of a YYYY-MM-DD date, in the order of the language */
  const monthDay = (date: string) =>
    formatMessage(t.common.monthDay, { month: date.slice(5, 7), day: date.slice(8, 10) });

  const displayCycles =
    cycles.length > 0
      ? cycles
      : [
          {
            id: 'cycle_empty',
            startDate: getTodayStr(),
            observations: [],
          },
        ];

  // Filter cycles matching selectedCycleIds
  const filtered =
    selectedCycleIds.includes('all') || selectedCycleIds.length === 0
      ? displayCycles
      : displayCycles.filter(c => selectedCycleIds.includes(c.id));

  if (filtered.length === 0) return null;

  // Sort selected cycles chronologically: oldest to newest
  const sortedCycles = [...filtered].sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <div className="print-export-container" id="printable-pdf-export">
      <div className="print-header">
        <div className="print-header-main">
          <h1>{t.printExport.title}</h1>
          <p className="print-subtitle">{t.printExport.subtitle}</p>
        </div>
        <div className="print-header-meta">
          <span>
            {formatMessage(t.printExport.exportDate, {
              date: new Date().toLocaleDateString(t.locale),
            })}
          </span>
          <span>{formatMessage(t.printExport.cyclesIncluded, { count: sortedCycles.length })}</span>
        </div>
      </div>

      <div className="print-cycles-list">
        {sortedCycles.map(cycle => {
          // Cycles are listed newest first, so Cycle 1 is the oldest
          const cycleNum = displayCycles.length - displayCycles.indexOf(cycle);
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
          const rowChunks: (typeof slots)[] = [];
          for (let i = 0; i < slots.length; i += 35) {
            rowChunks.push(slots.slice(i, i + 35));
          }

          return (
            <div key={cycle.id} className="print-cycle-card">
              {/* Cycle Card Header */}
              <div className="print-cycle-header">
                <div className="print-cycle-info">
                  <span className="print-cycle-badge">
                    {t.chartStrip.cycleBadge} {cycleNum}
                  </span>
                  <span className="print-cycle-dates">
                    {startDate} → {endDate}
                  </span>
                  <span className="print-cycle-length">
                    ({daysCount} {t.stats.days})
                  </span>
                </div>
                {peakDayNum && (
                  <span className="print-peak-badge">
                    <Target size={12} />{' '}
                    {formatMessage(t.chartStrip.peakOnDay, {
                      peak: t.chartStrip.phasePeak,
                      day: peakDayNum,
                    })}
                  </span>
                )}
              </div>

              {/* 35-Day Grid Strip Rows */}
              <div className="print-grid-wrapper">
                {rowChunks.map((chunk, chunkIdx) => (
                  <div key={chunkIdx} className="print-grid-row">
                    {chunk.map(({ dayNum, obs, dateStr }) => {
                      const isPeak = obs?.isPeakDay;

                      if (obs) {
                        return (
                          <div
                            key={dayNum}
                            className={`print-cell filled-cell ${isPeak ? 'peak-cell' : ''} ${obs.stamp.toLowerCase()}`}
                          >
                            <div className="print-stamp-wrapper">
                              <StampBadge
                                stamp={obs.stamp}
                                isPeakDay={obs.isPeakDay}
                                intercourse={obs.intercourse}
                                size="sm"
                                isEmpty={!hasObservationCode(obs)}
                              />
                            </div>

                            <div className="print-date">{monthDay(obs.date)}</div>

                            <div className="print-cell-header">
                              <span className="print-day-num">{obs.cycleDay}</span>
                            </div>

                            {(() => {
                              const cleanCode = obs.codeString
                                .replace(/\b(AP|RAP|LAP)\b/g, '')
                                .replace(/\s+/g, '');
                              return <div className="print-code">{cleanCode || '---'}</div>;
                            })()}

                            {obs.symptoms && obs.symptoms.length > 0 && (
                              <div className="print-symptoms">{obs.symptoms.join(',')}</div>
                            )}

                            <div className="print-notes" title={obs.notes}>
                              {obs.notes}
                            </div>
                          </div>
                        );
                      }

                      // Empty day slot in 35-day grid
                      return (
                        <div key={`empty_${dayNum}`} className="print-cell empty-cell">
                          <div className="print-cell-placeholder" />
                          <div className="print-date">{monthDay(dateStr)}</div>
                          <div className="print-cell-header">
                            <span className="print-day-num">{dayNum}</span>
                          </div>
                          <div className="print-notes" />
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
        <div className="print-legend-title">{t.chartStrip.legendTitle}</div>
        <div className="print-legend-items">
          <div className="print-legend-item">
            <span className="print-badge-sample stamp-red"></span>
            <span>{t.chartStrip.legendMenses}</span>
          </div>
          <div className="print-legend-item">
            <span className="print-badge-sample stamp-dark_green"></span>
            <span>{t.chartStrip.legendDry}</span>
          </div>
          <div className="print-legend-item">
            <span className="print-badge-sample stamp-white_baby">
              <BabyIcon />
            </span>
            <span>{t.chartStrip.legendFertile}</span>
          </div>
          <div className="print-legend-item">
            <span className="print-badge-sample stamp-light_green_baby_1">
              <span className="num">1,2,3</span>
            </span>
            <span>{t.chartStrip.legendPostPeak}</span>
          </div>
          <div className="print-legend-item">
            <span className="print-badge-sample peak-legend">P</span>
            <span>{t.chartStrip.legendPeakDay}</span>
          </div>
          <div className="print-legend-item">
            <span className="print-badge-sample intercourse-legend">I</span>
            <span>{t.labels.intercourse}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
