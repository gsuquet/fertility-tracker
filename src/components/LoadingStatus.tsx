import type React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface LoadingStatusProps {
  /** Classes of the status element, for example `sr-only` to hide it on the screen. */
  className: string;
}

/**
 * The `React.Suspense` fallback of a lazy page or dialog. It shows nothing on the screen,
 * but a screen reader announces the translated loading text.
 */
export const LoadingStatus: React.FC<LoadingStatusProps> = ({ className }) => {
  const { t } = useLanguage();
  return (
    <div className={className} role="status">
      <span className="sr-only">{t.common.loading}</span>
    </div>
  );
};
