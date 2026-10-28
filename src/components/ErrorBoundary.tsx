import React, { useId } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Modal } from './Modal';

interface ErrorFallbackProps {
  /** In dialog mode, the alert shows in a modal dialog with a Close button that calls it. */
  onClose?: (() => void) | undefined;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const titleId = useId();
  const alert = (
    <div className="error-boundary" role="alert">
      <h2 id={titleId}>{t.errorBoundary.title}</h2>
      <p>{t.errorBoundary.message}</p>
      <div className="error-boundary-actions">
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          {t.errorBoundary.reload}
        </button>
        {onClose && (
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t.errorBoundary.close}
          </button>
        )}
      </div>
    </div>
  );
  if (!onClose) return alert;
  return (
    <Modal
      labelledBy={titleId}
      onClose={onClose}
      className="modal-overlay"
      panelClassName="modal-container error-boundary-dialog"
    >
      {alert}
    </Modal>
  );
};

interface ErrorBoundaryProps {
  /** Shows the alert in a modal dialog. Close, Escape and the backdrop call it. */
  onClose?: () => void;
  /** Called once when a child throws or a lazy chunk fails to load. */
  onError?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Shows a translated alert with a reload button when a child throws or a lazy chunk fails to load. */
export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<ErrorBoundaryProps>,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch() {
    this.props.onError?.();
  }

  override render() {
    return this.state.hasError ? (
      <ErrorFallback onClose={this.props.onClose} />
    ) : (
      this.props.children
    );
  }
}
