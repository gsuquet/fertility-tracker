import type React from 'react';
import { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useMediaQuery } from '../../hooks/useMediaQuery';

/** The phone layout of the shell: the top bar and the bottom bar (RFC 0002) */
export const PHONE_QUERY = '(max-width: 640px)';

/** The element of the top bar that holds the controls of the page, on a phone */
const TopBarContext = createContext<HTMLElement | null>(null);

export const TopBarProvider = TopBarContext.Provider;

/** True when the page controls go in the top bar: on a phone, when the top bar exists */
export const useInTopBar = () => {
  const slot = useContext(TopBarContext);
  const isPhone = useMediaQuery(PHONE_QUERY);
  return isPhone && slot ? slot : null;
};

/** Shows its children in the top bar on a phone, and in place on a wider screen */
export const InTopBar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const slot = useInTopBar();
  return slot ? createPortal(children, slot) : children;
};

interface PageTitleProps {
  title: string;
  /** The short title that shows in the top bar of a phone. Without it, the h1 is for screen readers only. */
  phoneTitle?: string;
}

/** The one h1 of a page */
export const PageTitle: React.FC<PageTitleProps> = ({ title, phoneTitle }) => {
  const slot = useInTopBar();
  if (slot && phoneTitle) {
    return createPortal(<h1 className="top-bar-title">{phoneTitle}</h1>, slot);
  }
  return <h1 className="sr-only">{title}</h1>;
};
