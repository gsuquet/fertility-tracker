import type React from 'react';
import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useHistoryLayer } from '../hooks/useHistoryLayer';

const FOCUSABLE = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled):not([type="hidden"]):not([hidden])',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** The focusable elements of a dialog, without those of a dialog inside it. */
const focusableIn = (dialog: HTMLDialogElement) =>
  Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    element => element.closest('dialog') === dialog
  );

/** The open dialogs, oldest first. Only the last one is not inert. */
let openDialogs: HTMLDialogElement[] = [];
const listeners = new Set<() => void>();

const setOpenDialogs = (dialogs: HTMLDialogElement[]) => {
  openDialogs = dialogs;
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getTopDialog = () => openDialogs[openDialogs.length - 1] ?? null;

/**
 * The open dialog on top, or null. `showModal()` makes all the page outside it inert,
 * so an element that must stay usable (the undo toast) renders in it with a portal.
 */
export const useTopDialog = (): HTMLDialogElement | null =>
  useSyncExternalStore(subscribe, getTopDialog);

interface ModalProps {
  /** The id of the dialog title. Give it or `label`. */
  labelledBy?: string;
  /** The accessible name when the dialog has no visible title. */
  label?: string;
  describedBy?: string;
  /** Escape, Back and a click on the backdrop call it. The parent then removes the modal. */
  onClose: () => void;
  /** The element that gets the focus when the dialog opens. Else the first focusable element. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Classes of the full-screen backdrop, for example `modal-overlay`. */
  className: string;
  /** Classes of the panel that holds the content, for example `modal-container`. */
  panelClassName: string;
  /** Inline styles of the panel, for example the place of a menu under its button. */
  panelStyle?: React.CSSProperties | undefined;
  children: React.ReactNode;
}

/**
 * The one accessible modal of the app: a native `<dialog>` opened with `showModal()`.
 * It sets the initial focus, traps Tab and Shift+Tab, closes on Escape and on the backdrop,
 * closes on Back, and moves the focus back to the opener when it closes.
 */
export const Modal: React.FC<ModalProps> = ({
  labelledBy,
  label,
  describedBy,
  onClose,
  initialFocusRef,
  className,
  panelClassName,
  panelStyle,
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // Back closes the top dialog, and a dialog that closes removes its history entry
  useHistoryLayer(onClose);

  useLayoutEffect(() => {
    const dialog = dialogRef.current as HTMLDialogElement;
    const opener = document.activeElement as HTMLElement;

    // A native listener, not a React one: it also gets the keys of the elements that another
    // React tree renders in the dialog with a portal, such as the undo toast.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const elements = focusableIn(dialog);
      const first = elements[0] ?? dialog;
      const last = elements[elements.length - 1] ?? dialog;
      const active = document.activeElement;
      if (active === dialog || active === (e.shiftKey ? first : last)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };

    // Only a click on the backdrop has the dialog itself as target
    const handleClick = (e: MouseEvent) => {
      if (e.target === dialog) onCloseRef.current();
    };

    // The browser puts the dialog in the top layer and makes the page under it inert
    dialog.showModal();
    dialog.addEventListener('keydown', handleKeyDown);
    dialog.addEventListener('click', handleClick);
    setOpenDialogs([...openDialogs, dialog]);
    (initialFocusRef?.current ?? focusableIn(dialog)[0] ?? dialog).focus();
    // At the start of the slide up of a sheet, the focused element is under the screen. The
    // browser scrolls the backdrop to show it, which cancels the slide, so undo that scroll.
    dialog.scrollTop = 0;
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      dialog.removeEventListener('click', handleClick);
      setOpenDialogs(openDialogs.filter(open => open !== dialog));
      // The page stays inert while the dialog is open, so close it before the opener takes the focus
      dialog.close();
      opener.focus();
    };
  }, [initialFocusRef]);

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`modal-dialog ${className}`}
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={label}
      aria-describedby={describedBy}
      tabIndex={-1}
      // The browser fires cancel for Escape when the focus is not in the dialog. React state
      // decides when the dialog closes, so the native cancel must not close it by itself.
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className={panelClassName} style={panelStyle}>
        {children}
      </div>
    </dialog>,
    document.body
  );
};
