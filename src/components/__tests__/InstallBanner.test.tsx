import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InstallBanner } from '../InstallBanner';
import { Modal } from '../Modal';
import { useCycle } from '../../context/CycleContext';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { en } from '../../i18n';
import type { InstallMode } from '../../pwa/installPrompt';
import { STORAGE_INSTALL_BANNER_CLOSED_KEY } from '../../utils/storageKeys';

const state = vi.hoisted(() => ({ mode: 'prompt' as InstallMode, updateReady: false }));

vi.mock('../../pwa/installPrompt', () => ({ useInstallMode: () => state.mode }));
vi.mock('../../pwa/registerServiceWorker', () => ({ useUpdateReady: () => state.updateReady }));

const observations = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    makeObservation({ date: `2026-10-${String(i + 1).padStart(2, '0')}` })
  );

/** Loads the demo, which shows the undo message. */
const LoadDemo = () => {
  const { loadDemoData } = useCycle();
  return (
    <button type="button" onClick={loadDemoData}>
      Load demo
    </button>
  );
};

const banner = () => screen.queryByRole('complementary', { name: en.install.bannerTitle });

describe('InstallBanner', () => {
  beforeEach(() => {
    state.mode = 'prompt';
    state.updateReady = false;
  });

  it('offers the install after 3 observations, with the icon, the benefit and two buttons', () => {
    renderWithProviders(<InstallBanner onInstall={vi.fn()} />, { observations: observations(3) });
    expect(banner()).toBeInTheDocument();
    expect(screen.getByText(en.install.bannerText)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: en.install.bannerInstall })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: en.install.bannerClose })).toBeInTheDocument();
  });

  it('shows on iOS too', () => {
    state.mode = 'ios';
    renderWithProviders(<InstallBanner onInstall={vi.fn()} />, { observations: observations(3) });
    expect(banner()).toBeInTheDocument();
  });

  it('does not show when the browser cannot install the app or the app is installed', () => {
    state.mode = null;
    renderWithProviders(<InstallBanner onInstall={vi.fn()} />, { observations: observations(3) });
    expect(banner()).toBeNull();
  });

  it('does not show with fewer than 3 observations', () => {
    renderWithProviders(<InstallBanner onInstall={vi.fn()} />, { observations: observations(2) });
    expect(banner()).toBeNull();
  });

  it('does not show after the user closed it one time', () => {
    localStorage.setItem(STORAGE_INSTALL_BANNER_CLOSED_KEY, 'true');
    renderWithProviders(<InstallBanner onInstall={vi.fn()} />, { observations: observations(3) });
    expect(banner()).toBeNull();
  });

  it('does not show while a dialog is open', () => {
    renderWithProviders(
      <>
        <InstallBanner onInstall={vi.fn()} />
        <Modal label="Open dialog" onClose={vi.fn()} className="x" panelClassName="y">
          <button type="button">Inside</button>
        </Modal>
      </>,
      { observations: observations(3) }
    );
    expect(banner()).toBeNull();
  });

  it('gives its place to the undo message', () => {
    renderWithProviders(
      <>
        <InstallBanner onInstall={vi.fn()} />
        <LoadDemo />
      </>,
      { observations: observations(3) }
    );
    expect(banner()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load demo' }));
    expect(banner()).toBeNull();
  });

  it('gives its place to the update message', () => {
    state.updateReady = true;
    renderWithProviders(<InstallBanner onInstall={vi.fn()} />, { observations: observations(3) });
    expect(banner()).toBeNull();
  });

  it('closes for good with its close button', () => {
    const onInstall = vi.fn();
    renderWithProviders(<InstallBanner onInstall={onInstall} />, { observations: observations(3) });
    fireEvent.click(screen.getByRole('button', { name: en.install.bannerClose }));
    expect(banner()).toBeNull();
    expect(localStorage.getItem(STORAGE_INSTALL_BANNER_CLOSED_KEY)).toBe('true');
    expect(onInstall).not.toHaveBeenCalled();
  });

  it('installs and hides for good with Install', () => {
    const onInstall = vi.fn();
    renderWithProviders(<InstallBanner onInstall={onInstall} />, { observations: observations(3) });
    fireEvent.click(screen.getByRole('button', { name: en.install.bannerInstall }));
    expect(onInstall).toHaveBeenCalledOnce();
    expect(banner()).toBeNull();
    expect(localStorage.getItem(STORAGE_INSTALL_BANNER_CLOSED_KEY)).toBe('true');
  });
});
