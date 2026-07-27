import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ShieldAlert, Info } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

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
        </div>
      </div>
    </footer>
  );
};
