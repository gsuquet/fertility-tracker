import type React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, Calendar } from 'lucide-react';
import { Modal } from './Modal';
import { useSheetDrag } from '../hooks/useSheetDrag';

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
  // On a phone, a drag down closes the dialog as the close button does
  const { handlers: dragHandlers, bodyRef } = useSheetDrag<HTMLDivElement>(onCancel, isOpen);

  if (!isOpen) return null;

  return (
    <Modal
      labelledBy="cycle-start-modal-title"
      onClose={onCancel}
      className="modal-overlay cycle-start-modal-overlay"
      panelClassName="modal-container cycle-start-modal-container"
    >
      <div className="sheet-handle" aria-hidden="true" {...dragHandlers} />
      <div className="cycle-start-header" {...dragHandlers}>
        <div className="cycle-start-header-left">
          <div className="cycle-start-icon-box">
            <Calendar size={22} />
          </div>
          <div>
            <h2 id="cycle-start-modal-title" className="cycle-start-title">
              {t.cycleStartModal.title}
            </h2>
            <span className="cycle-start-date">{date}</span>
          </div>
        </div>
        <button type="button" onClick={onCancel} className="btn-icon" aria-label={t.actions.close}>
          <X size={20} />
        </button>
      </div>

      <div className="cycle-start-body" ref={bodyRef}>
        <p className="cycle-start-question">{t.cycleStartModal.question}</p>
        <p className="cycle-start-description">{t.cycleStartModal.description}</p>
      </div>

      <div className="cycle-start-actions">
        <button type="button" onClick={() => onConfirm(true)} className="btn btn-primary btn-lg">
          {t.cycleStartModal.yesBtn}
        </button>

        <button type="button" onClick={() => onConfirm(false)} className="btn btn-secondary btn-lg">
          {t.cycleStartModal.noBtn}
        </button>

        <button type="button" onClick={onCancel} className="cycle-start-cancel-link">
          {t.cycleStartModal.cancelBtn}
        </button>
      </div>
    </Modal>
  );
};
