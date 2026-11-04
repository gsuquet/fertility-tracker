import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PasswordDialog } from '../PasswordDialog';
import { renderWithProviders } from '../../../test/render';
import { en, fr } from '../../../i18n';

const LONG = 'twelve chars ok';

const renderDialog = (
  mode: 'backup' | 'restore',
  onSubmit = vi.fn(async (_password: string) => true),
  language: 'en' | 'fr' = 'en'
) => {
  const onCancel = vi.fn();
  renderWithProviders(<PasswordDialog mode={mode} onSubmit={onSubmit} onCancel={onCancel} />, {
    language,
  });
  return { onSubmit, onCancel };
};

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const p = en.passwordDialog;

describe('PasswordDialog', () => {
  it('asks for the password two times in the backup mode, with the focus on Password', () => {
    renderDialog('backup');
    const dialog = screen.getByRole('dialog', { name: p.backupTitle });
    expect(dialog).toHaveAccessibleDescription(p.backupNote);
    const password = screen.getByLabelText(p.password);
    expect(password).toHaveFocus();
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText(p.confirm)).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByRole('button', { name: p.save })).toBeEnabled();
  });

  it('refuses a short password and two different passwords', () => {
    const { onSubmit } = renderDialog('backup');
    type(p.password, 'short');
    type(p.confirm, 'short');
    fireEvent.click(screen.getByRole('button', { name: p.save }));
    expect(screen.getByRole('alert')).toHaveTextContent(p.tooShort);

    type(p.password, LONG);
    type(p.confirm, `${LONG}!`);
    fireEvent.click(screen.getByRole('button', { name: p.save }));
    expect(screen.getByRole('alert')).toHaveTextContent(p.mismatch);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the working label while it runs, and the failed message when it fails', async () => {
    let finish: (worked: boolean) => void = () => {};
    const onSubmit = vi.fn(() => new Promise<boolean>(resolve => (finish = resolve)));
    renderDialog('backup', onSubmit);
    type(p.password, LONG);
    type(p.confirm, LONG);
    fireEvent.click(screen.getByRole('button', { name: p.save }));
    expect(onSubmit).toHaveBeenCalledWith(LONG);
    expect(screen.getByRole('button', { name: p.working })).toBeDisabled();
    expect(screen.queryByRole('alert')).toBeNull();

    // A second submit while it runs does nothing
    fireEvent.submit(screen.getByLabelText(p.password).closest('form') as HTMLFormElement);
    expect(onSubmit).toHaveBeenCalledOnce();

    finish(false);
    expect(await screen.findByRole('alert')).toHaveTextContent(p.failed);
    expect(screen.getByRole('button', { name: p.save })).toBeEnabled();
  });

  it('leaves the dialog to the parent after a submit that worked', async () => {
    const { onSubmit } = renderDialog('backup');
    type(p.password, LONG);
    type(p.confirm, LONG);
    fireEvent.submit(screen.getByLabelText(p.password).closest('form') as HTMLFormElement);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(LONG));
    expect(screen.getByRole('button', { name: p.working })).toBeDisabled();
  });

  it('asks for the password one time in the restore mode, and shows a wrong password', async () => {
    const { onSubmit } = renderDialog(
      'restore',
      vi.fn(async () => false)
    );
    const dialog = screen.getByRole('dialog', { name: p.restoreTitle });
    expect(dialog).toHaveAccessibleDescription(p.restoreNote);
    expect(screen.queryByLabelText(p.confirm)).toBeNull();
    expect(screen.getByLabelText(p.password)).toHaveAttribute('autocomplete', 'current-password');
    // The restore mode does not check the length: an old file can have any password
    type(p.password, 'short');
    fireEvent.click(screen.getByRole('button', { name: p.open }));
    expect(await screen.findByRole('alert')).toHaveTextContent(p.wrongPassword);
    expect(onSubmit).toHaveBeenCalledWith('short');
  });

  it('closes with Cancel', () => {
    const { onCancel, onSubmit } = renderDialog('restore');
    fireEvent.click(screen.getByRole('button', { name: en.actions.cancel }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows its text in French', () => {
    renderDialog('backup', undefined, 'fr');
    expect(screen.getByRole('dialog', { name: fr.passwordDialog.backupTitle })).toBeInTheDocument();
    expect(screen.getByLabelText(fr.passwordDialog.confirm)).toBeInTheDocument();
  });
});
