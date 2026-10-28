import type React from 'react';
import type { TranslationSchema } from '../../i18n';
import { BabyIcon } from '../icons/BabyIcon';

/** Stamp legend key of the paper chart */
export const ChartLegend: React.FC<{ t: TranslationSchema }> = ({ t }) => (
  <div className="chart-strip-legend paper-legend">
    <div className="legend-title">{t.chartStrip.legendTitle}</div>
    <div className="legend-items">
      <div className="legend-item">
        <span className="legend-badge stamp-red"></span>
        <span className="legend-label">{t.chartStrip.legendMenses}</span>
      </div>
      <div className="legend-item">
        <span className="legend-badge stamp-dark_green"></span>
        <span className="legend-label">{t.chartStrip.legendDry}</span>
      </div>
      <div className="legend-item">
        <span className="legend-badge stamp-white_baby">
          <BabyIcon />
        </span>
        <span className="legend-label">{t.chartStrip.legendFertile}</span>
      </div>
      <div className="legend-item">
        <span className="legend-badge stamp-light_green_baby_1">
          <BabyIcon />
          <span className="num">1,2,3</span>
        </span>
        <span className="legend-label">{t.chartStrip.legendPostPeak}</span>
      </div>
      <div className="legend-item">
        <span className="legend-badge peak-legend">P</span>
        <span className="legend-label">{t.chartStrip.legendPeakDay}</span>
      </div>
      <div className="legend-item">
        <span className="legend-badge intercourse-legend">I</span>
        <span className="legend-label">{t.labels.intercourse}</span>
      </div>
    </div>
  </div>
);
