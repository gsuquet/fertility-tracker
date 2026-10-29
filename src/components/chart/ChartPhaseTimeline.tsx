import type React from 'react';
import type { Cycle, Observation } from '../../types/crms';
import type { TranslationSchema } from '../../i18n';
import { formatMessage } from '../../i18n';

interface ChartPhaseTimelineProps {
  cycle: Cycle;
  totalSlots: number;
  t: TranslationSchema;
}

type Phase = 'menses' | 'follicular' | 'peak' | 'post-peak' | 'luteal' | 'unknown';

/**
 * The phase of a day, as Analytics counts it: menses, then the follicular phase up to the Peak
 * Day, then the 3 days of the count, then the luteal phase. A cycle with no Peak Day has no count.
 * The Peak Day is the last day of the follicular phase, with its own name.
 */
const phaseOf = (obs: Observation | undefined, peakDay: number | undefined): Phase => {
  if (!obs) return 'unknown';
  if (obs.cycleDay === peakDay) return 'peak';
  const afterPeak = peakDay !== undefined && obs.cycleDay > peakDay;
  if (!afterPeak) return obs.stamp === 'RED' || obs.bleeding ? 'menses' : 'follicular';
  return obs.cycleDay - (peakDay as number) <= 3 ? 'post-peak' : 'luteal';
};

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
        const phase = phaseOf(byDay.get(dayNum), peakDay);
        const title =
          phase === 'unknown'
            ? formatMessage(t.common.dayNumber, { day: dayNum })
            : formatMessage(t.chartStrip.dayPhase, { day: dayNum, phase: names[phase] });
        return <span key={dayNum} className={`phase-segment phase-${phase}`} title={title} />;
      })}
    </div>
  );
};
