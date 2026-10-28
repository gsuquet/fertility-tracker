import type React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Tag, BookOpen, Smartphone, Keyboard } from 'lucide-react';
import { getAppVersion } from '../domain/appVersion';
import { Copyright, LegalDisclaimers } from './LegalNotice';

interface FooterProps {
  onOpenVersion?: () => void;
  onOpenWelcome?: () => void;
  onOpenShortcuts?: () => void;
  /** Installs the app. The footer has this entry on each screen width, also without space in the header. */
  onInstall?: (() => void) | undefined;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenVersion,
  onOpenWelcome,
  onOpenShortcuts,
  onInstall,
}) => {
  const { t } = useLanguage();
  const appVersion = getAppVersion();

  return (
    <footer className="app-footer" role="contentinfo" aria-label={t.footer.label}>
      <div className="footer-container">
        <LegalDisclaimers />
        <div className="footer-copyright">
          <Copyright />
          <div className="footer-links">
            {onInstall && (
              <button type="button" className="footer-version-btn" onClick={onInstall}>
                <Smartphone size={12} />
                <span>{t.install.menuEntry}</span>
              </button>
            )}
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
            {onOpenShortcuts && (
              <button type="button" className="footer-version-btn" onClick={onOpenShortcuts}>
                <Keyboard size={12} />
                <span>{t.shortcuts.title}</span>
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
