import type React from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { Calendar, Flame, Heart, Activity } from 'lucide-react';

export const CycleStatsHeader: React.FC = () => {
  const { observations, cycles, selectedCycleId } = useCycle();
  const { t } = useLanguage();

  if (cycles.length === 0) return null;

  // 'all' matches no cycle, so it shows the averages
  const selectedCycle = cycles.find(c => c.id === selectedCycleId);

  let cycleLengthText = '';
  let peakDayText = '---';
  let lutealPhaseText = '0 days';
  let intercourseCount = 0;

  if (selectedCycle) {
    const obs = selectedCycle.observations;
    const totalDays = obs.length;
    const peakObs = obs.find(o => o.isPeakDay);
    const lutealDays = peakObs ? obs.filter(o => o.cycleDay > peakObs.cycleDay).length : 0;
    cycleLengthText = `${totalDays} ${t.stats.days}`;
    peakDayText = peakObs ? `CD ${peakObs.cycleDay} (${peakObs.date})` : '---';
    lutealPhaseText = `${lutealDays} ${t.stats.days}`;
    intercourseCount = obs.filter(o => o.intercourse).length;
  } else {
    // All Cycles view
    cycleLengthText = `${(observations.length / cycles.length).toFixed(1)} ${t.stats.days} (avg)`;

    // Cycles are ordered newest first, so the first peak is the latest one
    const peaks = cycles.flatMap(c => {
      const peakObs = c.observations.find(o => o.isPeakDay);
      return peakObs ? [{ peakObs, cycle: c }] : [];
    });
    const [latest] = peaks;
    if (latest) {
      peakDayText = `CD ${latest.peakObs.cycleDay} (${latest.peakObs.date})`;
      // Average luteal phase across cycles with a peak day
      const totalLuteal = peaks.reduce(
        (acc, { peakObs, cycle }) =>
          acc + cycle.observations.filter(o => o.cycleDay > peakObs.cycleDay).length,
        0
      );
      lutealPhaseText = `${(totalLuteal / peaks.length).toFixed(1)} ${t.stats.days} (avg)`;
    } else {
      lutealPhaseText = `0 ${t.stats.days}`;
    }

    intercourseCount = observations.filter(o => o.intercourse).length;
  }

  return (
    <div className="stats-dashboard">
      <div className="stat-card" title={`${t.stats.cycleLength}: ${cycleLengthText}`}>
        <div className="stat-icon icon-indigo">
          <Calendar size={20} />
        </div>
        <div className="stat-content">
          <span className="stat-label" title={t.stats.cycleLength}>
            {t.stats.cycleLength}
          </span>
          <span className="stat-value" title={cycleLengthText}>
            {cycleLengthText}
          </span>
        </div>
      </div>

      <div className="stat-card" title={`${t.stats.peakDay}: ${peakDayText}`}>
        <div className="stat-icon icon-rose">
          <Flame size={20} />
        </div>
        <div className="stat-content">
          <span className="stat-label" title={t.stats.peakDay}>
            {t.stats.peakDay}
          </span>
          <span className="stat-value" title={peakDayText}>
            {peakDayText}
          </span>
        </div>
      </div>

      <div className="stat-card" title={`${t.stats.lutealPhase}: ${lutealPhaseText}`}>
        <div className="stat-icon icon-emerald">
          <Activity size={20} />
        </div>
        <div className="stat-content">
          <span className="stat-label" title={t.stats.lutealPhase}>
            {t.stats.lutealPhase}
          </span>
          <span className="stat-value" title={lutealPhaseText}>
            {lutealPhaseText}
          </span>
        </div>
      </div>

      <div className="stat-card" title={`${t.stats.intercourseCount}: ${intercourseCount}`}>
        <div className="stat-icon icon-amber">
          <Heart size={20} />
        </div>
        <div className="stat-content">
          <span className="stat-label" title={t.stats.intercourseCount}>
            {t.stats.intercourseCount}
          </span>
          <span className="stat-value" title={String(intercourseCount)}>
            {intercourseCount}
          </span>
        </div>
      </div>
    </div>
  );
};
