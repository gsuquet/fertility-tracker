/** The alert of a sync action. See docs/reference/screens/settings.md#sign-in-of-cloudflare-access. */
import type React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { signInAgain } from '../utils/signIn';

/** The text of the failure, with role alert. An expired sign-in also has **Reload**. */
export const SyncAlert: React.FC<{ text: string }> = ({ text }) => {
  const { t } = useLanguage();
  return (
    <p className="settings-alert" role="alert">
      {text}
      {text === t.sync.signIn && (
        <>
          {' '}
          <button
            type="button"
            className="btn btn-secondary settings-alert-button"
            onClick={signInAgain}
          >
            {t.sync.reload}
          </button>
        </>
      )}
    </p>
  );
};
