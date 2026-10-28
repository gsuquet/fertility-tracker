import type React from 'react';
import { useState } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import type { Observation } from '../types/crms';
import { getTodayStr } from '../utils/dateUtils';
import { ChartToolbar } from './chart/ChartToolbar';
import type { ChartViewMode } from './chart/ChartToolbar';
import { ChartLegend } from './chart/ChartLegend';
import { ChartBlankGrid } from './chart/ChartBlankGrid';
import { ChartCycleRow } from './chart/ChartCycleRow';

export const ChartRow: React.FC = () => {
  const { cycles, selectedCycleId, setSelectedObservation, setIsDrawerOpen } = useCycle();
  const { t } = useLanguage();

  // View preferences
  const [viewMode, setViewMode] = useState<ChartViewMode>('35-day');
  const [showPhaseBar, setShowPhaseBar] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const toggleLegend = () => setShowLegend(!showLegend);

  const openObservation = (obs: Observation) => {
    setSelectedObservation(obs);
    setIsDrawerOpen(true);
  };

  // Opens a draft observation for an empty day slot
  const openEmptyDay = (date: string, dayNum: number) => {
    openObservation({
      id: '',
      date,
      cycleDay: dayNum,
      stamp: 'DARK_GREEN',
      codeString: '0AD',
      intercourse: false,
      symptoms: [],
    });
  };

  if (cycles.length === 0) {
    return (
      <div
        className="chart-strip-view"
        id="chart-panel"
        role="tabpanel"
        aria-labelledby="tab-chart"
      >
        <ChartToolbar
          t={t}
          subtitle={t.chartStrip.subtitleBlank}
          showLegend={showLegend}
          onToggleLegend={toggleLegend}
        />
        {showLegend && <ChartLegend t={t} />}
        <ChartBlankGrid t={t} onOpenDay={openEmptyDay} />
      </div>
    );
  }

  const todayStr = getTodayStr();
  const filteredCycles =
    selectedCycleId === 'all' ? cycles : cycles.filter(c => c.id === selectedCycleId);

  return (
    <div className="chart-strip-view" id="chart-panel" role="tabpanel" aria-labelledby="tab-chart">
      <ChartToolbar
        t={t}
        subtitle={t.chartStrip.subtitle}
        showLegend={showLegend}
        onToggleLegend={toggleLegend}
        controls={{
          viewMode,
          onViewModeChange: setViewMode,
          showPhaseBar,
          onTogglePhaseBar: () => setShowPhaseBar(!showPhaseBar),
        }}
      />

      {showLegend && <ChartLegend t={t} />}

      {filteredCycles.map((cycle, cycleIndex) => (
        <ChartCycleRow
          key={cycle.id}
          cycle={cycle}
          cycleNum={cycles.length - cycleIndex}
          viewMode={viewMode}
          showPhaseBar={showPhaseBar}
          todayStr={todayStr}
          isCurrent={cycle.id === cycles[0]?.id && todayStr >= cycle.startDate}
          t={t}
          onOpenObservation={openObservation}
          onOpenDay={openEmptyDay}
        />
      ))}
    </div>
  );
};
