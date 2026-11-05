import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { en, fr } from '../../i18n';
import { renderWithProviders } from '../../test/render';
import { SyncAlert } from '../SyncAlert';

describe('SyncAlert', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows Reload for an expired sign-in, and goes to the sign-in path', () => {
    const assign = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, assign });
    renderWithProviders(<SyncAlert text={fr.sync.signIn} />, { language: 'fr' });
    expect(screen.getByRole('alert')).toHaveTextContent(fr.sync.signIn);
    fireEvent.click(screen.getByRole('button', { name: fr.sync.reload }));
    expect(assign).toHaveBeenCalledWith(expect.stringMatching(/\/sign-in$/));
  });

  it('has no button for another failure', () => {
    renderWithProviders(<SyncAlert text={en.sync.noConnection} />);
    expect(screen.getByRole('alert')).toHaveTextContent(en.sync.noConnection);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
