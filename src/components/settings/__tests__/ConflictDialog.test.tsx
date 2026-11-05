import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en, fr } from '../../../i18n';
import type { SyncConflict } from '../../../domain/sync/merge';
import { parseConflicts, serializeConflicts } from '../../../domain/sync/syncStorage';
import { useSync } from '../../../hooks/useSync';
import type { SyncServices } from '../../../hooks/useSync';
import { createVault } from '../../../sync/deviceVault';
import type { DeviceRecord } from '../../../sync/keyStore';
import * as runner from '../../../sync/syncRunner';
import { makeObservation } from '../../../test/factories';
import { renderWithProviders } from '../../../test/render';
import { createMemoryKeyStore, createRelayHarness } from '../../../test/relayHarness';
import { controlOf } from '../../../test/syncControl';
import type { Observation } from '../../../types/crms';
import { STORAGE_SYNC_CONFLICTS_KEY } from '../../../utils/storageKeys';
import { ConflictDialog } from '../ConflictDialog';
import { SyncSettings } from '../SyncSettings';

const s = en.sync;
const clock = { time: 1, counter: 0, member: 'other' };
const conflict = (date: string, day: SyncConflict['day']): SyncConflict => ({ date, day, clock });

const owner = async () => {
  const harness = createRelayHarness();
  const keyStore = createMemoryKeyStore();
  const made = await createVault(harness.relay, keyStore, 'Phone');
  return { ...harness, keyStore, record: made.record };
};

/** Settings with the real sync control. */
const Harness = ({ load }: { load: () => Promise<SyncServices> }) => {
  const control = useSync(load);
  return <SyncSettings control={control} onRecordChange={() => {}} onBusyChange={() => {}} />;
};

const renderSettings = async (conflicts: SyncConflict[], observations: Observation[]) => {
  localStorage.setItem(STORAGE_SYNC_CONFLICTS_KEY, serializeConflicts(conflicts));
  const { relay, keyStore } = await owner();
  const services: SyncServices = {
    relay,
    keyStore,
    // No sync changes the list in these tests
    runner: { ...runner, runSync: async () => ({ status: 'off' }) },
  };
  renderWithProviders(<Harness load={async () => services} />, { observations });
};

describe('ConflictDialog', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows Days to check with the number of days, only with conflicts on an owner device', async () => {
    const { relay, keyStore, record } = await owner();
    const view = renderWithProviders(
      <SyncSettings
        control={controlOf(relay, keyStore, {
          conflicts: [conflict('2026-10-01', null), conflict('2026-10-02', null)],
        })}
        onRecordChange={() => {}}
        onBusyChange={() => {}}
      />
    );
    expect(await screen.findByRole('button', { name: s.conflicts })).toHaveAccessibleDescription(
      '2 days changed on two devices'
    );
    view.unmount();

    const frView = renderWithProviders(
      <SyncSettings
        control={controlOf(relay, keyStore, { conflicts: [conflict('2026-10-01', null)] })}
        onRecordChange={() => {}}
        onBusyChange={() => {}}
      />,
      { language: 'fr' }
    );
    expect(
      await screen.findByRole('button', { name: fr.sync.conflicts })
    ).toHaveAccessibleDescription('1 jour modifié sur deux appareils');
    frView.unmount();

    // Without conflicts, and on a reader device, the row does not show
    const reader = createMemoryKeyStore({ ...(record as DeviceRecord), role: 'reader' });
    const readerView = renderWithProviders(
      <SyncSettings
        control={controlOf(relay, reader, { conflicts: [conflict('2026-10-01', null)] })}
        onRecordChange={() => {}}
        onBusyChange={() => {}}
      />
    );
    expect(await screen.findByRole('button', { name: s.syncNow })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: s.conflicts })).toBeNull();
    readerView.unmount();
  });

  it('shows the other version and the current day of each date', async () => {
    await renderSettings(
      [
        conflict('2026-10-01', { stretch: '10', modifiers: ['K', 'L'], notes: 'Before work' }),
        conflict('2026-10-02', null),
        conflict('2026-10-03', { notes: 'Only a note' }),
        conflict('2026-10-04', { bleeding: 'M' }),
      ],
      [
        makeObservation({ date: '2026-10-01', bleeding: 'H' }),
        makeObservation({ date: '2026-10-02', stretch: '6', modifiers: ['C'], notes: 'Late' }),
        makeObservation({ date: '2026-10-03', isCycleStart: true }),
      ]
    );
    fireEvent.click(await screen.findByRole('button', { name: s.conflicts }));
    const dialog = await screen.findByRole('dialog', { name: s.conflicts });
    expect(dialog).toHaveAccessibleDescription(s.conflictsNote);
    expect(within(dialog).getByRole('button', { name: en.actions.close })).toHaveFocus();
    const items = within(dialog).getAllByRole('listitem');
    expect(items.map(item => within(item).getByRole('heading').textContent)).toEqual([
      'Oct 1, 2026',
      'Oct 2, 2026',
      'Oct 3, 2026',
      'Oct 4, 2026',
    ]);
    const values = (item: HTMLElement) =>
      Array.from(item.querySelectorAll('dd')).map(dd => dd.textContent);
    expect(values(items[0] as HTMLElement)).toEqual(['10KL · Before work', 'H']);
    expect(values(items[1] as HTMLElement)).toEqual([s.conflictDeleted, '6C · Late']);
    expect(values(items[2] as HTMLElement)).toEqual([
      `${s.conflictNoCode} · Only a note`,
      s.conflictNoCode,
    ]);
    expect(values(items[3] as HTMLElement)).toEqual(['M', s.conflictNone]);

    fireEvent.click(within(dialog).getByRole('button', { name: en.actions.close }));
    expect(screen.queryByRole('dialog', { name: s.conflicts })).toBeNull();
    expect(screen.getByRole('button', { name: s.conflicts })).toBeInTheDocument();
  });

  it('restores and dismisses a conflict, then closes when the list is empty', async () => {
    await renderSettings(
      [conflict('2026-10-01', { bleeding: 'L' }), conflict('2026-10-02', null)],
      [
        makeObservation({ date: '2026-10-01', bleeding: 'H' }),
        makeObservation({ date: '2026-10-02', bleeding: 'M' }),
      ]
    );
    fireEvent.click(await screen.findByRole('button', { name: s.conflicts }));
    const dialog = await screen.findByRole('dialog', { name: s.conflicts });
    const [first] = within(dialog).getAllByRole('listitem');
    fireEvent.click(within(first as HTMLElement).getByRole('button', { name: s.conflictRestore }));
    await waitFor(() => expect(within(dialog).getAllByRole('listitem')).toHaveLength(1));
    const values = Array.from(dialog.querySelectorAll('dd')).map(dd => dd.textContent);
    expect(values).toEqual([s.conflictDeleted, 'M']);

    fireEvent.click(within(dialog).getByRole('button', { name: s.conflictDismiss }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: s.conflicts })).toBeNull());
    expect(parseConflicts(localStorage.getItem(STORAGE_SYNC_CONFLICTS_KEY))).toEqual([]);
    expect(screen.queryByRole('button', { name: s.conflicts })).toBeNull();
  });

  it('disables the buttons while an action runs, and nothing closes it', async () => {
    const { relay, keyStore } = await owner();
    let finish = () => {};
    const resolveConflict = vi.fn(
      () =>
        new Promise<void>(resolve => {
          finish = resolve;
        })
    );
    const onClose = vi.fn();
    renderWithProviders(
      <ConflictDialog
        control={controlOf(relay, keyStore, {
          conflicts: [conflict('2026-10-01', null)],
          resolveConflict,
        })}
        onClose={onClose}
      />
    );
    const dialog = screen.getByRole('dialog', { name: s.conflicts });
    fireEvent.click(within(dialog).getByRole('button', { name: s.conflictDismiss }));
    expect(resolveConflict).toHaveBeenCalledWith(conflict('2026-10-01', null), false);
    for (const button of within(dialog).getAllByRole('button')) expect(button).toBeDisabled();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => {
      finish();
    });
    expect(within(dialog).getByRole('button', { name: s.conflictRestore })).toBeEnabled();
    fireEvent.click(within(dialog).getByRole('button', { name: s.conflictRestore }));
    expect(resolveConflict).toHaveBeenLastCalledWith(conflict('2026-10-01', null), true);
  });

  it('closes at once without a conflict', async () => {
    const { relay, keyStore } = await owner();
    const onClose = vi.fn();
    renderWithProviders(<ConflictDialog control={controlOf(relay, keyStore)} onClose={onClose} />);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
