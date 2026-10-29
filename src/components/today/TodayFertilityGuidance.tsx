import type React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { formatMessage } from '../../i18n';
import type { StampType } from '../../types/crms';
import { StampBadge } from '../StampBadge';
import { Info, Sparkles } from 'lucide-react';

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
}

export const TodayFertilityGuidance: React.FC<TodayFertilityGuidanceProps> = ({
  stamp,
  currentCode,
  isEmpty,
  isManualPeak,
  intercourse,
  variant,
  menu,
}) => {
  const { t } = useLanguage();

  const getFertilityGuidance = () => {
    switch (stamp) {
      case 'RED':
        return t.todayView.guidance.red;
      case 'WHITE_BABY':
        return t.todayView.guidance.whiteBaby;
      case 'LIGHT_GREEN_BABY_1':
      case 'LIGHT_GREEN_BABY_2':
      case 'LIGHT_GREEN_BABY_3':
        return formatMessage(t.todayView.guidance.postPeak, { day: stamp.slice(-1) });
      default:
        return t.todayView.guidance.dry;
    }
  };

  if (variant !== 'card') {
    // The banner of Today shows only on a phone. The banner of the sheet shows at each width.
    const phoneOnly = variant === 'banner' ? 'mobile-only-stamp-banner' : '';
    return (
      <div className={`today-top-status-banner ${phoneOnly}`}>
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

  return (
    <div className="today-status-card desktop-only-stamp-card">
      <div className="status-card-header">
        <Sparkles size={18} className="status-header-icon" />
        <h3>{t.labels.stampPreview}</h3>
        {menu}
      </div>

      <div className="status-stamp-wrapper" aria-live="polite">
        <StampBadge
          stamp={stamp}
          isPeakDay={isManualPeak}
          intercourse={intercourse}
          size="lg"
          isEmpty={isEmpty}
        />
        <div className={isEmpty ? 'stamp-empty-text' : 'status-code-text'}>
          {isEmpty ? t.todayView.noObservation : currentCode}
        </div>
      </div>

      {!isEmpty && (
        <div className="status-guidance-box" aria-live="polite">
          <Info size={16} className="guidance-icon" />
          <p>{getFertilityGuidance()}</p>
        </div>
      )}
    </div>
  );
};
