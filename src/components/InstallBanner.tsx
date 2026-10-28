import type React from 'react';
import { useState } from 'react';
import { X } from 'lucide-react';
import { useCycleData } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { useInstallMode } from '../pwa/installPrompt';
import { useUpdateReady } from '../pwa/registerServiceWorker';
import { readStorage, writeStorage } from '../utils/storage';
import { STORAGE_INSTALL_BANNER_CLOSED_KEY } from '../utils/storageKeys';
import { useTopDialog } from './Modal';

/** The banner shows only after the app has proved useful. */
export const INSTALL_BANNER_MIN_OBSERVATIONS = 3;

interface InstallBannerProps {
  /** Shows the install prompt of the browser, or the install guide on iOS. */
  onInstall: () => void;
}

/**
 * A one-time install offer above the page buttons. It is not a dialog: the page stays usable.
 * After its close button or Install, it never shows again. The menu entry stays.
 */
export const InstallBanner: React.FC<InstallBannerProps> = ({ onInstall }) => {
  const { t } = useLanguage();
  const { observations, undoChange } = useCycleData();
  const installMode = useInstallMode();
  const updateReady = useUpdateReady();
  const topDialog = useTopDialog();
  const [closed, setClosed] = useState(
    () => readStorage(STORAGE_INSTALL_BANNER_CLOSED_KEY) !== null
  );

  if (
    closed ||
    installMode === null ||
    observations.length < INSTALL_BANNER_MIN_OBSERVATIONS ||
    topDialog !== null ||
    updateReady ||
    // The undo message has the same place
    undoChange !== null
  ) {
    return null;
  }

  const close = () => {
    writeStorage(STORAGE_INSTALL_BANNER_CLOSED_KEY, 'true');
    setClosed(true);
  };

  return (
    <aside className="install-banner" aria-labelledby="install-banner-title">
      <img
        className="install-banner-icon"
        src={`${import.meta.env.BASE_URL}icons/icon-96.png`}
        alt=""
        width={40}
        height={40}
      />
      <div className="install-banner-text">
        <strong id="install-banner-title">{t.install.bannerTitle}</strong>
        <span>{t.install.bannerText}</span>
      </div>
      <button
        type="button"
        className="btn btn-primary install-banner-install"
        onClick={() => {
          close();
          onInstall();
        }}
      >
        {t.install.bannerInstall}
      </button>
      <button
        type="button"
        className="icon-button install-banner-close"
        onClick={close}
        aria-label={t.install.bannerClose}
        title={t.install.bannerClose}
      >
        <X size={18} />
      </button>
    </aside>
  );
};
