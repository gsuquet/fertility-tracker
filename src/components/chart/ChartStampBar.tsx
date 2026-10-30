import type React from 'react';
import type { Cycle } from '../../types/crms';
import { showsEmptyStamp } from '../../domain/stampCalculator';
import type { TranslationSchema } from '../../i18n';
import { formatMessage } from '../../i18n';

interface ChartStampBarProps {
  cycle: Cycle;
  totalSlots: number;
  t: TranslationSchema;
}

/**
 * The stamp bar of a cycle: one segment for each day, in the color of the stamp of its day card,
 * over the full width of the card
 */
export const ChartStampBar: React.FC<ChartStampBarProps> = ({ cycle, totalSlots, t }) => {
  const byDay = new Map(cycle.observations.map(o => [o.cycleDay, o]));

  return (
    <div className="cycle-stamp-bar" aria-hidden="true">
      {Array.from({ length: totalSlots }, (_, idx) => {
        const dayNum = idx + 1;
        const obs = byDay.get(dayNum);
        // A day with no code shows the empty stamp on its card, so its segment is empty too
        const stamp = !obs ? 'none' : showsEmptyStamp(obs) ? 'empty' : obs.stamp.toLowerCase();
        const code = obs?.codeString || t.chartStrip.noCode;
        const title = obs
          ? formatMessage(t.chartStrip.dayCode, {
              day: dayNum,
              code: obs.isPeakDay ? `${code} · ${t.chartStrip.phasePeak}` : code,
            })
          : formatMessage(t.common.dayNumber, { day: dayNum });
        const peak = obs?.isPeakDay ? ' segment-peak' : '';
        return (
          <span key={dayNum} className={`stamp-segment segment-${stamp}${peak}`} title={title} />
        );
      })}
    </div>
  );
};
