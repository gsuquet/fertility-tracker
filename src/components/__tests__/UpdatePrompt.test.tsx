import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdatePrompt } from '../UpdatePrompt';
import { Modal } from '../Modal';
import { useCycle } from '../../context/CycleContext';
import { renderWithProviders } from '../../test/render';
import { en, fr } from '../../i18n';

const state = vi.hoisted(() => ({ updateReady: true, applyUpdate: vi.fn() }));

vi.mock('../../pwa/registerServiceWorker', () => ({
  useUpdateReady: () => state.updateReady,
  applyUpdate: state.applyUpdate,
}));

/** Loads the demo, which shows the undo message. */
const LoadDemo = () => {
  const { loadDemoData } = useCycle();
  return (
    <button type="button" onClick={loadDemoData}>
      Load demo
    </button>
  );
};

describe('UpdatePrompt', () => {
  beforeEach(() => {
    state.updateReady = true;
    state.applyUpdate.mockReset();
  });

  it('says that a new version is ready, and Reload applies it', () => {
    renderWithProviders(<UpdatePrompt />);
    expect(screen.getByRole('status')).toHaveTextContent(en.update.ready);
    fireEvent.click(screen.getByRole('button', { name: en.update.reload }));
    expect(state.applyUpdate).toHaveBeenCalledOnce();
  });

  it('is in French', () => {
    renderWithProviders(<UpdatePrompt />, { language: 'fr' });
    expect(screen.getByRole('button', { name: fr.update.reload })).toBeInTheDocument();
  });

  it('shows nothing when no update is ready', () => {
    state.updateReady = false;
    renderWithProviders(<UpdatePrompt />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('waits while the undo message shows', () => {
    renderWithProviders(
      <>
        <UpdatePrompt />
        <LoadDemo />
      </>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Load demo' }));
    expect(screen.queryByRole('button', { name: en.update.reload })).toBeNull();
  });

  it('waits while a dialog or the drawer is open', () => {
    renderWithProviders(
      <>
        <UpdatePrompt />
        <Modal label="Drawer" onClose={vi.fn()} className="x" panelClassName="y">
          <button type="button">Inside</button>
        </Modal>
      </>
    );
    expect(screen.queryByRole('button', { name: en.update.reload })).toBeNull();
  });
});
