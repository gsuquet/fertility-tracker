import type React from 'react';
import { useState } from 'react';
import { BellDot } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  disableBadge,
  enableBadge,
  isBadgeSupported,
  needsNotificationPermission,
  useBadgeEnabled,
} from '../pwa/appBadge';

/**
 * The switch row of the app icon badge in Settings
 * (docs/reference/application-behavior.md#app-icon-badge). It shows only when the browser has the
 * Badging API. On Apple systems, it tells why the system asks for the permission for notifications.
 */
export const AppBadgeSetting: React.FC = () => {
  const { t } = useLanguage();
  const enabled = useBadgeEnabled();
  const [denied, setDenied] = useState(false);
  // While the system asks for the permission, a second tap does not ask again
  const [pending, setPending] = useState(false);
  if (!isBadgeSupported()) return null;

  const handleChange = async (on: boolean) => {
    setDenied(false);
    if (!on) {
      disableBadge();
      return;
    }
    setPending(true);
    setDenied((await enableBadge()) === 'denied');
    setPending(false);
  };

  return (
    <li>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={pending}
        className="settings-row"
        onClick={() => void handleChange(!enabled)}
        aria-labelledby="badge-setting-label"
        aria-describedby="badge-setting-hint"
      >
        <BellDot size={18} className="settings-row-icon" aria-hidden="true" />
        <span className="settings-row-text">
          <span id="badge-setting-label" className="settings-row-label">
            {t.appBadge.title}
          </span>
          <span id="badge-setting-hint" className="settings-row-detail">
            {t.appBadge.label}
            {needsNotificationPermission() && `. ${t.appBadge.iosPermission}`}
          </span>
        </span>
        <span className="obs-switch" aria-hidden="true" />
      </button>
      {denied && (
        <p className="settings-alert" role="alert">
          {t.appBadge.denied}
        </p>
      )}
    </li>
  );
};
