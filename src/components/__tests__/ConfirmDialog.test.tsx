import { useState } from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmDialog } from '../ConfirmDialog';
import { renderWithProviders } from '../../test/render';
import { en, fr } from '../../i18n';

const renderDialog = (language: 'en' | 'fr' = 'en') => {
  const props = { onCancel: vi.fn(), onConfirm: vi.fn(), onDanger: vi.fn() };
  renderWithProviders(
    <ConfirmDialog
      title="Replace the data?"
      onCancel={props.onCancel}
      actions={[
        { label: 'Replace', onClick: props.onConfirm },
        { label: 'Delete', onClick: props.onDanger, danger: true },
      ]}
    >
      <p>The current observations go away.</p>
    </ConfirmDialog>,
    { language }
  );
  return props;
};

/** Opens the dialog from a trigger button, so the test can check where the focus goes. */
const Opener = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <ConfirmDialog title="Sure?" onCancel={() => setOpen(false)} actions={[]}>
          <p>Body</p>
        </ConfirmDialog>
      )}
    </>
  );
};

describe('ConfirmDialog', () => {
  it('is a labelled modal dialog with the focus on Cancel', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: 'Replace the data?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // It uses the shared native <dialog> primitive
    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog).toHaveClass('modal-dialog', 'modal-overlay', 'confirm-overlay');
    expect(dialog).toHaveAccessibleDescription('The current observations go away.');
    expect(screen.getByRole('button', { name: en.actions.cancel })).toHaveFocus();
  });

  it('runs the action that the user clicks', () => {
    const props = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    expect(props.onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('btn-danger');
    expect(screen.getByRole('button', { name: 'Replace' })).toHaveClass('btn-primary');
  });

  it('cancels from Cancel, Escape and the backdrop only', () => {
    const outerKeyDown = vi.fn();
    document.addEventListener('keydown', outerKeyDown);
    const props = renderDialog();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(screen.getByText('The current observations go away.'));
    fireEvent.keyDown(dialog, { key: 'Enter' });
    expect(props.onCancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: en.actions.cancel }));
    fireEvent.keyDown(dialog, { key: 'Escape' });
    // The native <dialog> is the backdrop: a click on it outside the panel cancels
    fireEvent.click(dialog);
    expect(props.onCancel).toHaveBeenCalledTimes(3);
    // Escape stays in the dialog, so the dialog under it does not close too
    expect(outerKeyDown).toHaveBeenCalledOnce();
    document.removeEventListener('keydown', outerKeyDown);
  });

  it('keeps the focus in the dialog with Tab and Shift+Tab', () => {
    renderDialog();
    const cancel = screen.getByRole('button', { name: en.actions.cancel });
    const replace = screen.getByRole('button', { name: 'Replace' });
    const remove = screen.getByRole('button', { name: 'Delete' });

    fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true });
    expect(remove).toHaveFocus();
    fireEvent.keyDown(remove, { key: 'Tab' });
    expect(cancel).toHaveFocus();

    // Inside the list, the browser moves the focus: the dialog does not prevent it
    replace.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    replace.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(replace).toHaveFocus();
  });

  it('moves the focus back to the trigger when it closes', () => {
    renderWithProviders(<Opener />);
    const trigger = screen.getByRole('button', { name: 'Open' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: en.actions.cancel })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: en.actions.cancel }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('translates the Cancel button', () => {
    renderDialog('fr');
    expect(screen.getByRole('button', { name: fr.actions.cancel })).toHaveFocus();
  });
});
