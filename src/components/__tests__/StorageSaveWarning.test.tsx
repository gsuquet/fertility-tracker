import { screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { StorageSaveWarning } from '../StorageSaveWarning';
import { renderWithProviders, OBSERVATIONS_STORAGE_KEY } from '../../test/render';
import { en, fr } from '../../i18n';

/** Makes the browser refuse each write of the observations. */
const refuseObservationWrites = () => {
  const setItem = localStorage.setItem.bind(localStorage);
  vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
    if (key === OBSERVATIONS_STORAGE_KEY) throw new Error('QuotaExceededError');
    setItem(key, value);
  });
};

describe('StorageSaveWarning', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when the observations are saved', () => {
    renderWithProviders(<StorageSaveWarning onOpenExport={vi.fn()} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('warns when the browser refuses to save and opens the export dialog', () => {
    refuseObservationWrites();
    const onOpenExport = vi.fn();
    renderWithProviders(<StorageSaveWarning onOpenExport={onOpenExport} />);
    expect(screen.getByRole('alert')).toHaveTextContent(en.storageWarning.saveFailed);
    fireEvent.click(screen.getByRole('button', { name: en.storageWarning.backUpNow }));
    expect(onOpenExport).toHaveBeenCalledOnce();
  });

  it('warns in French', () => {
    refuseObservationWrites();
    renderWithProviders(<StorageSaveWarning onOpenExport={vi.fn()} />, { language: 'fr' });
    expect(screen.getByRole('alert')).toHaveTextContent(fr.storageWarning.saveFailed);
    expect(screen.getByRole('button', { name: fr.storageWarning.backUpNow })).toBeInTheDocument();
  });
});
