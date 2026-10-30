import type React from 'react';
import { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useMediaQuery } from '../../hooks/useMediaQuery';

/** The phone layout of the shell: the top bar and the bottom bar (RFC 0002) */
export const PHONE_QUERY = '(max-width: 640px)';

/** The element of the top bar that holds the controls of the page */
const TopBarContext = createContext<HTMLElement | null>(null);

export const TopBarProvider = TopBarContext.Provider;

/** The element of the top bar for the page controls, or null when there is no top bar */
export const useInTopBar = () => useContext(TopBarContext);

/** Shows its children in the top bar, or in place when there is no top bar */
export const InTopBar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const slot = useInTopBar();
  return slot ? createPortal(children, slot) : children;
};

interface PageTitleProps {
  title: string;
  /** The short title that shows in the top bar of a phone. Without it, the h1 is for screen readers only. */
  phoneTitle?: string;
}

/** The one h1 of a page. A wider screen has the tabs, so the title is for screen readers only. */
export const PageTitle: React.FC<PageTitleProps> = ({ title, phoneTitle }) => {
  const slot = useInTopBar();
  const isPhone = useMediaQuery(PHONE_QUERY);
  if (slot && isPhone && phoneTitle) {
    return createPortal(<h1 className="top-bar-title">{phoneTitle}</h1>, slot);
  }
  return <h1 className="sr-only">{title}</h1>;
};
