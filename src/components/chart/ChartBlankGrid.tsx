import type React from 'react';
import { Sparkles } from 'lucide-react';
import type { TranslationSchema } from '../../i18n';
import { addDays, getTodayStr } from '../../utils/dateUtils';
import { ChartBlankCell } from './ChartCell';

interface ChartBlankGridProps {
  t: TranslationSchema;
  onOpenDay: (date: string, dayNum: number) => void;
}

/** 35-day paper grid that starts today, shown before the first observation */
export const ChartBlankGrid: React.FC<ChartBlankGridProps> = ({ t, onOpenDay }) => {
  const todayStr = getTodayStr();
  return (
    <div className="chart-row-container paper-theme">
      <div className="chart-row-header flex-header">
        <span className="cycle-title-badge">
          {t.chartStrip.cycleBadge} 1 {t.chartStrip.blankDays}
        </span>
        <span className="cycle-helper-hint">
          <Sparkles size={14} className="hint-icon" /> {t.chartStrip.blankHint}
        </span>
      </div>

      <div className="chart-row-scroll">
        <div className="chart-row-strip paper-grid-strip">
          {Array.from({ length: 35 }).map((_, idx) => (
            <ChartBlankCell
              key={idx}
              dayNum={idx + 1}
              dateStr={addDays(todayStr, idx)}
              isToday={idx === 0}
              addLabel={t.chartStrip.addDay}
              onOpen={onOpenDay}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
