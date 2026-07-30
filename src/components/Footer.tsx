import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ShieldAlert, Info, Tag, BookOpen } from 'lucide-react';
import { getAppVersion } from '../domain/versionTracker';

interface FooterProps {
  onOpenVersion?: () => void;
  onOpenWelcome?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenVersion, onOpenWelcome }) => {
  const { t } = useLanguage();
  const appVersion = getAppVersion();

  return (
    <footer className="app-footer" role="contentinfo" aria-label="Legal and Trademark Disclaimers">
      <div className="footer-container">
        <div className="footer-disclaimer-box">
          <div className="disclaimer-header">
            <ShieldAlert size={16} className="disclaimer-icon" aria-hidden="true" />
            <span className="disclaimer-title">Legal & Trademark Information</span>
          </div>
          <p className="disclaimer-text">
            {t.disclaimer.trademark} {t.disclaimer.nonAffiliation}
          </p>
          <div className="disclaimer-header medical-header">
            <Info size={16} className="disclaimer-icon" aria-hidden="true" />
            <span className="disclaimer-title">Medical Disclaimer</span>
          </div>
          <p className="disclaimer-text">
            {t.disclaimer.medical}
          </p>
        </div>
        <div className="footer-copyright">
          <span>&copy; {new Date().getFullYear()} Fertility Tracker &bull; Open Source Software</span>
          {onOpenWelcome && (
            <button
              type="button"
              className="footer-version-btn"
              onClick={onOpenWelcome}
              title={t.welcomeModal.title}
              aria-label={t.welcomeModal.title}
            >
              <BookOpen size={12} />
              <span>User Guide</span>
            </button>
          )}
          {onOpenVersion && (
            <button
              type="button"
              className="footer-version-btn"
              onClick={onOpenVersion}
              title={t.versionTracker.title}
              aria-label={t.versionTracker.title}
            >
              <Tag size={12} />
              <span>v{appVersion}</span>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};
