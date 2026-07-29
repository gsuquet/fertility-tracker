import React, { useState } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { Activity, Calendar, Flame, CheckCircle2, TrendingUp, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Observation } from '../types/crms';

export const CycleAnalyticsView: React.FC = () => {
  const { observations, cycles, selectedCycleId } = useCycle();
  const { t } = useLanguage();
  const [showMcsGuide, setShowMcsGuide] = useState(false);

  if (observations.length === 0 || cycles.length === 0) {
    return (
      <div className="analytics-empty-state">
        <Activity size={48} className="icon-muted" />
        <h3>No Observations Logged</h3>
        <p>Log observations or click "Load Demo Cycle" in the practitioner export menu to view cycle analytics.</p>
      </div>
    );
  }

  const isAll = selectedCycleId === 'all';
  const activeCycle = cycles.find(c => c.id === selectedCycleId) || cycles[0];
  const targetObs = isAll ? observations : activeCycle.observations;
  const targetCycles = isAll ? cycles : [activeCycle];

  const totalDays = targetObs.length;
  const peakObs = targetObs.find(o => o.isPeakDay);

  let lutealPhaseDays = 0;
  let follicularPhaseDays = 0;
  if (peakObs) {
    follicularPhaseDays = peakObs.cycleDay;
    lutealPhaseDays = targetObs.filter(o => o.cycleDay > peakObs.cycleDay).length;
  }

  const mensesDays = targetObs.filter(o => o.stamp === 'RED').length;
  const dryDays = targetObs.filter(o => o.stamp === 'DARK_GREEN').length;
  const fertileMucusDays = targetObs.filter(o => o.stamp === 'WHITE_BABY').length;
  const postPeakDays = targetObs.filter(o => o.stamp.startsWith('LIGHT_GREEN')).length;
  const intercourseCount = targetObs.filter(o => o.intercourse).length;

  const getMucusScore = (obs: Observation): number => {
    const mods = obs.modifiers || [];
    if (obs.stretch === '10' || obs.stretch === '10DL' || obs.stretch === '10SL' || obs.stretch === '10WL' || mods.includes('K') || mods.includes('L')) {
      return 10;
    }
    if (obs.stretch === '8') return 8;
    if (obs.stretch === '6') return 6;
    if (obs.stretch === '4') return 4;
    if (obs.stretch === '2' || obs.stretch === '2W') return 2;
    return 0;
  };

  const avgMucusScore = totalDays > 0
    ? (targetObs.reduce((acc, obs) => acc + getMucusScore(obs), 0) / totalDays).toFixed(1)
    : '0.0';

  return (
    <div className="analytics-view">
      {/* Interactive MCS Explanation Guide Card */}
      <div className="analytics-card mcs-guide-card full-width">
        <button
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
              <div className="scale-item"><strong>0 pts:</strong> Dry (0)</div>
              <div className="scale-item"><strong>2 pts:</strong> Damp / Wet (2, 2W)</div>
              <div className="scale-item"><strong>4 pts:</strong> Shiny (4)</div>
              <div className="scale-item"><strong>6 pts:</strong> ~0.5cm Stretch (6)</div>
              <div className="scale-item"><strong>8 pts:</strong> 1-2cm Stretch (8)</div>
              <div className="scale-item"><strong>10 pts:</strong> 2.5cm+ (10, K, L)</div>
            </div>
          </div>
        )}
      </div>

      <div className="analytics-grid">
        {/* Phase Breakdown Card */}
        <div className="analytics-card">
          <div className="card-header">
            <Calendar size={20} className="icon-indigo" />
            <h3>{t.analytics.phasesTitle} {isAll ? '(All Cycles Combined)' : `(Cycle ${cycles.length - cycles.findIndex(c => c.id === activeCycle.id)})`}</h3>
          </div>
          <div className="phase-metrics">
            <div className="phase-row">
              <span>{t.analytics.mensesPhase}</span>
              <strong>{mensesDays} {t.stats.days}</strong>
            </div>
            <div className="phase-bar-wrapper">
              <div className="phase-bar bar-menses" style={{ width: `${totalDays > 0 ? (mensesDays / totalDays) * 100 : 0}%` }} />
            </div>

            <div className="phase-row">
              <span>{t.analytics.follicularPhase}</span>
              <strong>{follicularPhaseDays} {t.stats.days}</strong>
            </div>
            <div className="phase-bar-wrapper">
              <div className="phase-bar bar-follicular" style={{ width: `${totalDays > 0 ? (follicularPhaseDays / totalDays) * 100 : 0}%` }} />
            </div>

            <div className="phase-row">
              <span>{t.analytics.lutealPhase}</span>
              <strong>{lutealPhaseDays} {t.stats.days}</strong>
            </div>
            <div className="phase-bar-wrapper">
              <div className="phase-bar bar-luteal" style={{ width: `${totalDays > 0 ? (lutealPhaseDays / totalDays) * 100 : 0}%` }} />
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
              <div className="dist-badge stamp-red">Red</div>
              <div className="dist-info">
                <span>Menses Bleeding</span>
                <strong>{mensesDays} {t.stats.days} ({totalDays > 0 ? Math.round((mensesDays / totalDays) * 100) : 0}%)</strong>
              </div>
            </div>

            <div className="dist-item">
              <div className="dist-badge stamp-dark_green">Dark Green</div>
              <div className="dist-info">
                <span>Infertile Dry Days</span>
                <strong>{dryDays} {t.stats.days} ({totalDays > 0 ? Math.round((dryDays / totalDays) * 100) : 0}%)</strong>
              </div>
            </div>

            <div className="dist-item">
              <div className="dist-badge stamp-white_baby">White 👶</div>
              <div className="dist-info">
                <span>Fertile Mucus Days</span>
                <strong>{fertileMucusDays} {t.stats.days} ({totalDays > 0 ? Math.round((fertileMucusDays / totalDays) * 100) : 0}%)</strong>
              </div>
            </div>

            <div className="dist-item">
              <div className="dist-badge stamp-light_green_baby_1">Light Green 👶</div>
              <div className="dist-info">
                <span>Post-Peak Count (1-2-3)</span>
                <strong>{postPeakDays} {t.stats.days}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Creighton Mucus Intensity Trend Chart */}
        <div className="analytics-card full-width">
          <div className="card-header">
            <Flame size={20} className="icon-rose" />
            <h3>{t.analytics.trendTitle}</h3>
          </div>
          <div className="mucus-trend-wrapper">
            {targetCycles.map((cycle, cIdx) => {
              const cycleNum = cycles.length - cycles.findIndex(c => c.id === cycle.id);
              return (
                <div key={cycle.id} className="cycle-trend-group">
                  {isAll && (
                    <div className="cycle-trend-group-title">
                      Cycle {cycleNum} (Started {cycle.startDate})
                    </div>
                  )}
                  <div className="mucus-trend-chart">
                    {cycle.observations.map(obs => {
                      const score = getMucusScore(obs);
                      const heightPct = Math.max((score / 10) * 100, 8);
                      return (
                        <div key={obs.id} className="trend-bar-col" title={`CD ${obs.cycleDay}: ${obs.codeString || '0'} (Score: ${score})`}>
                          <div className="trend-bar-value">{score > 0 ? score : ''}</div>
                          <div
                            className={`trend-bar ${obs.isPeakDay ? 'bar-peak' : score >= 6 ? 'bar-fertile' : 'bar-dry'}`}
                            style={{ height: `${heightPct}%` }}
                          />
                          <div className="trend-bar-label">CD{obs.cycleDay}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
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
              <strong>{t.labels.peakDay}:</strong> {peakObs ? `CD ${peakObs.cycleDay} (${peakObs.date})` : t.analytics.pendingPeak}
            </div>
            <div className="summary-item">
              <strong>{t.analytics.lutealHealth}:</strong> {lutealPhaseDays >= 9 && lutealPhaseDays <= 17 ? t.analytics.normalLuteal : lutealPhaseDays > 0 ? t.analytics.abnormalLuteal : t.analytics.pendingPeak}
            </div>
            <div className="summary-item">
              <strong>{t.stats.intercourseCount}:</strong> {intercourseCount} total
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
