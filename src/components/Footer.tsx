import type React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Tag, BookOpen } from 'lucide-react';
import { getAppVersion } from '../domain/appVersion';
import { Copyright, LegalDisclaimers } from './LegalNotice';

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
        <LegalDisclaimers />
        <div className="footer-copyright">
          <Copyright />
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
