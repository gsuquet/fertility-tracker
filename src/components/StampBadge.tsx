import React from 'react';
import { StampType } from '../types/crms';

interface StampBadgeProps {
  stamp: StampType;
  isPeakDay?: boolean;
  intercourse?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StampBadge: React.FC<StampBadgeProps> = ({
  stamp,
  isPeakDay = false,
  intercourse = false,
  size = 'md',
}) => {
  const isLightGreen = stamp.startsWith('LIGHT_GREEN');
  const postPeakNumber = stamp.endsWith('1')
    ? '1'
    : stamp.endsWith('2')
      ? '2'
      : stamp.endsWith('3')
        ? '3'
        : null;

  return (
    <div className={`stamp-badge-container stamp-${size}`}>
      <div className={`stamp-badge stamp-${stamp.toLowerCase()} ${isPeakDay ? 'stamp-peak' : ''}`}>
        {/* Baby icon for White and Light Green stamps */}
        {(stamp === 'WHITE_BABY' || isLightGreen) && (
          <div className="baby-icon-wrapper">
            <svg className="baby-svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11c0 2.2-1.8 4-4 4s-4-1.8-4-4V9.5C4.8 8.8 4 7.5 4 6a4 4 0 0 1 4-4h4zm0 2a2 2 0 0 0-2 2v1h4V6a2 2 0 0 0-2-2zM8 17h8a1 1 0 0 1 1 1v1a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3v-1a1 1 0 0 1 1-1z" />
            </svg>
            {postPeakNumber && <span className="post-peak-number">{postPeakNumber}</span>}
          </div>
        )}

        {/* Intercourse 'I' overlay directly on the stamp */}
        {intercourse && (
          <div className="intercourse-stamp-overlay" title="Intercourse (I)">
            I
          </div>
        )}

        {/* Peak Day 'P' indicator */}
        {isPeakDay && <div className="peak-indicator-badge">P</div>}
      </div>
    </div>
  );
};
