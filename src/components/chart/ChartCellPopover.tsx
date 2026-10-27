import type React from 'react';
import type { Observation } from '../../types/crms';

/** Details of a filled chart cell, shown while the cell is hovered or focused */
export const ChartCellPopover: React.FC<{ obs: Observation }> = ({ obs }) => (
  <div className="cell-hover-popover">
    <div className="popover-header">
      <span className="popover-day">Day {obs.cycleDay}</span>
      <span className="popover-date">{obs.date}</span>
    </div>
    <div className="popover-body">
      <div className="popover-row">
        <span className="popover-label">Code:</span>
        <span className="popover-val highlight">{obs.codeString || '---'}</span>
      </div>
      {obs.bleeding && (
        <div className="popover-row">
          <span className="popover-label">Bleeding:</span>
          <span className="popover-val">{obs.bleeding}</span>
        </div>
      )}
      {obs.stretch && (
        <div className="popover-row">
          <span className="popover-label">Stretch:</span>
          <span className="popover-val">{obs.stretch}</span>
        </div>
      )}
      {obs.modifiers && obs.modifiers.length > 0 && (
        <div className="popover-row">
          <span className="popover-label">Modifiers:</span>
          <span className="popover-val">{obs.modifiers.join(', ')}</span>
        </div>
      )}
      {obs.intercourse && (
        <div className="popover-row">
          <span className="popover-label">Intercourse:</span>
          <span className="popover-val intercourse-text">Yes (I)</span>
        </div>
      )}
      {obs.notes && <div className="popover-notes">"{obs.notes}"</div>}
    </div>
    <div className="popover-footer">Click to edit</div>
  </div>
);
