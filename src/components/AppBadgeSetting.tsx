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
 * The switch of the app icon badge (SPEC 5.16). It shows only when the browser has the Badging
 * API. On Apple systems, it tells why the system asks for the permission for notifications.
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
    <div className="system-info-card badge-setting">
      <h4 className="info-card-title">
        <BellDot size={16} />
        <span>{t.appBadge.title}</span>
      </h4>
      <label className="badge-setting-toggle">
        <input
          type="checkbox"
          checked={enabled}
          disabled={pending}
          onChange={e => void handleChange(e.target.checked)}
          aria-describedby="badge-setting-hint"
        />
        <span>{t.appBadge.label}</span>
      </label>
      <p id="badge-setting-hint" className="badge-setting-hint">
        {t.appBadge.hint}
        {needsNotificationPermission() && ` ${t.appBadge.iosPermission}`}
      </p>
      {denied && (
        <p className="badge-setting-denied" role="alert">
          {t.appBadge.denied}
        </p>
      )}
    </div>
  );
};
