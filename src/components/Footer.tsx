import type React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { formatMessage } from '../i18n';
import { getAppVersion } from '../domain/appVersion';

interface FooterProps {
  /** Opens the version dialog on its release notes */
  onOpenVersion: () => void;
  /** Opens the version dialog at its full legal and medical notice */
  onOpenLegal: () => void;
}

/** The one line of the browser footer: "© 2026 Fertility Tracker · Legal · v1.37.0" (RFC 0002) */
export const Footer: React.FC<FooterProps> = ({ onOpenVersion, onOpenLegal }) => {
  const { t } = useLanguage();

  return (
    <footer className="app-footer" role="contentinfo" aria-label={t.footer.label}>
      <span>{formatMessage(t.footer.shortCopyright, { year: new Date().getFullYear() })}</span>
      <span aria-hidden="true">·</span>
      <button type="button" className="footer-link" onClick={onOpenLegal}>
        {t.footer.legal}
      </button>
      <span aria-hidden="true">·</span>
      <button
        type="button"
        className="footer-link"
        onClick={onOpenVersion}
        title={t.versionTracker.title}
      >
        v{getAppVersion()}
      </button>
    </footer>
  );
};
