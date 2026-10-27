import type React from 'react';
import type { Cycle } from '../../types/crms';
import type { TranslationSchema } from '../../i18n';

interface ChartPhaseTimelineProps {
  cycle: Cycle;
  totalSlots: number;
  t: TranslationSchema;
}

/** Phase bar above the cells of a cycle row */
export const ChartPhaseTimeline: React.FC<ChartPhaseTimelineProps> = ({ cycle, totalSlots, t }) => (
  <div className="cycle-phase-bar-wrapper">
    <div className="cycle-phase-bar">
      {Array.from({ length: totalSlots }).map((_, idx) => {
        const dayNum = idx + 1;
        const obs = cycle.observations.find(o => o.cycleDay === dayNum);

        let phaseClass = 'phase-unknown';
        let title = `Day ${dayNum}`;

        if (obs) {
          if (obs.isPeakDay) {
            phaseClass = 'phase-peak';
            title = `Day ${dayNum}: ${t.chartStrip.phasePeak} (P)`;
          } else if (obs.stamp === 'RED' || obs.bleeding) {
            phaseClass = 'phase-menses';
            title = `Day ${dayNum}: ${t.chartStrip.phaseMenses}`;
          } else if (obs.stamp.startsWith('LIGHT_GREEN')) {
            phaseClass = 'phase-post-peak';
            title = `Day ${dayNum}: ${t.chartStrip.phasePostPeak}`;
          } else if (obs.stamp === 'WHITE_BABY') {
            phaseClass = 'phase-fertile';
            title = `Day ${dayNum}: Fertile Mucus`;
          } else {
            phaseClass = 'phase-infertile';
            title = `Day ${dayNum}: Dry / Infertile`;
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
