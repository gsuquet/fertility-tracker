/** The invitation link of the sync: `#invite=<id>.<secret>`. See docs/reference/screens/settings.md#join-dialog. */

/**
 * The invitation fragment of the address, or null. It removes the fragment from the address at
 * once, so that the history and a shared address do not keep the secret.
 */
export function takeInviteFragment(): string | null {
  const { hash, pathname, search } = window.location;
  if (!hash.startsWith('#invite=')) return null;
  window.history.replaceState(window.history.state, '', `${pathname}${search}`);
  return hash;
}
