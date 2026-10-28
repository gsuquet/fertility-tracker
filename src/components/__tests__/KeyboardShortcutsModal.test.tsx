import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fr } from '../../i18n';
import { setShortcutsEnabled } from '../../hooks/useKeyboardShortcuts';
import { renderWithProviders } from '../../test/render';
import { STORAGE_SHORTCUTS_OFF_KEY } from '../../utils/storageKeys';
import { KeyboardShortcutsModal } from '../KeyboardShortcutsModal';

afterEach(() => setShortcutsEnabled(true));

describe('KeyboardShortcutsModal', () => {
  it('lists each shortcut with its key and its action', () => {
    renderWithProviders(<KeyboardShortcutsModal onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    const rows = within(dialog).getAllByRole('row');
    // The head row and nine shortcuts
    expect(rows).toHaveLength(10);
    expect(rows[1]).toHaveTextContent('1Open Today');
    expect(rows[5]).toHaveTextContent('NLog a new observation');
    expect(rows[6]).toHaveTextContent('←Previous day, on Today');
    expect(rows[9]).toHaveTextContent('?Show the keyboard shortcuts');
  });

  it('turns the shortcuts off and on with the checkbox', () => {
    renderWithProviders(<KeyboardShortcutsModal onClose={vi.fn()} />);
    const toggle = screen.getByRole('checkbox', { name: 'Use keyboard shortcuts' });
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(localStorage.getItem(STORAGE_SHORTCUTS_OFF_KEY)).toBe('true');
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
  });

  it('closes from the close buttons', () => {
    const onClose = vi.fn();
    renderWithProviders(<KeyboardShortcutsModal onClose={onClose} />);
    for (const button of screen.getAllByRole('button', { name: 'Close' })) {
      fireEvent.click(button);
    }
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('is translated in French', () => {
    renderWithProviders(<KeyboardShortcutsModal onClose={vi.fn()} />, { language: 'fr' });
    expect(screen.getByRole('dialog', { name: fr.shortcuts.title })).toBeInTheDocument();
    expect(screen.getByText(fr.shortcuts.actions.prevDay)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: fr.shortcuts.enable })).toBeChecked();
  });
});
