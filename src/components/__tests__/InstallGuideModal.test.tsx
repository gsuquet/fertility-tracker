import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstallGuideModal } from '../InstallGuideModal';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { en } from '../../i18n';
import { STORAGE_LAST_BACKUP_KEY } from '../../utils/storageKeys';

describe('InstallGuideModal', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:backup');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('gives the separate storage note first, then the four steps in order', () => {
    renderWithProviders(<InstallGuideModal onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: en.install.guideTitle });
    expect(dialog).toHaveAccessibleDescription(en.install.guideNote);
    const steps = within(dialog).getAllByRole('listitem');
    expect(steps.map(step => step.textContent)).toEqual([
      `${en.install.guideStepBackup}${en.install.guideBackupButton}`,
      en.install.guideStepShare,
      en.install.guideStepAdd,
      en.install.guideStepRestore,
    ]);
  });

  it('downloads the backup and records it', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderWithProviders(<InstallGuideModal onClose={vi.fn()} />, {
      observations: [makeObservation({ date: '2026-10-01' })],
    });
    fireEvent.click(screen.getByRole('button', { name: en.install.guideBackupButton }));
    expect(click).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(localStorage.getItem(STORAGE_LAST_BACKUP_KEY)).not.toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(en.install.guideBackupDone);
  });

  it('closes with its two close buttons', () => {
    const onClose = vi.fn();
    renderWithProviders(<InstallGuideModal onClose={onClose} />);
    for (const button of screen.getAllByRole('button', { name: en.actions.close })) {
      fireEvent.click(button);
    }
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
