import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { en } from '../i18n';
import type { InstallMode } from '../pwa/installPrompt';
import { makeObservation } from '../test/factories';
import { STORAGE_HAS_SEEN_WELCOME_KEY, STORAGE_OBSERVATIONS_KEY } from '../utils/storageKeys';

const install = vi.hoisted(() => ({
  mode: null as InstallMode,
  ios: false,
  installed: false,
  promptInstall: vi.fn(async () => {}),
}));

vi.mock('../pwa/installPrompt', () => ({
  useInstallMode: () => install.mode,
  isIos: () => install.ios,
  isInstalled: () => install.installed,
  promptInstall: install.promptInstall,
}));

const saveObservations = (count: number) =>
  localStorage.setItem(
    STORAGE_OBSERVATIONS_KEY,
    JSON.stringify(
      Array.from({ length: count }, (_, i) => makeObservation({ date: `2026-10-0${i + 1}` }))
    )
  );

const openMenu = () => {
  fireEvent.click(screen.getByRole('button', { name: en.menu.moreActionsLabel }));
  return screen.getByRole('dialog', { name: en.menu.mobileMenuLabel });
};

describe('App install offer', () => {
  beforeEach(() => {
    install.mode = null;
    install.ios = false;
    install.installed = false;
    install.promptInstall.mockClear();
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
  });

  it('has no install button, menu entry or banner when the browser cannot install', () => {
    saveObservations(3);
    render(<App />);
    expect(screen.queryByRole('button', { name: en.install.headerLabel })).toBeNull();
    expect(screen.queryByRole('complementary', { name: en.install.bannerTitle })).toBeNull();
    expect(within(openMenu()).queryByText(en.install.menuEntry)).toBeNull();
  });

  it('shows the prompt of the browser from the header, the menu and the banner', () => {
    install.mode = 'prompt';
    saveObservations(3);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: en.install.headerLabel }));
    fireEvent.click(within(openMenu()).getByText(en.install.menuEntry));
    expect(screen.queryByRole('dialog', { name: en.menu.mobileMenuLabel })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: en.install.bannerInstall }));
    expect(install.promptInstall).toHaveBeenCalledTimes(3);
  });

  it('opens the install guide on iOS', async () => {
    install.mode = 'ios';
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: en.install.headerLabel }));
    expect(
      await screen.findByRole('dialog', { name: en.install.guideTitle }, { timeout: 5000 })
    ).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: en.actions.close })[0] as HTMLElement);
    expect(screen.queryByRole('dialog', { name: en.install.guideTitle })).toBeNull();
    expect(install.promptInstall).not.toHaveBeenCalled();
  });
});

describe('Welcome guide in the installed app on iOS', () => {
  beforeEach(() => {
    install.mode = null;
    install.ios = true;
    install.installed = true;
  });

  const lastSlide = async () => {
    const guide = await screen.findByRole(
      'dialog',
      { name: en.welcomeModal.title },
      { timeout: 5000 }
    );
    for (let step = 1; step < 4; step++) {
      fireEvent.click(within(guide).getByRole('button', { name: en.welcomeModal.next }));
    }
    return guide;
  };

  it('offers to restore a backup when there is no data, and opens the export dialog', async () => {
    render(<App />);
    const guide = await lastSlide();
    fireEvent.click(within(guide).getByRole('button', { name: en.welcomeModal.restoreBackup }));
    expect(
      await screen.findByRole('dialog', { name: en.exportModal.title }, { timeout: 5000 })
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: en.welcomeModal.title })).toBeNull();
    expect(localStorage.getItem(STORAGE_HAS_SEEN_WELCOME_KEY)).toBe('true');
  });

  it('does not offer the restore when there is data', async () => {
    saveObservations(1);
    render(<App />);
    const guide = await lastSlide();
    expect(within(guide).queryByRole('button', { name: en.welcomeModal.restoreBackup })).toBeNull();
  });

  it('does not offer the restore in Safari, which keeps the data of the site', async () => {
    install.installed = false;
    render(<App />);
    const guide = await lastSlide();
    expect(within(guide).queryByRole('button', { name: en.welcomeModal.restoreBackup })).toBeNull();
  });
});
