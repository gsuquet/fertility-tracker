import React, { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, Calendar } from 'lucide-react';

interface CycleStartModalProps {
  isOpen: boolean;
  date: string;
  onConfirm: (isCycleStart: boolean) => void;
  onCancel: () => void;
}

export const CycleStartModal: React.FC<CycleStartModalProps> = ({
  isOpen,
  date,
  onConfirm,
  onCancel,
}) => {
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay cycle-start-modal-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cycle-start-modal-title"
    >
      <div
        className="modal-container cycle-start-modal-container"
        onClick={e => e.stopPropagation()}
      >
        <div className="cycle-start-header">
          <div className="cycle-start-header-left">
            <div className="cycle-start-icon-box">
              <Calendar size={22} />
            </div>
            <div>
              <h2 id="cycle-start-modal-title" className="cycle-start-title">
                {t.cycleStartModal?.title || 'New Cycle Start?'}
              </h2>
              <span className="cycle-start-date">{date}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="btn-icon"
            aria-label={t.actions?.close || 'Close'}
          >
            <X size={20} />
          </button>
        </div>

        <div className="cycle-start-body">
          <p className="cycle-start-question">
            {t.cycleStartModal?.question || 'Is this bleeding day the start of a new cycle?'}
          </p>
          <p className="cycle-start-description">
            {t.cycleStartModal?.description ||
              'This is the first bleeding day following non-bleeding days. You can choose whether this starts a new cycle or continues your current cycle.'}
          </p>
        </div>

        <div className="cycle-start-actions">
          <button type="button" onClick={() => onConfirm(true)} className="btn btn-primary btn-lg">
            {t.cycleStartModal?.yesBtn || 'Yes, Start New Cycle'}
          </button>

          <button
            type="button"
            onClick={() => onConfirm(false)}
            className="btn btn-secondary btn-lg"
          >
            {t.cycleStartModal?.noBtn || 'No, Continue Current Cycle'}
          </button>

          <button type="button" onClick={onCancel} className="cycle-start-cancel-link">
            {t.cycleStartModal?.cancelBtn || 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
