import type React from 'react';
import type { TranslationSchema } from '../../i18n';

const BABY_PATH =
  'M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11c0 2.2-1.8 4-4 4s-4-1.8-4-4V9.5C4.8 8.8 4 7.5 4 6a4 4 0 0 1 4-4h4zm0 2a2 2 0 0 0-2 2v1h4V6a2 2 0 0 0-2-2zM8 17h8a1 1 0 0 1 1 1v1a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3v-1a1 1 0 0 1 1-1z';

const BabyIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    aria-hidden="true"
    className="baby-svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
  >
    <path d={BABY_PATH} />
  </svg>
);

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
          <BabyIcon size={12} />
        </span>
        <span className="legend-label">{t.chartStrip.legendFertile}</span>
      </div>
      <div className="legend-item">
        <span className="legend-badge stamp-light_green_baby_1">
          <BabyIcon size={10} />
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
