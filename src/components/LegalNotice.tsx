import type React from 'react';
import { ShieldAlert, Info } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { formatMessage } from '../i18n';

/** The trademark and medical texts. The footer and the version dialog show them. */
export const LegalDisclaimers: React.FC = () => {
  const { t } = useLanguage();
  return (
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
  );
};

/** The copyright line, with the current year. */
export const Copyright: React.FC = () => {
  const { t } = useLanguage();
  return (
    <span className="footer-copyright-text">
      {formatMessage(t.footer.copyright, { year: new Date().getFullYear() })}
    </span>
  );
};
