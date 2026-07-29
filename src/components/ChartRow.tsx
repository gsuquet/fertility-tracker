import React, { useState, useRef } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { Observation } from '../types/crms';
import { StampBadge } from './StampBadge';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Target, 
  Info, 
  Layers, 
  Grid, 
  List, 
  Calendar as CalendarIcon,
  MessageSquare,
  Sparkles
} from 'lucide-react';

export const ChartRow: React.FC = () => {
  const { cycles, selectedCycleId, setSelectedObservation, setIsDrawerOpen, saveObservation } = useCycle();
  const { t, language } = useLanguage();

  // View preferences
  const [viewMode, setViewMode] = useState<'35-day' | 'compact'>('35-day');
  const [showPhaseBar, setShowPhaseBar] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [hoveredCellKey, setHoveredCellKey] = useState<string | null>(null);

  // Refs for scrolling rows
  const scrollRefs = useRef<{ [cycleId: string]: HTMLDivElement | null }>({});

  const handleCellClick = (obs?: Observation, targetDate?: string, dayNum?: number) => {
    if (obs) {
      setSelectedObservation(obs);
      setIsDrawerOpen(true);
    } else if (targetDate) {
      // Create new observation draft for clicked empty day slot
      setSelectedObservation({
        id: '',
        date: targetDate,
        cycleDay: dayNum || 1,
        stamp: 'DARK_GREEN',
        codeString: '0 AD',
        intercourse: false,
        symptoms: [],
      });
      setIsDrawerOpen(true);
    } else {
      setSelectedObservation(null);
      setIsDrawerOpen(true);
    }
  };

  const scrollRow = (cycleId: string, direction: 'left' | 'right') => {
    const el = scrollRefs.current[cycleId];
    if (el) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const jumpToPeak = (cycleId: string) => {
    const el = scrollRefs.current[cycleId];
    if (el) {
      const peakEl = el.querySelector(`.peak-cell`);
      if (peakEl) {
        peakEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  };

  const jumpToStart = (cycleId: string) => {
    const el = scrollRefs.current[cycleId];
    if (el) {
      el.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const jumpToEnd = (cycleId: string) => {
    const el = scrollRefs.current[cycleId];
    if (el) {
      el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    }
  };

  const filteredCycles = selectedCycleId === 'all'
    ? cycles
    : cycles.filter(c => c.id === selectedCycleId);

  // Helper to format day of week (e.g. Mon, Tue / Lun, Mar)
  const formatDayOfWeek = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short' });
    } catch (e) {
      return '';
    }
  };

  // Helper to compute date for day offset from start date
  const getDateForDay = (startDateStr: string, dayNum: number) => {
    try {
      const d = new Date(startDateStr + 'T00:00:00');
      d.setDate(d.getDate() + (dayNum - 1));
      return d.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

  if (cycles.length === 0) {
    // Empty state - render an authentic 35-day paper grid
    return (
      <div className="chart-strip-view">
        {/* Toolbar */}
        <div className="chart-strip-toolbar">
          <div className="toolbar-left">
            <div className="strip-title-group">
              <span className="strip-main-title">{t.tabs.chart}</span>
              <span className="strip-subtitle-badge">Creighton Model FertilityCare System</span>
            </div>
          </div>
          <div className="toolbar-right">
            <button 
              className="toolbar-btn"
              onClick={() => setShowLegend(!showLegend)}
              title={t.chartStrip.showLegend}
            >
              <Info size={15} />
              <span>{showLegend ? t.chartStrip.hideLegend : t.chartStrip.showLegend}</span>
            </button>
          </div>
        </div>

        {/* Legend Drawer */}
        {showLegend && <ChartStripLegend t={t} />}

        <div className="chart-row-container paper-theme">
          <div className="chart-row-header flex-header">
            <span className="cycle-title-badge">
              {t.chartStrip.cycleBadge} 1 (Days 1 - 35)
            </span>
            <span className="cycle-helper-hint">
              <Sparkles size={14} className="hint-icon" /> Click any cell to log your observation
            </span>
          </div>

          <div className="chart-row-scroll" ref={el => { scrollRefs.current['empty'] = el; }}>
            <div className="chart-row-strip paper-grid-strip">
              {Array.from({ length: 35 }).map((_, idx) => {
                const dayNum = idx + 1;
                return (
                  <div 
                    key={idx} 
                    className="chart-cell empty-cell paper-cell" 
                    onClick={() => handleCellClick()}
                    tabIndex={0}
                    role="button"
                    aria-label={`Day ${dayNum} - Empty`}
                  >
                    <div className="cell-header">
                      <span className="cell-day-num">{dayNum}</span>
                    </div>
                    <div className="cell-placeholder">
                      <Plus size={16} className="add-icon" />
                      <span className="add-label">{t.chartStrip.addDay}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-strip-view">
      {/* Chart Strip View Controls */}
      <div className="chart-strip-toolbar">
        <div className="toolbar-left">
          <div className="strip-title-group">
            <span className="strip-main-title">{t.tabs.chart}</span>
            <span className="strip-subtitle-badge">Creighton Model System</span>
          </div>

          <div className="view-mode-toggle">
            <button
              className={`toggle-btn ${viewMode === '35-day' ? 'active' : ''}`}
              onClick={() => setViewMode('35-day')}
              title={t.chartStrip.fullGrid}
            >
              <Grid size={14} />
              <span>{t.chartStrip.fullGrid}</span>
            </button>
            <button
              className={`toggle-btn ${viewMode === 'compact' ? 'active' : ''}`}
              onClick={() => setViewMode('compact')}
              title={t.chartStrip.compactGrid}
            >
              <List size={14} />
              <span>{t.chartStrip.compactGrid}</span>
            </button>
          </div>
        </div>

        <div className="toolbar-right">
          <button
            className={`toolbar-btn ${showPhaseBar ? 'active-toggle' : ''}`}
            onClick={() => setShowPhaseBar(!showPhaseBar)}
            title="Toggle phase timeline bar"
          >
            <Layers size={14} />
            <span>Phases</span>
          </button>

          <button
            className={`toolbar-btn ${showLegend ? 'active-toggle' : ''}`}
            onClick={() => setShowLegend(!showLegend)}
            title={t.chartStrip.showLegend}
          >
            <Info size={14} />
            <span>{showLegend ? t.chartStrip.hideLegend : t.chartStrip.showLegend}</span>
          </button>
        </div>
      </div>

      {/* Interactive Stamp Legend Key */}
      {showLegend && <ChartStripLegend t={t} />}

      {/* Cycle Rows */}
      {filteredCycles.map((cycle, cycleIndex) => {
        const cycleNum = cycles.length - cycleIndex; // 1-based cycle number
        const startDate = cycle.observations[0]?.date || cycle.startDate;
        const endDate = cycle.observations[cycle.observations.length - 1]?.date || startDate;
        const daysCount = cycle.observations.length;

        const peakObs = cycle.observations.find(o => o.isPeakDay);
        const peakDayNum = peakObs?.cycleDay;

        // Map observations by cycleDay for 35-day grid mode
        const obsMap = new Map<number, Observation>();
        cycle.observations.forEach(o => obsMap.set(o.cycleDay, o));

        // Determine total slots to display in 35-day view (minimum 35, or max cycleDay + buffer)
        const maxObsDay = Math.max(...cycle.observations.map(o => o.cycleDay), 0);
        const totalGridSlots = viewMode === '35-day' ? Math.max(35, Math.ceil(maxObsDay / 7) * 7) : daysCount;

        // Build list of slots to render
        const slotsToRender = viewMode === '35-day'
          ? Array.from({ length: totalGridSlots }, (_, i) => {
              const dayNum = i + 1;
              const obs = obsMap.get(dayNum);
              const computedDate = obs?.date || getDateForDay(startDate, dayNum);
              return { dayNum, obs, dateStr: computedDate };
            })
          : cycle.observations.map(obs => ({ dayNum: obs.cycleDay, obs, dateStr: obs.date }));

        return (
          <div key={cycle.id} className="chart-row-container paper-theme">
            {/* Cycle Row Header */}
            <div className="chart-row-header flex-header">
              <div className="cycle-header-left">
                <span className="cycle-title-badge">
                  {t.chartStrip.cycleBadge} {cycleNum}
                </span>
                <span className="cycle-date-range">
                  {startDate} → {endDate}
                </span>
                <span className="cycle-length-pill">
                  {daysCount} {t.stats.days}
                </span>

                {peakDayNum && (
                  <span className="cycle-peak-pill" title={t.chartStrip.jumpToPeak}>
                    <Target size={12} /> {t.chartStrip.phasePeak}: Day {peakDayNum}
                  </span>
                )}
              </div>

              {/* Scroll & Quick Navigation Controls */}
              <div className="cycle-header-actions">
                <button
                  className="nav-icon-btn"
                  onClick={() => jumpToStart(cycle.id)}
                  title={t.chartStrip.jumpToStart}
                >
                  {t.chartStrip.jumpToStart}
                </button>

                {peakDayNum && (
                  <button
                    className="nav-icon-btn peak-btn"
                    onClick={() => jumpToPeak(cycle.id)}
                    title={t.chartStrip.jumpToPeak}
                  >
                    <Target size={13} /> P
                  </button>
                )}

                <button
                  className="nav-icon-btn"
                  onClick={() => jumpToEnd(cycle.id)}
                  title={t.chartStrip.jumpToLatest}
                >
                  {t.chartStrip.jumpToLatest}
                </button>

                <div className="scroll-arrows">
                  <button
                    className="scroll-btn"
                    onClick={() => scrollRow(cycle.id, 'left')}
                    aria-label="Scroll left"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    className="scroll-btn"
                    onClick={() => scrollRow(cycle.id, 'right')}
                    aria-label="Scroll right"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Cycle Phase Bar Timeline */}
            {showPhaseBar && (
              <CyclePhaseTimeline cycle={cycle} totalSlots={totalGridSlots} viewMode={viewMode} t={t} />
            )}

            {/* Paper Chart Scroll Strip */}
            <div 
              className="chart-row-scroll"
              ref={el => { scrollRefs.current[cycle.id] = el; }}
            >
              <div className="chart-row-strip paper-grid-strip">
                {slotsToRender.map(({ dayNum, obs, dateStr }) => {
                  const cellKey = `${cycle.id}_${dayNum}`;
                  const isHovered = hoveredCellKey === cellKey;
                  const dayOfWeek = formatDayOfWeek(dateStr);
                  const isPeak = obs?.isPeakDay;

                  if (obs) {
                    return (
                      <div
                        key={obs.id || dayNum}
                        className={`chart-cell filled-cell paper-cell ${isPeak ? 'peak-cell' : ''} ${obs.stamp.toLowerCase()}`}
                        onClick={() => handleCellClick(obs)}
                        onMouseEnter={() => setHoveredCellKey(cellKey)}
                        onMouseLeave={() => setHoveredCellKey(null)}
                        onFocus={() => setHoveredCellKey(cellKey)}
                        onBlur={() => setHoveredCellKey(null)}
                        tabIndex={0}
                        role="button"
                        aria-label={`Cycle Day ${obs.cycleDay}, Date ${obs.date}, Stamp ${obs.stamp}, Code ${obs.codeString || 'None'}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleCellClick(obs);
                          }
                        }}
                      >
                        {/* Day Header */}
                        <div className="cell-header">
                          <span className="cell-day-num">{obs.cycleDay}</span>
                          <span className="cell-day-name">{dayOfWeek}</span>
                          <span className="cell-date">{obs.date.slice(5)}</span>
                        </div>

                        {/* Stamp Badge */}
                        <div className="cell-stamp-wrapper">
                          <StampBadge stamp={obs.stamp} isPeakDay={obs.isPeakDay} intercourse={obs.intercourse} size="sm" />
                        </div>

                        {/* CrMS Code */}
                        <div className="cell-code" title={obs.codeString}>
                          {obs.codeString || '---'}
                        </div>

                        {/* Symptoms & Notes Indicators */}
                        <div className="cell-footer-indicators">
                          {obs.symptoms && obs.symptoms.length > 0 && (
                            <span className="cell-symptom-tag" title={`Symptoms: ${obs.symptoms.join(', ')}`}>
                              {obs.symptoms.join(',')}
                            </span>
                          )}
                          {obs.notes && obs.notes.trim() !== '' && (
                            <span className="cell-notes-icon" title={`${t.chartStrip.notesTooltip}: ${obs.notes}`}>
                              <MessageSquare size={10} />
                            </span>
                          )}
                        </div>

                        {/* Hover Tooltip Popover */}
                        {isHovered && (
                          <div className="cell-hover-popover">
                            <div className="popover-header">
                              <span className="popover-day">Day {obs.cycleDay}</span>
                              <span className="popover-date">{obs.date}</span>
                            </div>
                            <div className="popover-body">
                              <div className="popover-row">
                                <span className="popover-label">Code:</span>
                                <span className="popover-val highlight">{obs.codeString || '---'}</span>
                              </div>
                              {obs.bleeding && (
                                <div className="popover-row">
                                  <span className="popover-label">Bleeding:</span>
                                  <span className="popover-val">{obs.bleeding}</span>
                                </div>
                              )}
                              {obs.stretch && (
                                <div className="popover-row">
                                  <span className="popover-label">Stretch:</span>
                                  <span className="popover-val">{obs.stretch}</span>
                                </div>
                              )}
                              {obs.modifiers && obs.modifiers.length > 0 && (
                                <div className="popover-row">
                                  <span className="popover-label">Modifiers:</span>
                                  <span className="popover-val">{obs.modifiers.join(', ')}</span>
                                </div>
                              )}
                              {obs.intercourse && (
                                <div className="popover-row">
                                  <span className="popover-label">Intercourse:</span>
                                  <span className="popover-val intercourse-text">Yes (I)</span>
                                </div>
                              )}
                              {obs.notes && (
                                <div className="popover-notes">
                                  "{obs.notes}"
                                </div>
                              )}
                            </div>
                            <div className="popover-footer">Click to edit</div>
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    // Empty slot in 35-day grid
                    return (
                      <div
                        key={`empty_${dayNum}`}
                        className="chart-cell empty-cell paper-cell"
                        onClick={() => handleCellClick(undefined, dateStr, dayNum)}
                        tabIndex={0}
                        role="button"
                        aria-label={`Day ${dayNum} - Empty. Click to add observation.`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleCellClick(undefined, dateStr, dayNum);
                          }
                        }}
                      >
                        <div className="cell-header">
                          <span className="cell-day-num">{dayNum}</span>
                          {dateStr && <span className="cell-date">{dateStr.slice(5)}</span>}
                        </div>

                        <div className="cell-placeholder">
                          <Plus size={14} className="add-icon" />
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* Stamp Legend Key Sub-component */
const ChartStripLegend: React.FC<{ t: any }> = ({ t }) => {
  return (
    <div className="chart-strip-legend paper-legend">
      <div className="legend-title">Creighton Model Chart Stamp Key:</div>
      <div className="legend-items">
        <div className="legend-item">
          <span className="legend-badge stamp-red"></span>
          <span className="legend-label">{t.chartStrip.phaseMenses} (Bleeding)</span>
        </div>
        <div className="legend-item">
          <span className="legend-badge stamp-dark_green"></span>
          <span className="legend-label">Dry / Infertile</span>
        </div>
        <div className="legend-item">
          <span className="legend-badge stamp-white_baby">
            <svg className="baby-svg" viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
              <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11c0 2.2-1.8 4-4 4s-4-1.8-4-4V9.5C4.8 8.8 4 7.5 4 6a4 4 0 0 1 4-4h4zm0 2a2 2 0 0 0-2 2v1h4V6a2 2 0 0 0-2-2zM8 17h8a1 1 0 0 1 1 1v1a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3v-1a1 1 0 0 1 1-1z" />
            </svg>
          </span>
          <span className="legend-label">{t.chartStrip.phaseFollicular} (Fertile Mucus)</span>
        </div>
        <div className="legend-item">
          <span className="legend-badge stamp-light_green_baby_1">
            <svg className="baby-svg" viewBox="0 0 24 24" fill="currentColor" width="10" height="10">
              <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11c0 2.2-1.8 4-4 4s-4-1.8-4-4V9.5C4.8 8.8 4 7.5 4 6a4 4 0 0 1 4-4h4zm0 2a2 2 0 0 0-2 2v1h4V6a2 2 0 0 0-2-2zM8 17h8a1 1 0 0 1 1 1v1a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3v-1a1 1 0 0 1 1-1z" />
            </svg>
            <span className="num">1,2,3</span>
          </span>
          <span className="legend-label">{t.chartStrip.phasePostPeak} (Count 1, 2, 3)</span>
        </div>
        <div className="legend-item">
          <span className="legend-badge peak-legend">P</span>
          <span className="legend-label">{t.chartStrip.phasePeak} (Peak Day)</span>
        </div>
        <div className="legend-item">
          <span className="legend-badge intercourse-legend">I</span>
          <span className="legend-label">Intercourse (I)</span>
        </div>
      </div>
    </div>
  );
};

/* Phase Timeline Sub-component */
const CyclePhaseTimeline: React.FC<{ cycle: any; totalSlots: number; viewMode: string; t: any }> = ({
  cycle,
  totalSlots,
  viewMode,
  t,
}) => {
  // Determine phase segments across observations
  const obsList: Observation[] = cycle.observations;
  const peakObs = obsList.find(o => o.isPeakDay);
  const peakDayNum = peakObs?.cycleDay;

  return (
    <div className="cycle-phase-bar-wrapper">
      <div className="cycle-phase-bar">
        {Array.from({ length: totalSlots }).map((_, idx) => {
          const dayNum = idx + 1;
          const obs = obsList.find(o => o.cycleDay === dayNum);
          
          let phaseClass = 'phase-unknown';
          let title = `Day ${dayNum}`;

          if (obs) {
            if (obs.bleeding) {
              phaseClass = 'phase-menses';
              title = `Day ${dayNum}: ${t.chartStrip.phaseMenses}`;
            } else if (obs.isPeakDay) {
              phaseClass = 'phase-peak';
              title = `Day ${dayNum}: ${t.chartStrip.phasePeak}`;
            } else if (obs.stamp.startsWith('LIGHT_GREEN')) {
              phaseClass = 'phase-post-peak';
              title = `Day ${dayNum}: ${t.chartStrip.phasePostPeak}`;
            } else if (peakDayNum && dayNum < peakDayNum) {
              phaseClass = obs.stamp === 'WHITE_BABY' ? 'phase-fertile' : 'phase-follicular';
              title = `Day ${dayNum}: ${t.chartStrip.phaseFollicular}`;
            } else if (peakDayNum && dayNum > peakDayNum + 3) {
              phaseClass = 'phase-luteal';
              title = `Day ${dayNum}: ${t.chartStrip.phaseLuteal}`;
            } else if (obs.stamp === 'WHITE_BABY') {
              phaseClass = 'phase-fertile';
            } else {
              phaseClass = 'phase-infertile';
            }
          }

          return (
            <div
              key={dayNum}
              className={`phase-segment ${phaseClass} ${obs?.isPeakDay ? 'peak-segment' : ''}`}
              title={title}
            >
              {obs?.isPeakDay && <span className="phase-peak-dot">P</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

