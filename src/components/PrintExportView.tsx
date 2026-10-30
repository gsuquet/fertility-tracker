import type React from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { StampBadge } from './StampBadge';
import { getTodayStr } from '../utils/dateUtils';
import {
  cycleLength,
  printCode,
  printRows,
  printStartDate,
  selectPrintCycles,
} from '../utils/printCycles';
import { formatMessage } from '../i18n';
import { Target } from 'lucide-react';
import { BabyIcon } from './icons/BabyIcon';
import { showsEmptyStamp } from '../domain/stampCalculator';

interface PrintExportViewProps {
  selectedCycleIds: string[];
}

export const PrintExportView: React.FC<PrintExportViewProps> = ({ selectedCycleIds }) => {
  const { cycles } = useCycle();
  const { t } = useLanguage();
  /** The month and day of a YYYY-MM-DD date, in the order of the language */
  const monthDay = (date: string) =>
    formatMessage(t.common.monthDay, { month: date.slice(5, 7), day: date.slice(8, 10) });

  const sortedCycles = selectPrintCycles(cycles, selectedCycleIds, getTodayStr());
  if (sortedCycles.length === 0) return null;

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
        {sortedCycles.map(({ cycle, number: cycleNum }) => {
          const startDate = printStartDate(cycle);
          const endDate = cycle.observations[cycle.observations.length - 1]?.date || startDate;
          const daysCount = cycleLength(cycle);
          const peakDayNum = cycle.observations.find(o => o.isPeakDay)?.cycleDay;
          const rowChunks = printRows(cycle);

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
                    {chunk.map(({ dayNum, obs, date: dateStr }) => {
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
                                isEmpty={showsEmptyStamp(obs)}
                              />
                            </div>

                            <div className="print-date">{monthDay(obs.date)}</div>

                            <div className="print-cell-header">
                              <span className="print-day-num">{obs.cycleDay}</span>
                            </div>

                            <div className="print-code">{printCode(obs.codeString) || '---'}</div>

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
