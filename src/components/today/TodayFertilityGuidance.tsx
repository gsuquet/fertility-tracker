import type React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { StampType } from '../../types/crms';
import { StampBadge } from '../StampBadge';
import { Info, Sparkles } from 'lucide-react';

interface TodayFertilityGuidanceProps {
  stamp: StampType;
  currentCode: string;
  isManualPeak: boolean;
  intercourse: boolean;
  variant: 'banner' | 'card';
}

export const TodayFertilityGuidance: React.FC<TodayFertilityGuidanceProps> = ({
  stamp,
  currentCode,
  isManualPeak,
  intercourse,
  variant,
}) => {
  const { t } = useLanguage();
  // A day with no code is not a dry day: no stamp color and no fertility text
  const isEmpty = !currentCode;

  const getFertilityGuidance = () => {
    switch (stamp) {
      case 'RED':
        return t.todayView.guidance.red;
      case 'WHITE_BABY':
        return t.todayView.guidance.whiteBaby;
      case 'LIGHT_GREEN_BABY_1':
      case 'LIGHT_GREEN_BABY_2':
      case 'LIGHT_GREEN_BABY_3':
        return t.todayView.guidance.postPeak;
      default:
        return t.todayView.guidance.dry;
    }
  };

  if (variant === 'banner') {
    return (
      <div className="today-top-status-banner mobile-only-stamp-banner">
        <div className="status-stamp-hero">
          <StampBadge
            stamp={stamp}
            isPeakDay={isManualPeak}
            intercourse={intercourse}
            size="lg"
            isEmpty={isEmpty}
          />
          <div className="status-hero-info">
            <div className={isEmpty ? 'stamp-empty-text' : 'status-code-display'}>
              {currentCode || t.todayView.noObservation}
            </div>
            {!isEmpty && (
              <div className="status-hero-guidance">
                <Info size={15} className="guidance-icon" />
                <span>{getFertilityGuidance()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="today-status-card desktop-only-stamp-card">
      <div className="status-card-header">
        <Sparkles size={18} className="status-header-icon" />
        <h3>{t.labels.stampPreview}</h3>
      </div>

      <div className="status-stamp-wrapper">
        <StampBadge
          stamp={stamp}
          isPeakDay={isManualPeak}
          intercourse={intercourse}
          size="lg"
          isEmpty={isEmpty}
        />
        <div className={isEmpty ? 'stamp-empty-text' : 'status-code-text'}>
          {currentCode || t.todayView.noObservation}
        </div>
      </div>

      {!isEmpty && (
        <div className="status-guidance-box">
          <Info size={16} className="guidance-icon" />
          <p>{getFertilityGuidance()}</p>
        </div>
      )}
    </div>
  );
};
