/**
 * Calls `callback` when the browser is idle. A browser without `requestIdleCallback`
 * (for example Safari) uses a timer. Returns a function that cancels the call.
 */
export const whenIdle = (callback: () => void): (() => void) => {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(() => callback());
    return () => window.cancelIdleCallback(id);
  }
  const timer = setTimeout(callback, 1);
  return () => clearTimeout(timer);
};
