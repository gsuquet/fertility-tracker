import type React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { formatMessage } from '../../i18n';
import type { Observation } from '../../types/crms';

/** Details of a filled chart cell, shown while the cell is hovered or focused */
export const ChartCellPopover: React.FC<{ obs: Observation }> = ({ obs }) => {
  const { t } = useLanguage();
  return (
    <div className="cell-hover-popover">
      <div className="popover-header">
        <span className="popover-day">
          {formatMessage(t.common.dayNumber, { day: obs.cycleDay })}
        </span>
        <span className="popover-date">{obs.date}</span>
      </div>
      <div className="popover-body">
        <div className="popover-row">
          <span className="popover-label">{t.chartStrip.popoverCode}</span>
          <span className="popover-val highlight">{obs.codeString || '---'}</span>
        </div>
        {obs.bleeding && (
          <div className="popover-row">
            <span className="popover-label">{t.chartStrip.popoverBleeding}</span>
            <span className="popover-val">{obs.bleeding}</span>
          </div>
        )}
        {obs.stretch && (
          <div className="popover-row">
            <span className="popover-label">{t.chartStrip.popoverStretch}</span>
            <span className="popover-val">{obs.stretch}</span>
          </div>
        )}
        {obs.modifiers && obs.modifiers.length > 0 && (
          <div className="popover-row">
            <span className="popover-label">{t.chartStrip.popoverModifiers}</span>
            <span className="popover-val">{obs.modifiers.join(', ')}</span>
          </div>
        )}
        {obs.intercourse && (
          <div className="popover-row">
            <span className="popover-label">{t.chartStrip.popoverIntercourse}</span>
            <span className="popover-val intercourse-text">{t.chartStrip.popoverYes}</span>
          </div>
        )}
        {obs.notes && <div className="popover-notes">"{obs.notes}"</div>}
      </div>
      <div className="popover-footer">{t.chartStrip.clickToEdit}</div>
    </div>
  );
};
