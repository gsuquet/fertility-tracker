import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Modal, useTopDialog } from '../Modal';

interface DialogProps {
  onClose?: () => void;
  withFocusTarget?: boolean;
}

/** A labelled dialog with three buttons. With `withFocusTarget`, the focus starts on Third. */
const Dialog = ({ onClose = vi.fn(), withFocusTarget = false }: DialogProps) => {
  const thirdRef = useRef<HTMLButtonElement>(null);
  return (
    <Modal
      labelledBy="test-title"
      describedBy="test-text"
      onClose={onClose}
      className="test-overlay"
      panelClassName="test-panel"
      {...(withFocusTarget ? { initialFocusRef: thirdRef } : {})}
    >
      <h2 id="test-title">Test dialog</h2>
      <p id="test-text">Some text</p>
      <button type="button">First</button>
      <button type="button" disabled>
        Disabled
      </button>
      <button type="button">Second</button>
      <button type="button" ref={thirdRef}>
        Third
      </button>
    </Modal>
  );
};

/** Opens a dialog from a trigger button, and an inner dialog from the outer one. */
const Opener = ({ onOuterClose = vi.fn() }: { onOuterClose?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [innerOpen, setInnerOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <Modal
          label="Outer"
          onClose={() => {
            onOuterClose();
            setOpen(false);
          }}
          className="outer"
          panelClassName="outer-panel"
        >
          <button type="button" onClick={() => setInnerOpen(true)}>
            Open inner
          </button>
          <button type="button">Outer last</button>
          {innerOpen && (
            <Modal
              label="Inner"
              onClose={() => setInnerOpen(false)}
              className="inner"
              panelClassName="inner-panel"
            >
              <button type="button">Inner only</button>
            </Modal>
          )}
        </Modal>
      )}
    </>
  );
};

const pressTab = (shiftKey = false) => {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  (document.activeElement as HTMLElement).dispatchEvent(event);
  return event;
};

/** Shows the name of the top open dialog, as the undo toast reads it. */
const TopDialogProbe = () => (
  <span data-testid="top">{useTopDialog()?.getAttribute('aria-label') ?? 'none'}</span>
);

/** A button that another React tree puts in the top dialog, like the undo toast. */
const ForeignButton = () => {
  const host = useTopDialog();
  return host && createPortal(<button type="button">Foreign</button>, host);
};

describe('Modal', () => {
  it('opens a native modal dialog with a name, a description and aria-modal', () => {
    render(<Dialog />);
    const dialog = screen.getByRole('dialog', { name: 'Test dialog' });
    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Some text');
    expect(dialog).toHaveClass('modal-dialog', 'test-overlay');
    expect(dialog.firstElementChild).toHaveClass('test-panel');
    // The portal puts the dialog directly in the body
    expect(dialog.parentElement).toBe(document.body);
  });

  it('moves the focus to the first focusable element, or to the initial focus target', () => {
    const { unmount } = render(<Dialog />);
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    unmount();
    render(<Dialog withFocusTarget />);
    expect(screen.getByRole('button', { name: 'Third' })).toHaveFocus();
  });

  it('undoes the scroll of the dialog to the focus, so the slide up of a sheet is not cancelled', () => {
    // The browser scrolls the backdrop to show the focused element under the screen
    const focus = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (
      this: HTMLElement
    ) {
      (this.closest('dialog') as HTMLDialogElement).scrollTop = 460;
    });
    render(<Dialog />);
    expect(screen.getByRole('dialog').scrollTop).toBe(0);
    focus.mockRestore();
  });

  it('gives the inline styles to the panel', () => {
    render(
      <Modal
        label="Styled"
        onClose={() => {}}
        className="o"
        panelClassName="p"
        panelStyle={{ top: '6px' }}
      >
        <button type="button">Inside</button>
      </Modal>
    );
    expect(screen.getByRole('dialog').firstElementChild).toHaveStyle({ top: '6px' });
  });

  it('focuses the dialog itself when it has no focusable element, and keeps the focus there', () => {
    render(
      <Modal label="Empty" onClose={vi.fn()} className="o" panelClassName="p">
        <p>Nothing to focus</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog', { name: 'Empty' });
    expect(dialog).toHaveFocus();
    expect(pressTab().defaultPrevented).toBe(true);
    expect(dialog).toHaveFocus();
  });

  it('traps Tab and Shift+Tab and skips disabled buttons', () => {
    render(<Dialog />);
    const first = screen.getByRole('button', { name: 'First' });
    const second = screen.getByRole('button', { name: 'Second' });
    const third = screen.getByRole('button', { name: 'Third' });

    expect(pressTab(true).defaultPrevented).toBe(true);
    expect(third).toHaveFocus();
    expect(pressTab().defaultPrevented).toBe(true);
    expect(first).toHaveFocus();

    // Inside the list, the browser moves the focus: the dialog does not prevent it
    second.focus();
    expect(pressTab().defaultPrevented).toBe(false);
    expect(pressTab(true).defaultPrevented).toBe(false);
  });

  it('sends Tab from the dialog element itself to the first or the last element', () => {
    render(<Dialog />);
    const dialog = screen.getByRole('dialog');
    dialog.focus();
    pressTab();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    dialog.focus();
    pressTab(true);
    expect(screen.getByRole('button', { name: 'Third' })).toHaveFocus();
  });

  it('ignores the other keys', () => {
    const onClose = vi.fn();
    render(<Dialog onClose={onClose} />);
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    screen.getByRole('button', { name: 'First' }).dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape and keeps the Escape key in the dialog', () => {
    const outerKeyDown = vi.fn();
    document.addEventListener('keydown', outerKeyDown);
    const onClose = vi.fn();
    render(<Dialog onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'First' }), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    expect(outerKeyDown).not.toHaveBeenCalled();
    document.removeEventListener('keydown', outerKeyDown);
  });

  it('turns the native cancel event (Escape with the focus outside) into onClose', () => {
    const onClose = vi.fn();
    render(<Dialog onClose={onClose} />);
    const cancel = new Event('cancel', { cancelable: true });
    screen.getByRole('dialog').dispatchEvent(cancel);
    // React state removes the dialog, so the browser must not close it first
    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes the native dialog before it focuses the opener, which is inert until then', () => {
    render(<Opener />);
    const trigger = screen.getByRole('button', { name: 'Open' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog');
    const dialogOpenAtFocus: boolean[] = [];
    trigger.addEventListener('focus', () => dialogOpenAtFocus.push(dialog.hasAttribute('open')));
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(dialogOpenAtFocus).toEqual([false]);
    expect(trigger).toHaveFocus();
  });

  it('closes on a click on the backdrop only', () => {
    const onClose = vi.fn();
    render(<Dialog onClose={onClose} />);
    fireEvent.click(screen.getByText('Some text'));
    fireEvent.click(screen.getByRole('dialog').firstElementChild as HTMLElement);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('moves the focus back to the opener when it closes', () => {
    render(<Opener />);
    const trigger = screen.getByRole('button', { name: 'Open' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: 'Open inner' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('closes only the top dialog on Back, then moves the focus back to its opener', async () => {
    const onOuterClose = vi.fn();
    render(<Opener onOuterClose={onOuterClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open inner' }));
    // The dialogs add their history entries after the render
    await act(async () => {});
    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Inner' })).toBeNull());
    expect(screen.getByRole('dialog', { name: 'Outer' })).toBeInTheDocument();
    expect(onOuterClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Open inner' })).toHaveFocus();
  });

  it('tells which open dialog is on top', () => {
    render(
      <>
        <Opener />
        <TopDialogProbe />
      </>
    );
    const top = () => screen.getByTestId('top').textContent;
    expect(top()).toBe('none');
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(top()).toBe('Outer');
    fireEvent.click(screen.getByRole('button', { name: 'Open inner' }));
    expect(top()).toBe('Inner');
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(top()).toBe('Outer');
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(top()).toBe('none');
  });

  it('traps Tab and handles Escape for content that another React tree puts in it', () => {
    const onClose = vi.fn();
    render(
      <>
        <Dialog onClose={onClose} />
        <ForeignButton />
      </>
    );
    const foreign = screen.getByRole('button', { name: 'Foreign' });
    expect(screen.getByRole('dialog')).toContainElement(foreign);
    foreign.focus();
    expect(pressTab().defaultPrevented).toBe(true);
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    expect(pressTab(true).defaultPrevented).toBe(true);
    expect(foreign).toHaveFocus();
    fireEvent.keyDown(foreign, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('gives the keys of an inner dialog to the inner dialog only', () => {
    const onOuterClose = vi.fn();
    render(<Opener onOuterClose={onOuterClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const openInner = screen.getByRole('button', { name: 'Open inner' });
    fireEvent.click(openInner);
    const innerOnly = screen.getByRole('button', { name: 'Inner only' });
    expect(innerOnly).toHaveFocus();

    // The inner dialog traps the focus; the outer dialog does not move it
    expect(pressTab().defaultPrevented).toBe(true);
    expect(innerOnly).toHaveFocus();

    // A click on the inner backdrop closes the inner dialog only
    fireEvent.click(screen.getByRole('dialog', { name: 'Inner' }));
    expect(screen.queryByRole('dialog', { name: 'Inner' })).toBeNull();
    expect(onOuterClose).not.toHaveBeenCalled();
    expect(openInner).toHaveFocus();

    // Escape in the inner dialog closes only the inner dialog
    fireEvent.click(openInner);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Inner only' }), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Inner' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Outer' })).toBeInTheDocument();
    expect(onOuterClose).not.toHaveBeenCalled();
  });
});
