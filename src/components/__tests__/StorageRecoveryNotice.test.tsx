import { cleanup, screen, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { StorageRecoveryNotice } from '../StorageRecoveryNotice';
import { renderWithProviders } from '../../test/render';
import { STORAGE_OBSERVATIONS_KEY } from '../../utils/storageKeys';
import { getTodayStr } from '../../utils/dateUtils';
import { en, fr } from '../../i18n';

const RAW = '[{"date": "2026-06-01"';

describe('StorageRecoveryNotice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when the stored data is readable', () => {
    renderWithProviders(<StorageRecoveryNotice />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the notice and downloads the original text', async () => {
    localStorage.setItem(STORAGE_OBSERVATIONS_KEY, RAW);
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:recovery');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    let downloadName = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloadName = this.download;
    });
    renderWithProviders(<StorageRecoveryNotice />);
    expect(screen.getByRole('alert')).toHaveTextContent(en.storageRecovery.message);
    fireEvent.click(screen.getByRole('button', { name: en.storageRecovery.download }));
    expect(downloadName).toBe(`fertility-tracker-data-recovery-${getTodayStr()}.txt`);
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(await blob.text()).toBe(RAW);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:recovery');
  });

  it('asks before it deletes the only copy', () => {
    localStorage.setItem(STORAGE_OBSERVATIONS_KEY, RAW);
    renderWithProviders(<StorageRecoveryNotice />);
    fireEvent.click(screen.getByRole('button', { name: en.storageRecovery.dismiss }));
    const dialog = screen.getByRole('dialog', { name: en.confirmDialog.recoveryTitle });
    expect(dialog).toHaveAccessibleDescription(en.confirmDialog.recoveryMessage);
    fireEvent.click(within(dialog).getByRole('button', { name: en.actions.cancel }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(localStorage.getItem('fertility_care_observations_recovery')).toBe(RAW);
  });

  it('deletes the copy and hides the notice after confirmation, in French', () => {
    localStorage.setItem(STORAGE_OBSERVATIONS_KEY, RAW);
    renderWithProviders(<StorageRecoveryNotice />, { language: 'fr' });
    expect(screen.getByRole('alert')).toHaveTextContent(fr.storageRecovery.message);
    fireEvent.click(screen.getByRole('button', { name: fr.storageRecovery.dismiss }));
    const dialog = screen.getByRole('dialog', { name: fr.confirmDialog.recoveryTitle });
    fireEvent.click(within(dialog).getByRole('button', { name: fr.confirmDialog.recoveryConfirm }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(localStorage.getItem('fertility_care_observations_recovery')).toBeNull();
  });

  it('says that no copy is kept and closes without deleting the earlier copy', () => {
    localStorage.setItem('fertility_care_observations_recovery', 'old copy');
    localStorage.setItem(STORAGE_OBSERVATIONS_KEY, RAW);
    renderWithProviders(<StorageRecoveryNotice />);
    expect(screen.getByRole('alert')).toHaveTextContent(en.storageRecovery.messageNoCopy);
    expect(screen.queryByRole('button', { name: en.storageRecovery.dismiss })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: en.storageRecovery.close }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(localStorage.getItem('fertility_care_observations_recovery')).toBe('old copy');
  });

  describe('dropped records', () => {
    const PARTIAL = JSON.stringify([{ date: '2026-06-01', stretch: '0' }, { date: 'x' }, 7]);

    it('says how many records it dropped and that a copy is kept', () => {
      localStorage.setItem(STORAGE_OBSERVATIONS_KEY, PARTIAL);
      renderWithProviders(<StorageRecoveryNotice />);
      expect(screen.getByRole('alert')).toHaveTextContent(
        en.storageRecovery.messagePartial.replace('{count}', '2')
      );
      expect(screen.getByRole('button', { name: en.storageRecovery.dismiss })).toBeInTheDocument();
    });

    it('uses the singular for one dropped record, in English and French, also after a reload', () => {
      const one = JSON.stringify([{ date: '2026-06-01', stretch: '0' }, { date: 'x' }]);
      localStorage.setItem(STORAGE_OBSERVATIONS_KEY, one);
      renderWithProviders(<StorageRecoveryNotice />).unmount();
      expect(localStorage.getItem('fertility_care_observations_recovery')).toBe(one);
      renderWithProviders(<StorageRecoveryNotice />);
      expect(screen.getByRole('alert')).toHaveTextContent(en.storageRecovery.messagePartialOne);
      cleanup();
      localStorage.setItem('fertility_care_observations_recovery', 'old copy');
      localStorage.setItem(STORAGE_OBSERVATIONS_KEY, one);
      renderWithProviders(<StorageRecoveryNotice />, { language: 'fr' });
      expect(screen.getByRole('alert')).toHaveTextContent(
        fr.storageRecovery.messagePartialNoCopyOne
      );
    });

    it('says in French that no copy is kept', () => {
      localStorage.setItem('fertility_care_observations_recovery', 'old copy');
      localStorage.setItem(STORAGE_OBSERVATIONS_KEY, PARTIAL);
      renderWithProviders(<StorageRecoveryNotice />, { language: 'fr' });
      expect(screen.getByRole('alert')).toHaveTextContent(
        fr.storageRecovery.messagePartialNoCopy.replace('{count}', '2')
      );
      expect(screen.getByRole('button', { name: fr.storageRecovery.close })).toBeInTheDocument();
    });
  });
});
