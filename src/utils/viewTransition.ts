import { flushSync } from 'react-dom';

/** `forward` goes to a page on the right, `back` to a page on the left. */
export type TransitionDirection = 'forward' | 'back';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** The newest transition. Only it removes the direction when it ends. */
let current: ViewTransition | null = null;

/**
 * Runs `update` in a view transition, so the browser animates from the old screen to the new one.
 * React renders the update at once in it (`flushSync`). The direction goes on the root element as
 * `data-page-transition`, for the CSS of the slide. Without the API, or with reduced motion,
 * `update` runs at once without an animation.
 */
export const runViewTransition = (update: () => void, direction: TransitionDirection): void => {
  if (
    typeof document.startViewTransition !== 'function' ||
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  ) {
    update();
    return;
  }
  const root = document.documentElement;
  root.dataset.pageTransition = direction;
  const transition = document.startViewTransition(() => flushSync(update));
  current = transition;
  const end = () => {
    if (current !== transition) return;
    current = null;
    delete root.dataset.pageTransition;
  };
  // A skipped transition (for example, in a hidden tab) rejects `ready`: that is not an error
  transition.ready.catch(() => {});
  transition.finished.then(end, end);
};
