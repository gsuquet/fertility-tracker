/** The invitation link of the sync: `#invite=<id>.<secret>`. See docs/reference/screens/settings.md#join-dialog. */
import { KEPT_INVITE_KEY } from './signIn';

/** The fragment that the join dialog kept during a sign-in, or null. It removes it. */
function takeKeptFragment(): string | null {
  try {
    const kept = sessionStorage.getItem(KEPT_INVITE_KEY);
    sessionStorage.removeItem(KEPT_INVITE_KEY);
    return kept?.startsWith('#invite=') ? kept : null;
  } catch {
    return null;
  }
}

/**
 * The invitation fragment of the address, or null. It removes the fragment from the address at
 * once, so that the history and a shared address do not keep the secret.
 */
export function takeInviteFragment(): string | null {
  const { hash, pathname, search } = window.location;
  if (!hash.startsWith('#invite=')) return takeKeptFragment();
  window.history.replaceState(window.history.state, '', `${pathname}${search}`);
  return hash;
}
