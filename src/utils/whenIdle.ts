/** The longest wait for an idle moment, in milliseconds. */
const IDLE_TIMEOUT_MS = 2000;

/**
 * Calls `callback` when the browser is idle, or after `IDLE_TIMEOUT_MS`. A browser without `requestIdleCallback`
 * (for example Safari) uses a timer. Returns a function that cancels the call.
 */
export const whenIdle = (callback: () => void): (() => void) => {
  if (typeof window.requestIdleCallback === 'function') {
    // The timeout makes the call occur also on a page that is never idle
    const id = window.requestIdleCallback(() => callback(), { timeout: IDLE_TIMEOUT_MS });
    return () => window.cancelIdleCallback(id);
  }
  const timer = setTimeout(callback, 1);
  return () => clearTimeout(timer);
};
