import type React from 'react';
import type { Cycle } from '../../types/crms';
import type { DayPhase } from '../../domain/cyclePhases';
import { dayPhase } from '../../domain/cyclePhases';
import type { TranslationSchema } from '../../i18n';
import { formatMessage } from '../../i18n';

interface ChartPhaseTimelineProps {
  cycle: Cycle;
  totalSlots: number;
  t: TranslationSchema;
}

type Phase = DayPhase | 'unknown';

/** The phase bar of a cycle: one segment for each day, over the full width of the card */
export const ChartPhaseTimeline: React.FC<ChartPhaseTimelineProps> = ({ cycle, totalSlots, t }) => {
  const byDay = new Map(cycle.observations.map(o => [o.cycleDay, o]));
  const peakDay = cycle.observations.find(o => o.isPeakDay)?.cycleDay;
  const names: Record<Phase, string> = {
    menses: t.chartStrip.phaseMenses,
    follicular: t.chartStrip.phaseFollicular,
    peak: t.chartStrip.phasePeak,
    'post-peak': t.chartStrip.phasePostPeak,
    luteal: t.chartStrip.phaseLuteal,
    unknown: '',
  };

  return (
    <div className="cycle-phase-bar" aria-hidden="true">
      {Array.from({ length: totalSlots }, (_, idx) => {
        const dayNum = idx + 1;
        const obs = byDay.get(dayNum);
        const phase: Phase = obs ? dayPhase(obs, peakDay) : 'unknown';
        const title =
          phase === 'unknown'
            ? formatMessage(t.common.dayNumber, { day: dayNum })
            : formatMessage(t.chartStrip.dayPhase, { day: dayNum, phase: names[phase] });
        return <span key={dayNum} className={`phase-segment phase-${phase}`} title={title} />;
      })}
    </div>
  );
};
