import { screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { StorageRecoveryNotice } from '../StorageRecoveryNotice';
import { renderWithProviders, OBSERVATIONS_STORAGE_KEY } from '../../test/render';
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
    localStorage.setItem(OBSERVATIONS_STORAGE_KEY, RAW);
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

  it('deletes the copy and hides the notice, in French', () => {
    localStorage.setItem(OBSERVATIONS_STORAGE_KEY, RAW);
    renderWithProviders(<StorageRecoveryNotice />, { language: 'fr' });
    expect(screen.getByRole('alert')).toHaveTextContent(fr.storageRecovery.message);
    fireEvent.click(screen.getByRole('button', { name: fr.storageRecovery.dismiss }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(localStorage.getItem('fertility_care_observations_recovery')).toBeNull();
  });
});
