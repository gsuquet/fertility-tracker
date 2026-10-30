import type React from 'react';
import { PageTitle } from './shell/TopBar';
import { useState } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { Activity, HelpCircle, ChevronDown } from 'lucide-react';
import {
  averagePhases,
  averageSegments,
  getCyclePhases,
  getPhaseSegments,
} from '../domain/cyclePhases';
import { getMucusScore } from '../domain/mucusScore';
import { formatMessage } from '../i18n';

/** A whole number as it is, else one decimal */
const formatDays = (days: number) => (Number.isInteger(days) ? String(days) : days.toFixed(1));

/** The cycle days that the trend axis names: the first day and each fifth day */
const isAxisDay = (cycleDay: number) => cycleDay === 1 || cycleDay % 5 === 0;

/**
 * Cycle Analytics (RFC 0002): the cycle phases, the mucus score trend, the stamps, the clinical
 * summary and, at the end, the explanation of the mucus score. The tiles are CycleStatsHeader.
 */
export const CycleAnalyticsView: React.FC = () => {
  const { observations, cycles, selectedCycleId } = useCycle();
  const { t } = useLanguage();
  const [showMcsGuide, setShowMcsGuide] = useState(false);

  const activeCycle = cycles.find(c => c.id === selectedCycleId) ?? cycles[0];

  // No cycle exists without observations
  if (!activeCycle) {
    return (
      <div
        className="analytics-empty-state"
        id="analytics-panel"
        role="tabpanel"
        aria-labelledby="tab-analytics"
      >
        <PageTitle title={t.tabs.analytics} phoneTitle={t.mobileTabs.analytics} />
        <Activity size={48} className="icon-muted" />
        <h3>{t.analytics.emptyTitle}</h3>
        <p>{t.analytics.emptyText}</p>
      </div>
    );
  }

  const isAll = selectedCycleId === 'all';
  const targetObs = isAll ? observations : activeCycle.observations;
  const targetCycles = isAll ? cycles : [activeCycle];

  // The combined view averages the phases per cycle
  const segments = isAll ? averageSegments(cycles) : getPhaseSegments(activeCycle);
  const lutealDays = isAll
    ? averagePhases(cycles).lutealDays
    : getCyclePhases(activeCycle).lutealDays;
  const hasPeak = targetCycles.some(c => getCyclePhases(c).peak);
  const phases = [
    { key: 'menses', name: t.analytics.phaseMenses, days: segments.mensesDays },
    { key: 'before-peak', name: t.analytics.phaseBeforePeak, days: segments.beforePeakDays },
    { key: 'count', name: t.analytics.phaseCount, days: segments.countDays },
    { key: 'after-count', name: t.analytics.phaseAfterCount, days: segments.afterCountDays },
  ];
  const phaseTotal = phases.reduce((sum, phase) => sum + phase.days, 0);
  const phaseSummary = phases
    .map(phase =>
      formatMessage(t.analytics.phaseDays, { phase: phase.name, days: formatDays(phase.days) })
    )
    .join(', ');

  const stamps = [
    {
      key: 'red',
      label: t.analytics.stampBleeding,
      count: targetObs.filter(o => o.stamp === 'RED').length,
    },
    {
      key: 'dry',
      label: t.analytics.stampDry,
      count: targetObs.filter(o => o.stamp === 'DARK_GREEN').length,
    },
    {
      key: 'fertile',
      label: t.analytics.stampFertile,
      count: targetObs.filter(o => o.stamp === 'WHITE_BABY').length,
    },
    {
      key: 'count',
      label: t.analytics.stampCount,
      count: targetObs.filter(o => o.stamp.startsWith('LIGHT_GREEN')).length,
    },
  ];

  // A cycle always holds at least one observation, so the total is never 0
  const avgMucusScore = (
    targetObs.reduce((acc, obs) => acc + getMucusScore(obs), 0) / targetObs.length
  ).toFixed(1);
  const lutealHealth =
    lutealDays >= 9 && lutealDays <= 17
      ? { text: t.analytics.normalLuteal, tone: 'is-normal' }
      : lutealDays > 0
        ? { text: t.analytics.abnormalLuteal, tone: 'is-abnormal' }
        : { text: t.analytics.pendingPeak, tone: '' };

  return (
    <div
      className="analytics-view"
      id="analytics-panel"
      role="tabpanel"
      aria-labelledby="tab-analytics"
    >
      <PageTitle title={t.tabs.analytics} phoneTitle={t.mobileTabs.analytics} />
      <div className="analytics-grid">
        <div className="analytics-card analytics-phases">
          <h3 id="phases-title">{t.analytics.phasesTitle}</h3>
          <div className="phase-stack" role="img" aria-label={phaseSummary}>
            {phases
              .filter(phase => phase.days > 0)
              .map(phase => (
                <span
                  key={phase.key}
                  className={`phase-part phase-part-${phase.key}`}
                  style={{ flexGrow: phase.days / phaseTotal }}
                >
                  {formatDays(phase.days)}
                </span>
              ))}
          </div>
          <ul className="phase-legend" aria-hidden="true">
            {phases.map(phase => (
              <li key={phase.key}>
                <span className={`phase-dot phase-part-${phase.key}`} />
                {phase.name}
              </li>
            ))}
          </ul>
          {!hasPeak && <p className="analytics-note">{t.analytics.noPeakYet}</p>}
        </div>

        <div className="analytics-card analytics-trend">
          <h3 id="mucus-trend-title">{t.analytics.trendTitle}</h3>
          <p className="analytics-note">{t.analytics.trendDescription}</p>
          {/* A long cycle scrolls on a narrow screen, so the keyboard can focus it */}
          <section
            className="mucus-trend-wrapper"
            aria-labelledby="mucus-trend-title"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: axe scrollable-region-focusable needs a focusable scrolling chart
            tabIndex={0}
          >
            {targetCycles.map(cycle => {
              const cycleNum = cycles.length - cycles.findIndex(c => c.id === cycle.id);
              return (
                <div key={cycle.id} className="cycle-trend-group">
                  {isAll && (
                    <div className="cycle-trend-group-title">
                      {formatMessage(t.analytics.cycleStarted, {
                        number: cycleNum,
                        date: cycle.startDate,
                      })}
                    </div>
                  )}
                  <div className="mucus-trend-chart">
                    {cycle.observations.map(obs => {
                      const score = getMucusScore(obs);
                      return (
                        <div
                          key={obs.id}
                          className="trend-bar-col"
                          title={formatMessage(t.analytics.trendBarTitle, {
                            day: obs.cycleDay,
                            code: obs.codeString || '0',
                            score,
                          })}
                        >
                          <div
                            className={`trend-bar ${obs.isPeakDay ? 'bar-peak' : score >= 6 ? 'bar-fertile' : 'bar-dry'}`}
                            style={{ height: `${score * 10}%` }}
                          />
                          <span className="trend-bar-label" aria-hidden="true">
                            {isAxisDay(obs.cycleDay) ? obs.cycleDay : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        </div>

        <div className="analytics-card analytics-stamps">
          <h3 id="stamps-title">{isAll ? t.analytics.stampsTitleAll : t.analytics.stampsTitle}</h3>
          <ul className="stamp-counts">
            {stamps.map(stamp => (
              <li key={stamp.key} className="stamp-count">
                <span className="stamp-count-label">{stamp.label}</span>
                <span className="stamp-count-track" aria-hidden="true">
                  <span
                    className={`stamp-count-bar stamp-count-${stamp.key}`}
                    style={{ width: `${(stamp.count / targetObs.length) * 100}%` }}
                  />
                </span>
                <strong className="stamp-count-value">{stamp.count}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="analytics-card analytics-clinical">
          <h3 id="clinical-title">{t.analytics.clinicalTitle}</h3>
          <dl className="clinical-summary">
            <div className="summary-item">
              <dt>{t.analytics.avgMucusScore}</dt>
              <dd>{avgMucusScore}</dd>
            </div>
            <div className="summary-item">
              <dt>{t.analytics.lutealHealth}</dt>
              <dd className={lutealHealth.tone}>{lutealHealth.text}</dd>
            </div>
          </dl>
        </div>

        <div className="analytics-card mcs-guide-card">
          <h3 className="mcs-guide-heading">
            <button
              type="button"
              className="mcs-guide-header"
              aria-expanded={showMcsGuide}
              aria-controls="mcs-guide-body"
              onClick={() => setShowMcsGuide(!showMcsGuide)}
            >
              <HelpCircle size={20} aria-hidden="true" />
              <span>{t.analytics.mcsGuideTitle}</span>
              <ChevronDown size={20} aria-hidden="true" className="mcs-guide-chevron" />
            </button>
          </h3>
          {showMcsGuide && (
            <div className="mcs-guide-body" id="mcs-guide-body">
              <p>{t.analytics.mcsGuideText}</p>
              <ul className="mcs-scale-grid">
                {(
                  [
                    [0, t.analytics.mcsDry],
                    [2, t.analytics.mcsDamp],
                    [4, t.analytics.mcsShiny],
                    [6, t.analytics.mcsStretch6],
                    [8, t.analytics.mcsStretch8],
                    [10, t.analytics.mcsStretch10],
                  ] as const
                ).map(([points, text]) => (
                  <li key={points} className="scale-item">
                    <strong>{formatMessage(t.analytics.mcsPoints, { points })}</strong> {text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
