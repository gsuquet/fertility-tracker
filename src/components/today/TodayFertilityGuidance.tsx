import type React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { StampType } from '../../types/crms';
import { StampBadge } from '../StampBadge';
import { fertilityGuidance } from './fertilityGuidance';
import { AlertCircle, Check } from 'lucide-react';

interface TodayFertilityGuidanceProps {
  stamp: StampType;
  currentCode: string;
  /** No bleeding, mucus or frequency code: the empty stamp and no fertility text. */
  isEmpty: boolean;
  isManualPeak: boolean;
  intercourse: boolean;
  /** banner: the phone of the Today page. sheet: the observation sheet, at each width. */
  variant: 'banner' | 'sheet' | 'card';
  /** The observation actions menu, at the right of the status. */
  menu: React.ReactNode;
  /** The card of the desktop Today page: true when the day is saved with no change */
  saved?: boolean | undefined;
}

export const TodayFertilityGuidance: React.FC<TodayFertilityGuidanceProps> = ({
  stamp,
  currentCode,
  isEmpty,
  isManualPeak,
  intercourse,
  variant,
  menu,
  saved = false,
}) => {
  const { t } = useLanguage();

  const getFertilityGuidance = () => fertilityGuidance(stamp, t);

  if (variant !== 'card') {
    // The banner of Today shows only on a phone. The banner of the sheet shows at each width.
    return (
      <div className="today-top-status-banner">
        <div className="status-stamp-hero">
          <StampBadge
            stamp={stamp}
            isPeakDay={isManualPeak}
            intercourse={intercourse}
            size="lg"
            isEmpty={isEmpty}
          />
          {/* Only the code and the sentence are read again, not the menu */}
          <div className="status-hero-info" aria-live="polite">
            <div className={isEmpty ? 'stamp-empty-text' : 'status-code-display'}>
              {isEmpty ? t.todayView.noObservation : currentCode}
            </div>
            {!isEmpty && <div className="status-hero-guidance">{getFertilityGuidance()}</div>}
          </div>
          {menu}
        </div>
      </div>
    );
  }

  // Desktop: the stamp of 40 px, the code, one sentence, the saved state and the menu
  return (
    <div className="today-status-card">
      <StampBadge
        stamp={stamp}
        isPeakDay={isManualPeak}
        intercourse={intercourse}
        size="lg"
        isEmpty={isEmpty}
      />
      <div className="status-card-info" aria-live="polite">
        <div className={isEmpty ? 'stamp-empty-text' : 'status-code-text'}>
          {isEmpty ? t.todayView.noObservation : currentCode}
        </div>
        {!isEmpty && <p className="status-card-guidance">{getFertilityGuidance()}</p>}
      </div>
      <span
        className={`status-card-saved badge badge-sm ${saved ? 'badge-success' : 'badge-warning'}`}
      >
        {saved ? (
          <Check size={14} aria-hidden="true" />
        ) : (
          <AlertCircle size={14} aria-hidden="true" />
        )}
        {saved ? t.todayView.loggedStatus : t.todayView.notLoggedStatus}
      </span>
      {menu}
    </div>
  );
};
