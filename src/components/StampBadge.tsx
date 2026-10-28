import type React from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { StampType } from '../types/crms';
import { BabyIcon } from './icons/BabyIcon';

interface StampBadgeProps {
  stamp: StampType;
  isPeakDay?: boolean | undefined;
  intercourse?: boolean | undefined;
  size?: 'sm' | 'md' | 'lg' | undefined;
}

export const StampBadge: React.FC<StampBadgeProps> = ({
  stamp,
  isPeakDay = false,
  intercourse = false,
  size = 'md',
}) => {
  const { t } = useLanguage();
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
            <BabyIcon />
            {postPeakNumber && <span className="post-peak-number">{postPeakNumber}</span>}
          </div>
        )}

        {/* Intercourse 'I' overlay directly on the stamp */}
        {intercourse && (
          <div className="intercourse-stamp-overlay" title={t.labels.intercourse}>
            I
          </div>
        )}

        {/* Peak Day 'P' indicator */}
        {isPeakDay && <div className="peak-indicator-badge">P</div>}
      </div>
    </div>
  );
};
