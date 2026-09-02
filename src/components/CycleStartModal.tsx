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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="modal-container cycle-start-modal-container"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '1.75rem',
          margin: 'auto',
          borderRadius: '20px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--bg-surface-border, rgba(255, 255, 255, 0.15))',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--stamp-red, #ef4444)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={22} />
            </div>
            <div>
              <h2
                id="cycle-start-modal-title"
                style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}
              >
                {t.cycleStartModal?.title || 'New Cycle Start?'}
              </h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{date}</span>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="btn-icon"
            aria-label={t.actions?.close || 'Close'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem', lineHeight: '1.5' }}>
          <p
            style={{
              fontWeight: 600,
              fontSize: '1rem',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
            }}
          >
            {t.cycleStartModal?.question || 'Is this bleeding day the start of a new cycle?'}
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
            {t.cycleStartModal?.description ||
              'This is the first bleeding day following non-bleeding days. You can choose whether this starts a new cycle or continues your current cycle.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={() => onConfirm(true)}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.75rem 1rem',
              fontWeight: 600,
              fontSize: '0.95rem',
              backgroundColor: 'var(--accent-primary, #6366f1)',
              color: '#ffffff',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t.cycleStartModal?.yesBtn || 'Yes, Start New Cycle'}
          </button>

          <button
            onClick={() => onConfirm(false)}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.75rem 1rem',
              fontWeight: 600,
              fontSize: '0.95rem',
              backgroundColor: 'var(--bg-surface-hover, rgba(255, 255, 255, 0.08))',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              border: '1px solid var(--bg-surface-border, rgba(255, 255, 255, 0.15))',
              cursor: 'pointer',
            }}
          >
            {t.cycleStartModal?.noBtn || 'No, Continue Current Cycle'}
          </button>

          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              padding: '0.4rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              alignSelf: 'center',
              marginTop: '0.25rem',
            }}
          >
            {t.cycleStartModal?.cancelBtn || 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
