import type React from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { StampType } from '../types/crms';
import { BabyIcon } from './icons/BabyIcon';

interface StampBadgeProps {
  stamp: StampType;
  isPeakDay?: boolean | undefined;
  intercourse?: boolean | undefined;
  size?: 'sm' | 'md' | 'lg' | undefined;
  /** A day with no code: a dashed empty square instead of the stamp. */
  isEmpty?: boolean | undefined;
  /** False: no Post-Peak number on the baby. The calendar shows the marks under the code. */
  showCount?: boolean | undefined;
}

export const StampBadge: React.FC<StampBadgeProps> = ({
  stamp,
  isPeakDay = false,
  intercourse = false,
  size = 'md',
  isEmpty = false,
  showCount = true,
}) => {
  const { t } = useLanguage();
  const isLightGreen = !isEmpty && stamp.startsWith('LIGHT_GREEN');
  const stampClass = isEmpty ? 'stamp-empty' : `stamp-${stamp.toLowerCase()}`;
  const postPeakNumber = !showCount
    ? null
    : stamp.endsWith('1')
      ? '1'
      : stamp.endsWith('2')
        ? '2'
        : stamp.endsWith('3')
          ? '3'
          : null;

  return (
    <div className={`stamp-badge-container stamp-${size}`}>
      <div className={`stamp-badge ${stampClass} ${isPeakDay ? 'stamp-peak' : ''}`}>
        {/* Baby icon for White and Light Green stamps */}
        {((!isEmpty && stamp === 'WHITE_BABY') || isLightGreen) && (
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
