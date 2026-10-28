import type React from 'react';
import { useState } from 'react';
import { Download, Info, X } from 'lucide-react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { downloadBackupFile } from '../utils/exportUtils';
import { Modal } from './Modal';
import { useSheetDrag } from '../hooks/useSheetDrag';

interface InstallGuideModalProps {
  onClose: () => void;
}

/**
 * The steps to install the app on iOS and iPadOS, where the browser has no install prompt.
 * The installed app does not share its storage with Safari, so the first step is a backup.
 */
export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ onClose }) => {
  const { t } = useLanguage();
  // On a phone, a drag down closes the dialog as the close button does
  const { handlers: dragHandlers, bodyRef } = useSheetDrag<HTMLElement>(onClose, true);
  const { exportDataJson, markBackedUp } = useCycle();
  const [backedUp, setBackedUp] = useState(false);

  const handleBackup = () => {
    downloadBackupFile(exportDataJson());
    markBackedUp();
    setBackedUp(true);
  };

  return (
    <Modal
      labelledBy="install-guide-title"
      describedBy="install-guide-note"
      onClose={onClose}
      className="modal-overlay"
      panelClassName="modal-container install-guide-container"
    >
      <div className="sheet-handle" aria-hidden="true" {...dragHandlers} />
      <div className="modal-header" {...dragHandlers}>
        <h2 id="install-guide-title">{t.install.guideTitle}</h2>
        <button
          type="button"
          className="icon-button close-modal-btn"
          onClick={onClose}
          aria-label={t.actions.close}
          title={t.actions.close}
        >
          <X size={20} />
        </button>
      </div>

      {/* The body scrolls on a small screen, so the keyboard can focus it */}
      <section
        ref={bodyRef}
        className="modal-body install-guide-body"
        aria-labelledby="install-guide-title"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: axe scrollable-region-focusable needs a focusable scrolling body
        tabIndex={0}
      >
        <p id="install-guide-note" className="install-guide-note">
          <Info size={18} aria-hidden="true" />
          <span>{t.install.guideNote}</span>
        </p>
        <ol className="install-guide-steps">
          <li>
            <div className="install-guide-backup">
              <span>{t.install.guideStepBackup}</span>
              <button type="button" className="btn btn-primary" onClick={handleBackup}>
                <Download size={16} aria-hidden="true" />
                <span>{t.install.guideBackupButton}</span>
              </button>
              {backedUp && (
                <span className="install-guide-done" role="status">
                  {t.install.guideBackupDone}
                </span>
              )}
            </div>
          </li>
          <li>{t.install.guideStepShare}</li>
          <li>{t.install.guideStepAdd}</li>
          <li>{t.install.guideStepRestore}</li>
        </ol>
      </section>

      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {t.actions.close}
        </button>
      </div>
    </Modal>
  );
};
