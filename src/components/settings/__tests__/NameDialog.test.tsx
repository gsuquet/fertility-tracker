import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '../../../i18n';
import { createVault, memberNames, openSession } from '../../../sync/deviceVault';
import type { DeviceRecord } from '../../../sync/keyStore';
import { renderWithProviders } from '../../../test/render';
import { createMemoryKeyStore, createRelayHarness } from '../../../test/relayHarness';
import { controlOf } from '../../../test/syncControl';
import { NameDialog } from '../NameDialog';
import { SyncSettings } from '../SyncSettings';

const s = en.sync;

describe('NameDialog', () => {
  it('asks for a name of 1 to 40 characters, and gives it without the spaces at the ends', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    renderWithProviders(<NameDialog onSubmit={onSubmit} onCancel={onCancel} />);
    const dialog = screen.getByRole('dialog', { name: s.nameTitle });
    expect(dialog).toHaveAccessibleDescription(s.nameNote);
    const field = within(dialog).getByLabelText(s.nameLabel);
    expect(field).toHaveFocus();

    fireEvent.click(within(dialog).getByRole('button', { name: s.turnOn }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(s.nameInvalid);
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription(s.nameInvalid);
    fireEvent.change(field, { target: { value: 'x'.repeat(41) } });
    expect(within(dialog).queryByRole('alert')).toBeNull();
    fireEvent.submit(field);
    expect(within(dialog).getByRole('alert')).toHaveTextContent(s.nameInvalid);
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(field, { target: { value: '  Phone of Sam ' } });
    fireEvent.submit(field);
    expect(onSubmit).toHaveBeenCalledWith('Phone of Sam');

    fireEvent.click(within(dialog).getByRole('button', { name: en.actions.cancel }));
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('turns on the sync with the name, and Cancel makes no vault', async () => {
    const harness = createRelayHarness();
    const keyStore = createMemoryKeyStore();
    renderWithProviders(
      <SyncSettings
        control={controlOf(harness.relay, keyStore)}
        onRecordChange={() => {}}
        onBusyChange={() => {}}
      />
    );
    const row = await screen.findByRole('button', { name: s.turnOn });
    fireEvent.click(row);
    fireEvent.click(
      within(await screen.findByRole('dialog', { name: s.nameTitle })).getByRole('button', {
        name: en.actions.cancel,
      })
    );
    expect(screen.queryByRole('dialog', { name: s.nameTitle })).toBeNull();
    expect(harness.objects.size).toBe(0);

    fireEvent.click(row);
    const dialog = await screen.findByRole('dialog', { name: s.nameTitle });
    fireEvent.change(within(dialog).getByLabelText(s.nameLabel), { target: { value: 'Phone' } });
    fireEvent.click(within(dialog).getByRole('button', { name: s.turnOn }));
    await screen.findByRole('dialog', { name: s.codeTitle });
    const record = (await keyStore.load()) as DeviceRecord;
    const names = await memberNames(await openSession(harness.relay, keyStore, record));
    expect(names[0]).toEqual({ id: record.memberId, role: 'owner', name: 'Phone' });
  });

  it('recovers only with a valid name, and gives the name to the new device', async () => {
    const harness = createRelayHarness();
    const made = await createVault(harness.relay, createMemoryKeyStore(), 'Phone');
    const keyStore = createMemoryKeyStore();
    renderWithProviders(
      <SyncSettings
        control={controlOf(harness.relay, keyStore)}
        onRecordChange={() => {}}
        onBusyChange={() => {}}
      />
    );
    fireEvent.click(await screen.findByRole('button', { name: s.recover }));
    const dialog = await screen.findByRole('dialog', { name: s.enterTitle });
    const code = within(dialog).getByLabelText(s.codeLabel);
    fireEvent.change(code, { target: { value: made.recoveryCode } });
    fireEvent.submit(code);
    expect(within(dialog).getByRole('alert')).toHaveTextContent(s.nameInvalid);
    expect(await keyStore.load()).toBeNull();
    const name = within(dialog).getByLabelText(s.nameLabel);
    fireEvent.change(name, { target: { value: 'Laptop' } });
    expect(within(dialog).queryByRole('alert')).toBeNull();
    fireEvent.submit(code);
    await screen.findByRole('dialog', { name: s.codeTitle });
    const record = (await keyStore.load()) as DeviceRecord;
    const names = await memberNames(await openSession(harness.relay, keyStore, record));
    await waitFor(() =>
      expect(names.find(member => member.id === record.memberId)?.name).toBe('Laptop')
    );
  });
});
