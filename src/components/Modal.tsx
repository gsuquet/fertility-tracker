import type React from 'react';
import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

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

interface ModalProps {
  /** The id of the dialog title. Give it or `label`. */
  labelledBy?: string;
  /** The accessible name when the dialog has no visible title. */
  label?: string;
  describedBy?: string;
  /** Escape and a click on the backdrop call it. The parent then removes the modal. */
  onClose: () => void;
  /** The element that gets the focus when the dialog opens. Else the first focusable element. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Classes of the full-screen backdrop, for example `modal-overlay`. */
  className: string;
  /** Classes of the panel that holds the content, for example `modal-container`. */
  panelClassName: string;
  children: React.ReactNode;
}

/**
 * The one accessible modal of the app: a native `<dialog>` opened with `showModal()`.
 * It sets the initial focus, traps Tab and Shift+Tab, closes on Escape and on the backdrop,
 * and moves the focus back to the opener when it closes.
 */
export const Modal: React.FC<ModalProps> = ({
  labelledBy,
  label,
  describedBy,
  onClose,
  initialFocusRef,
  className,
  panelClassName,
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current as HTMLDialogElement;
    const opener = document.activeElement as HTMLElement;
    // The browser puts the dialog in the top layer and makes the page under it inert
    dialog.showModal();
    (initialFocusRef?.current ?? focusableIn(dialog)[0] ?? dialog).focus();
    return () => {
      // The page stays inert while the dialog is open, so close it before the opener takes the focus
      dialog.close();
      opener.focus();
    };
  }, [initialFocusRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    const dialog = e.currentTarget;
    // A dialog that opened over this one handles its own keys
    if ((e.target as Element).closest('dialog') !== dialog) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
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

  // Only a click on the backdrop has the dialog itself as target. Through the portal,
  // React sends the clicks to the components that render the modal, so stop them here.
  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    e.stopPropagation();
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`modal-dialog ${className}`}
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={label}
      aria-describedby={describedBy}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      // The browser fires cancel for Escape when the focus is not in the dialog. React state
      // decides when the dialog closes, so the native cancel must not close it by itself.
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className={panelClassName}>{children}</div>
    </dialog>,
    document.body
  );
};
