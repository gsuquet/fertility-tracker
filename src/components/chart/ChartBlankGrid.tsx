import type React from 'react';
import type { TranslationSchema } from '../../i18n';
import { addDays, getTodayStr } from '../../utils/dateUtils';
import { ChartEmptyCell } from './ChartCell';

interface ChartBlankGridProps {
  t: TranslationSchema;
  onOpenDay: (date: string, dayNum: number) => void;
}

/** 35-day paper grid that starts today, shown before the first observation */
export const ChartBlankGrid: React.FC<ChartBlankGridProps> = ({ t, onOpenDay }) => {
  const todayStr = getTodayStr();
  return (
    <section className="chart-row-container" aria-label={`${t.chartStrip.cycleBadge} 1`}>
      <div className="cycle-line">
        <h3 className="cycle-line-title">
          {t.chartStrip.cycleBadge} 1 {t.chartStrip.blankDays}
        </h3>
      </div>
      <p className="cycle-helper-hint">{t.chartStrip.blankHint}</p>

      <div className="chart-row-scroll">
        <div className="chart-row-strip">
          {Array.from({ length: 35 }, (_, idx) => (
            <ChartEmptyCell
              key={addDays(todayStr, idx)}
              dayNum={idx + 1}
              dateStr={addDays(todayStr, idx)}
              isToday={idx === 0}
              labelTemplate={t.chartStrip.blankCellLabel}
              onOpen={onOpenDay}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
