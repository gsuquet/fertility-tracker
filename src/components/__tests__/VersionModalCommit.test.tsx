import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../context/LanguageContext';
import { VersionModal } from '../VersionModal';

const commit = vi.hoisted(() => ({ hash: null as string | null }));

vi.mock('../../domain/appVersion', async importOriginal => ({
  ...(await importOriginal<typeof import('../../domain/appVersion')>()),
  getAppVersion: () => '9.8.7',
  getCommitHash: () => commit.hash,
}));

const openSystemTab = () => {
  render(
    <LanguageProvider>
      <VersionModal onClose={() => {}} />
    </LanguageProvider>
  );
  fireEvent.click(screen.getByRole('tab', { name: /System Information/i }));
  return screen.getByText('App Version').nextElementSibling;
};

describe('VersionModal commit hash', () => {
  afterEach(() => {
    commit.hash = null;
  });

  it('shows the commit hash after the version', () => {
    commit.hash = 'b128cbc';
    expect(openSystemTab()).toHaveTextContent(/^v9\.8\.7 \(b128cbc\)$/);
  });

  it('shows only the version without a known commit', () => {
    expect(openSystemTab()).toHaveTextContent(/^v9\.8\.7$/);
  });
});
