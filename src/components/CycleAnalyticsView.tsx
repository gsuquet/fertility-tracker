import type React from 'react';
import { useState } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Activity,
  Calendar,
  Flame,
  CheckCircle2,
  TrendingUp,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { averagePhases, getCyclePhases } from '../domain/cyclePhases';
import { getMucusScore } from '../domain/mucusScore';
import { formatMessage } from '../i18n';

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
        <Activity size={48} className="icon-muted" />
        <h3>{t.analytics.emptyTitle}</h3>
        <p>{t.analytics.emptyText}</p>
      </div>
    );
  }

  const isAll = selectedCycleId === 'all';
  const targetObs = isAll ? observations : activeCycle.observations;
  const targetCycles = isAll ? cycles : [activeCycle];

  const totalDays = targetObs.length;

  // The combined view averages the phases per cycle. Cycles are listed newest first,
  // so the first cycle with a Peak Day holds the latest one.
  const singlePhases = getCyclePhases(activeCycle);
  const average = averagePhases(cycles);
  const phases = isAll ? average : singlePhases;
  const peakObs = isAll ? cycles.map(c => getCyclePhases(c).peak).find(Boolean) : singlePhases.peak;
  const hasPeak = isAll ? average.cyclesWithPeak > 0 : peakObs !== undefined;
  const lutealPhaseDays = phases.lutealDays;
  const formatDays = (days: number) => (Number.isInteger(days) ? String(days) : days.toFixed(1));
  const phasePercent = (days: number) => (days / phases.lengthDays) * 100;

  const mensesDays = targetObs.filter(o => o.stamp === 'RED').length;
  const dryDays = targetObs.filter(o => o.stamp === 'DARK_GREEN').length;
  const fertileMucusDays = targetObs.filter(o => o.stamp === 'WHITE_BABY').length;
  const postPeakDays = targetObs.filter(o => o.stamp.startsWith('LIGHT_GREEN')).length;
  const intercourseCount = targetObs.filter(o => o.intercourse).length;

  // A cycle always holds at least one observation, so totalDays is never 0
  const percentOf = (days: number) => (days / totalDays) * 100;

  const avgMucusScore = (
    targetObs.reduce((acc, obs) => acc + getMucusScore(obs), 0) / totalDays
  ).toFixed(1);

  return (
    <div
      className="analytics-view"
      id="analytics-panel"
      role="tabpanel"
      aria-labelledby="tab-analytics"
    >
      {/* Interactive MCS Explanation Guide Card */}
      <div className="analytics-card mcs-guide-card full-width">
        <button
          type="button"
          className="mcs-guide-header"
          onClick={() => setShowMcsGuide(!showMcsGuide)}
        >
          <div className="mcs-guide-title">
            <HelpCircle size={20} className="icon-indigo" />
            <span>{t.analytics.mcsGuideTitle}</span>
          </div>
          {showMcsGuide ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {showMcsGuide && (
          <div className="mcs-guide-body">
            <p>{t.analytics.mcsGuideText}</p>
            <div className="mcs-scale-grid">
              <div className="scale-item">
                <strong>{formatMessage(t.analytics.mcsPoints, { points: 0 })}</strong>{' '}
                {t.analytics.mcsDry}
              </div>
              <div className="scale-item">
                <strong>{formatMessage(t.analytics.mcsPoints, { points: 2 })}</strong>{' '}
                {t.analytics.mcsDamp}
              </div>
              <div className="scale-item">
                <strong>{formatMessage(t.analytics.mcsPoints, { points: 4 })}</strong>{' '}
                {t.analytics.mcsShiny}
              </div>
              <div className="scale-item">
                <strong>{formatMessage(t.analytics.mcsPoints, { points: 6 })}</strong>{' '}
                {t.analytics.mcsStretch6}
              </div>
              <div className="scale-item">
                <strong>{formatMessage(t.analytics.mcsPoints, { points: 8 })}</strong>{' '}
                {t.analytics.mcsStretch8}
              </div>
              <div className="scale-item">
                <strong>{formatMessage(t.analytics.mcsPoints, { points: 10 })}</strong>{' '}
                {t.analytics.mcsStretch10}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="analytics-grid">
        {/* Phase Breakdown Card */}
        <div className="analytics-card">
          <div className="card-header">
            <Calendar size={20} className="icon-indigo" />
            <h3>
              {t.analytics.phasesTitle}{' '}
              {isAll
                ? t.analytics.allCyclesCombined
                : formatMessage(t.analytics.cycleInTitle, {
                    number: cycles.length - cycles.findIndex(c => c.id === activeCycle.id),
                  })}
            </h3>
          </div>
          <div className="phase-metrics">
            <div className="phase-row">
              <span>{t.analytics.mensesPhase}</span>
              <strong>
                {formatDays(phases.mensesDays)} {t.stats.days}
              </strong>
            </div>
            <div className="phase-bar-wrapper">
              <div
                className="phase-bar bar-menses"
                style={{ width: `${phasePercent(phases.mensesDays)}%` }}
              />
            </div>

            <div className="phase-row">
              <span>{t.analytics.follicularPhase}</span>
              <strong>
                {formatDays(phases.follicularDays)} {t.stats.days}
                {hasPeak ? '' : ` (${t.analytics.inProgress})`}
              </strong>
            </div>
            <div className="phase-bar-wrapper">
              <div
                className="phase-bar bar-follicular"
                style={{ width: `${phasePercent(phases.follicularDays)}%` }}
              />
            </div>

            <div className="phase-row">
              <span>{t.analytics.lutealPhase}</span>
              <strong>
                {formatDays(lutealPhaseDays)} {t.stats.days}
              </strong>
            </div>
            <div className="phase-bar-wrapper">
              <div
                className="phase-bar bar-luteal"
                style={{ width: `${phasePercent(lutealPhaseDays)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Mucus & Stamp Score Distribution */}
        <div className="analytics-card">
          <div className="card-header">
            <TrendingUp size={20} className="icon-emerald" />
            <h3>{t.analytics.distributionTitle}</h3>
          </div>
          <div className="stamp-distribution">
            <div className="dist-item">
              <div className="dist-badge stamp-red">{t.analytics.stampRed}</div>
              <div className="dist-info">
                <span>{t.analytics.mensesDays}</span>
                <strong>
                  {mensesDays} {t.stats.days} ({Math.round(percentOf(mensesDays))}%)
                </strong>
              </div>
            </div>

            <div className="dist-item">
              <div className="dist-badge stamp-dark_green">{t.analytics.stampDarkGreen}</div>
              <div className="dist-info">
                <span>{t.analytics.dryDays}</span>
                <strong>
                  {dryDays} {t.stats.days} ({Math.round(percentOf(dryDays))}%)
                </strong>
              </div>
            </div>

            <div className="dist-item">
              <div className="dist-badge stamp-white_baby">{t.analytics.stampWhite}</div>
              <div className="dist-info">
                <span>{t.analytics.fertileDays}</span>
                <strong>
                  {fertileMucusDays} {t.stats.days} ({Math.round(percentOf(fertileMucusDays))}%)
                </strong>
              </div>
            </div>

            <div className="dist-item">
              <div className="dist-badge stamp-light_green_baby_1">
                {t.analytics.stampLightGreen}
              </div>
              <div className="dist-info">
                <span>{t.analytics.postPeakDays}</span>
                <strong>
                  {postPeakDays} {t.stats.days}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Creighton Mucus Intensity Trend Chart */}
        <div className="analytics-card full-width">
          <div className="card-header">
            <Flame size={20} className="icon-rose" />
            <h3 id="mucus-trend-title">{t.analytics.trendTitle}</h3>
          </div>
          {/* It scrolls on narrow screens, so the keyboard can focus it */}
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
                      const heightPct = Math.max((score / 10) * 100, 8);
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
                          <div className="trend-bar-value">{score > 0 ? score : ''}</div>
                          <div
                            className={`trend-bar ${obs.isPeakDay ? 'bar-peak' : score >= 6 ? 'bar-fertile' : 'bar-dry'}`}
                            style={{ height: `${heightPct}%` }}
                          />
                          <div className="trend-bar-label">
                            {formatMessage(t.common.cycleDayCompact, { day: obs.cycleDay })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        </div>

        {/* Practitioner Clinical Overview */}
        <div className="analytics-card full-width">
          <div className="card-header">
            <CheckCircle2 size={20} className="icon-indigo" />
            <h3>{t.analytics.clinicalTitle}</h3>
          </div>
          <div className="clinical-summary">
            <div className="summary-item">
              <strong>{t.analytics.avgMucusScore}:</strong> {avgMucusScore} / 10
            </div>
            <div className="summary-item">
              <strong>{t.labels.peakDay}:</strong>{' '}
              {peakObs
                ? formatMessage(t.common.cycleDayDate, {
                    day: peakObs.cycleDay,
                    date: peakObs.date,
                  })
                : t.analytics.pendingPeak}
            </div>
            <div className="summary-item">
              <strong>{t.analytics.lutealHealth}:</strong>{' '}
              {lutealPhaseDays >= 9 && lutealPhaseDays <= 17
                ? t.analytics.normalLuteal
                : lutealPhaseDays > 0
                  ? t.analytics.abnormalLuteal
                  : t.analytics.pendingPeak}
            </div>
            <div className="summary-item">
              <strong>{t.stats.intercourseCount}:</strong>{' '}
              {formatMessage(t.analytics.totalCount, { count: intercourseCount })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
