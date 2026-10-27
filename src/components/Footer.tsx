import type React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ShieldAlert, Info, Tag, BookOpen } from 'lucide-react';
import { getAppVersion } from '../domain/appVersion';
import { formatMessage } from '../i18n';

interface FooterProps {
  onOpenVersion?: () => void;
  onOpenWelcome?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenVersion, onOpenWelcome }) => {
  const { t } = useLanguage();
  const appVersion = getAppVersion();

  return (
    <footer className="app-footer" role="contentinfo" aria-label={t.footer.label}>
      <div className="footer-container">
        <div className="footer-disclaimer-box">
          <div className="disclaimer-header">
            <ShieldAlert size={16} className="disclaimer-icon" aria-hidden="true" />
            <span className="disclaimer-title">{t.footer.legalTitle}</span>
          </div>
          <p className="disclaimer-text">
            {t.disclaimer.trademark} {t.disclaimer.nonAffiliation}
          </p>
          <div className="disclaimer-header medical-header">
            <Info size={16} className="disclaimer-icon" aria-hidden="true" />
            <span className="disclaimer-title">{t.footer.medicalTitle}</span>
          </div>
          <p className="disclaimer-text">{t.disclaimer.medical}</p>
        </div>
        <div className="footer-copyright">
          <span className="footer-copyright-text">
            {formatMessage(t.footer.copyright, { year: new Date().getFullYear() })}
          </span>
          <div className="footer-links">
            {onOpenWelcome && (
              <button
                type="button"
                className="footer-version-btn"
                onClick={onOpenWelcome}
                title={t.welcomeModal.title}
                aria-label={t.welcomeModal.title}
              >
                <BookOpen size={12} />
                <span>{t.footer.userGuide}</span>
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
      </div>
    </footer>
  );
};
