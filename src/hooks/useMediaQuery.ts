import { useEffect, useState } from 'react';

/** The desktop layout of the design system rules (ADR 0011): 1024 px and more */
export const DESKTOP_QUERY = '(min-width: 1024px)';

/** The wide desktop of RFC 0002: 1360 px and more. Today adds the current cycle. */
export const WIDE_QUERY = '(min-width: 1360px)';

/** True while the media query matches. It changes with the window size. */
export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return matches;
};
