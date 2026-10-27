import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const ErrorFallback: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="error-boundary" role="alert">
      <h2>{t.errorBoundary.title}</h2>
      <p>{t.errorBoundary.message}</p>
      <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
        {t.errorBoundary.reload}
      </button>
    </div>
  );
};

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Shows a translated alert with a reload button when a child throws or a lazy chunk fails to load. */
export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override render() {
    return this.state.hasError ? <ErrorFallback /> : this.props.children;
  }
}
