import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { StampType } from '../../types/crms';
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
  const { t, language } = useLanguage();

  const getFertilityGuidance = () => {
    switch (stamp) {
      case 'RED':
        return language === 'fr'
          ? 'Phase de règles. Considérez les jours de saignement comme potentiellement fertiles.'
          : 'Menses phase. Bleeding days are considered potentially fertile per Creighton protocols.';
      case 'WHITE_BABY':
        return language === 'fr'
          ? 'Glaire fertile (Symbole Bébé). Journée fertile. Suivez vos objectifs de fertilité.'
          : 'Fertile cervical mucus present (Baby Symbol). Fertile day. Follow your family planning intentions.';
      case 'LIGHT_GREEN_BABY_1':
      case 'LIGHT_GREEN_BABY_2':
      case 'LIGHT_GREEN_BABY_3':
        return language === 'fr'
          ? 'Compte Post-Sommet (+1, +2, +3). Fenêtre d hyper-fertilité post-ovulatoire.'
          : 'Post-Peak count (+1, +2, +3). High fertility transition window following Peak Day.';
      case 'DARK_GREEN':
      default:
        return language === 'fr'
          ? 'Journée sèche / infertile. Continuez l observation quotidienne.'
          : 'Dry / Infertile day based on observations. Continue standard daily monitoring.';
    }
  };

  if (variant === 'banner') {
    return (
      <div className="today-top-status-banner mobile-only-stamp-banner">
        <div className="status-stamp-hero">
          <StampBadge stamp={stamp} isPeakDay={isManualPeak} intercourse={intercourse} size="lg" />
          <div className="status-hero-info">
            <div className="status-code-display">{currentCode || '---'}</div>
            <div className="status-hero-guidance">
              <Info size={15} className="guidance-icon" />
              <span>{getFertilityGuidance()}</span>
            </div>
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
        <StampBadge stamp={stamp} isPeakDay={isManualPeak} intercourse={intercourse} size="lg" />
        <div className="status-code-text">{currentCode || '---'}</div>
      </div>

      <div className="status-guidance-box">
        <Info size={16} className="guidance-icon" />
        <p>{getFertilityGuidance()}</p>
      </div>
    </div>
  );
};
