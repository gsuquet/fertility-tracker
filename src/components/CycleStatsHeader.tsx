import React from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { Calendar, Flame, Heart, Activity } from 'lucide-react';

export const CycleStatsHeader: React.FC = () => {
  const { observations, cycles, selectedCycleId } = useCycle();
  const { t } = useLanguage();

  if (cycles.length === 0) return null;

  const isAll = selectedCycleId === 'all';
  const selectedCycle = cycles.find(c => c.id === selectedCycleId);

  let cycleLengthText = '';
  let peakDayText = '---';
  let lutealPhaseText = '0 days';
  let intercourseCount = 0;

  if (!isAll && selectedCycle) {
    const obs = selectedCycle.observations;
    const totalDays = obs.length;
    const peakObs = obs.find(o => o.isPeakDay);
    let lutealDays = 0;
    if (peakObs) {
      lutealDays = obs.filter(o => o.cycleDay > peakObs.cycleDay).length;
    }
    cycleLengthText = `${totalDays} ${t.stats.days}`;
    peakDayText = peakObs ? `CD ${peakObs.cycleDay} (${peakObs.date})` : '---';
    lutealPhaseText = `${lutealDays} ${t.stats.days}`;
    intercourseCount = obs.filter(o => o.intercourse).length;
  } else {
    // All Cycles view
    const totalCycles = cycles.length;
    const avgLength = totalCycles > 0 ? (observations.length / totalCycles).toFixed(1) : '0';
    cycleLengthText = `${avgLength} ${t.stats.days} (avg)`;

    // Find latest peak day across cycles
    const latestPeakCycle = cycles.find(c => c.observations.some(o => o.isPeakDay));
    if (latestPeakCycle) {
      const peakObs = latestPeakCycle.observations.find(o => o.isPeakDay);
      if (peakObs) {
        peakDayText = `CD ${peakObs.cycleDay} (${peakObs.date})`;
      }
    }

    // Average luteal phase across cycles with a peak day
    const cyclesWithPeak = cycles.filter(c => c.observations.some(o => o.isPeakDay));
    if (cyclesWithPeak.length > 0) {
      const totalLuteal = cyclesWithPeak.reduce((acc, c) => {
        const p = c.observations.find(o => o.isPeakDay)!;
        return acc + c.observations.filter(o => o.cycleDay > p.cycleDay).length;
      }, 0);
      const avgLuteal = (totalLuteal / cyclesWithPeak.length).toFixed(1);
      lutealPhaseText = `${avgLuteal} ${t.stats.days} (avg)`;
    } else {
      lutealPhaseText = `0 ${t.stats.days}`;
    }

    intercourseCount = observations.filter(o => o.intercourse).length;
  }

  return (
    <div className="stats-dashboard">
      <div className="stat-card">
        <div className="stat-icon icon-indigo">
          <Calendar size={20} />
        </div>
        <div className="stat-content">
          <span className="stat-label">{t.stats.cycleLength}</span>
          <span className="stat-value">{cycleLengthText}</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon icon-rose">
          <Flame size={20} />
        </div>
        <div className="stat-content">
          <span className="stat-label">{t.stats.peakDay}</span>
          <span className="stat-value">{peakDayText}</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon icon-emerald">
          <Activity size={20} />
        </div>
        <div className="stat-content">
          <span className="stat-label">{t.stats.lutealPhase}</span>
          <span className="stat-value">{lutealPhaseText}</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon icon-amber">
          <Heart size={20} />
        </div>
        <div className="stat-content">
          <span className="stat-label">{t.stats.intercourseCount}</span>
          <span className="stat-value">{intercourseCount}</span>
        </div>
      </div>
    </div>
  );
};
