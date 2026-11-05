/**
 * The new sign-in of Cloudflare Access. See docs/reference/screens/settings.md#sign-in-of-cloudflare-access.
 */

/** The path of the sign-in. The service worker gets it from the network, not from its app shell. */
export const SIGN_IN_PATH = 'sign-in';

/** Goes to the sign-in path. Access then shows its sign-in page, and opens the path again after it. */
export function signInAgain(): void {
  window.location.assign(new URL(`./${SIGN_IN_PATH}`, window.location.href).href);
}

/** Changes the address of the sign-in path to the app address, so that a reload does not go to it. */
export function leaveSignInPath(): void {
  const { href, pathname, search, hash } = window.location;
  if (!pathname.endsWith(`/${SIGN_IN_PATH}`)) return;
  const app = new URL('./', href).pathname;
  window.history.replaceState(window.history.state, '', `${app}${search}${hash}`);
}
