import React from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { Calendar, Flame, Heart, Activity } from 'lucide-react';

export const CycleStatsHeader: React.FC = () => {
  const { observations } = useCycle();
  const { t } = useLanguage();

  const totalDays = observations.length;
  const peakObs = observations.find(o => o.isPeakDay);

  let lutealPhaseDays = 0;
  if (peakObs) {
    lutealPhaseDays = observations.filter(o => o.cycleDay > peakObs.cycleDay).length;
  }

  const fertileMucusDays = observations.filter(o => o.stamp === 'WHITE_BABY').length;
  const intercourseCount = observations.filter(o => o.intercourse).length;

  return (
    <div className="stats-dashboard">
      <div className="stat-card">
        <div className="stat-icon icon-indigo">
          <Calendar size={20} />
        </div>
        <div className="stat-content">
          <span className="stat-label">{t.stats.cycleLength}</span>
          <span className="stat-value">{totalDays} {t.stats.days}</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon icon-rose">
          <Flame size={20} />
        </div>
        <div className="stat-content">
          <span className="stat-label">{t.stats.peakDay}</span>
          <span className="stat-value">{peakObs ? `CD ${peakObs.cycleDay} (${peakObs.date})` : '---'}</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon icon-emerald">
          <Activity size={20} />
        </div>
        <div className="stat-content">
          <span className="stat-label">{t.stats.lutealPhase}</span>
          <span className="stat-value">{lutealPhaseDays} {t.stats.days}</span>
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
